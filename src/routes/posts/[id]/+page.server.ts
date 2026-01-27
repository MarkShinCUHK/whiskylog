import { error, fail, redirect } from '@sveltejs/kit';
import { getPostById, deletePost, incrementPostView } from '$lib/server/supabase/queries/posts';
import { getUser, getSession, getUserOrCreateAnonymous } from '$lib/server/supabase/auth';
import { listComments } from '$lib/server/supabase/queries/comments';
import { getLikeCount, isLiked } from '$lib/server/supabase/queries/likes';
import { sanitizePostHtml } from '$lib/server/supabase/queries/posts';
import { isBookmarked } from '$lib/server/supabase/queries/bookmarks';
import { getWhiskyById } from '$lib/server/supabase/queries/whiskies';

export async function load({ params, cookies }) {
  try {
    const postId = params.id; // UUID (string)

    if (!postId) {
      throw error(404, '게시글을 찾을 수 없습니다');
    }

    const post = await getPostById(postId);

    if (!post) {
      throw error(404, '게시글을 찾을 수 없습니다');
    }

    // 익명 글 판단: post.isAnonymous 사용
    const isAnonymousPost = post.isAnonymous ?? false;

    const viewCookieKey = `viewed_${postId}`;
    let viewCount = post.views ?? 0;
    if (!cookies.get(viewCookieKey)) {
      const updatedCount = await incrementPostView(postId);
      if (typeof updatedCount === 'number') {
        viewCount = updatedCount;
      }
      cookies.set(viewCookieKey, '1', {
        path: '/',
        maxAge: 60 * 60 * 24
      });
    }

    // 댓글과 좋아요 정보 로드
    const user = await getUser(cookies);
    const sessionTokens = getSession(cookies);
    const canSocial = !!user && !user.isAnonymous;
    
    // 댓글 기능이 비활성화되어 있으면 빈 배열 반환 (에러 방지)
    const ENABLE_COMMENTS = false;
    const [comments, likeCount, userLiked, bookmarked, whisky] = await Promise.all([
      ENABLE_COMMENTS ? listComments(postId, sessionTokens || undefined) : Promise.resolve([]),
      getLikeCount(postId, sessionTokens || undefined).catch(() => 0), // 에러 발생 시 0 반환
      canSocial ? isLiked(postId, user.id, sessionTokens || undefined).catch(() => false) : Promise.resolve(false),
      canSocial ? isBookmarked(postId, user.id, sessionTokens || undefined).catch(() => false) : Promise.resolve(false),
      post.whiskyId ? getWhiskyById(post.whiskyId).catch(() => null) : Promise.resolve(null)
    ]);

    // 정책:
    // - 로그인 글: 작성자 본인만 수정/삭제 가능 (비밀번호 없음)
    // - 익명 글: 항상 비밀번호로만 수정/삭제 가능 (다른 컴퓨터에서도 비밀번호로 수정/삭제 가능)
    //   단, 로그인 상태에서는 익명 글 수정/삭제 불가 (익명 글은 비로그인 상태에서만)
    const isOwner = !!user && !!post.userId && user.id === post.userId;
    const isLoggedInPost = !isAnonymousPost && isOwner;
    
    // 익명 글은 로그인 사용자가 아닌 경우만 수정/삭제 가능 (항상 비밀번호 필요)
    const canEditDelete = isLoggedInPost || (isAnonymousPost && (!user || !user.email));
    const needsEditPassword = isAnonymousPost && (!user || !user.email);

    // 조회수 증가는 MVP 단계에서 제외 (필요시 추후 추가)

    return {
      post: {
        ...post,
        views: viewCount
      },
      postHtml: sanitizePostHtml(post.content),
      whisky,
      comments,
      likeCount,
      isLiked: userLiked,
      isBookmarked: bookmarked,
      canEditDelete,
      needsEditPassword
    };
  } catch (err) {
    // SvelteKit error는 그대로 전달
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('게시글 로드 오류:', err);
    throw error(500, '게시글을 불러오는 중 오류가 발생했습니다');
  }
}

export const actions = {
  createComment: async ({ request, params, cookies }) => {
    try {
      const postId = params.id;

      if (!postId) {
        return fail(400, {
          error: '게시글 ID가 없습니다.'
        });
      }

      // 댓글은 로그인 사용자 전용 (익명 세션은 허용하지 않음)
      const user = await getUser(cookies);
      if (!user || user.isAnonymous) {
        return fail(401, { error: '댓글을 작성하려면 로그인이 필요합니다.' });
      }

      const sessionTokens = getSession(cookies);

      if (!sessionTokens) {
        return fail(401, { error: '로그인 세션이 없습니다. 다시 로그인해주세요.' });
      }

      const formData = await request.formData();
      const content = formData.get('content')?.toString();

      if (!content || content.trim().length === 0) {
        return fail(400, {
          error: '댓글 내용을 입력해주세요.'
        });
      }

      const { createComment } = await import('$lib/server/supabase/queries/comments');
      const comment = await createComment(postId, content, user.id, sessionTokens);

      try {
        const post = await getPostById(postId);
        if (post?.userId && post.userId !== user.id) {
          const { createNotification } = await import('$lib/server/supabase/queries/notifications');
          await createNotification(
            {
              userId: post.userId,
              actorId: user.id,
              actorName: user.nickname || user.email || null,
              postId,
              commentId: comment.id,
              type: 'comment'
            },
            sessionTokens
          );
        }
      } catch (notifyError) {
        console.warn('댓글 알림 생성 실패:', notifyError);
      }

      // redirect 대신 데이터 반환 (use:enhance로 즉시 반영)
      return { comment };
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err) {
        throw err;
      }
      console.error('댓글 작성 오류:', err);
      return fail(500, {
        error: '댓글 작성 중 오류가 발생했습니다.'
      });
    }
  },
  deleteComment: async ({ request, params, cookies }) => {
    try {
      // 댓글 삭제는 로그인 사용자 전용 (익명 세션은 허용하지 않음)
      const user = await getUser(cookies);
      if (!user || user.isAnonymous) {
        return fail(401, { error: '댓글을 삭제하려면 로그인이 필요합니다.' });
      }

      const sessionTokens = getSession(cookies);

      if (!sessionTokens) {
        return fail(401, { error: '로그인 세션이 없습니다. 다시 로그인해주세요.' });
      }

      const formData = await request.formData();
      const commentId = formData.get('commentId')?.toString();

      if (!commentId) {
        return fail(400, {
          error: '댓글 ID가 없습니다.'
        });
      }

      const { deleteComment } = await import('$lib/server/supabase/queries/comments');
      await deleteComment(commentId, user.id, sessionTokens);

      return { deletedId: commentId };
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err) {
        throw err;
      }
      console.error('댓글 삭제 오류:', err);
      return fail(500, {
        error: err instanceof Error ? err.message : '댓글 삭제 중 오류가 발생했습니다.'
      });
    }
  },
  updateComment: async ({ request, params, cookies }) => {
    try {
      const user = await getUser(cookies);
      if (!user || user.isAnonymous) {
        return fail(401, { error: '댓글을 수정하려면 로그인이 필요합니다.' });
      }

      const sessionTokens = getSession(cookies);
      if (!sessionTokens) {
        return fail(401, { error: '로그인 세션이 없습니다. 다시 로그인해주세요.' });
      }

      const formData = await request.formData();
      const commentId = formData.get('commentId')?.toString();
      const content = formData.get('content')?.toString();

      if (!commentId) {
        return fail(400, {
          error: '댓글 ID가 없습니다.'
        });
      }

      if (!content || content.trim().length === 0) {
        return fail(400, {
          error: '댓글 내용을 입력해주세요.'
        });
      }

      const { updateComment } = await import('$lib/server/supabase/queries/comments');
      const comment = await updateComment(commentId, content, user.id, sessionTokens);

      return { comment };
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err) {
        throw err;
      }
      console.error('댓글 수정 오류:', err);
      return fail(500, {
        error: err instanceof Error ? err.message : '댓글 수정 중 오류가 발생했습니다.'
      });
    }
  },
  toggleLike: async ({ request, params, cookies }) => {
    try {
      const postId = params.id;

      if (!postId) {
        return fail(400, {
          error: '게시글 ID가 없습니다.'
        });
      }

      // 좋아요는 로그인 사용자 전용 (익명 세션은 허용하지 않음)
      const user = await getUser(cookies);
      if (!user || user.isAnonymous) {
        return fail(401, { error: '좋아요를 누르려면 로그인이 필요합니다.' });
      }

      const sessionTokens = getSession(cookies);

      if (!sessionTokens) {
        return fail(401, { error: '로그인 세션이 없습니다. 다시 로그인해주세요.' });
      }

      const { toggleLike, getLikeCount, isLiked } = await import('$lib/server/supabase/queries/likes');
      const likedNow = await toggleLike(postId, user.id, sessionTokens);
      if (likedNow) {
        try {
          const post = await getPostById(postId);
          if (post?.userId && post.userId !== user.id) {
            const { createNotification } = await import('$lib/server/supabase/queries/notifications');
            await createNotification(
              {
                userId: post.userId,
                actorId: user.id,
                actorName: user.nickname || user.email || null,
                postId,
                type: 'like'
              },
              sessionTokens
            );
          }
        } catch (notifyError) {
          console.warn('좋아요 알림 생성 실패:', notifyError);
        }
      }
      const [likeCount, liked] = await Promise.all([
        getLikeCount(postId, sessionTokens),
        isLiked(postId, user.id, sessionTokens)
      ]);

      // redirect 대신 데이터만 반환 (use:enhance로 빠른 UI 업데이트)
      return { likeCount, isLiked: liked };
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err) {
        throw err;
      }
      console.error('좋아요 토글 오류:', err);
      return fail(500, {
        error: '좋아요 처리 중 오류가 발생했습니다.'
      });
    }
  },
  toggleBookmark: async ({ request, params, cookies }) => {
    try {
      const postId = params.id;

      if (!postId) {
        return fail(400, {
          error: '게시글 ID가 없습니다.'
        });
      }

      const user = await getUser(cookies);
      if (!user || user.isAnonymous) {
        return fail(401, { error: '북마크를 사용하려면 로그인이 필요합니다.' });
      }

      const sessionTokens = getSession(cookies);
      if (!sessionTokens) {
        return fail(401, { error: '로그인 세션이 없습니다. 다시 로그인해주세요.' });
      }

      const { toggleBookmark, isBookmarked } = await import('$lib/server/supabase/queries/bookmarks');
      await toggleBookmark(postId, user.id, sessionTokens);
      const bookmarked = await isBookmarked(postId, user.id, sessionTokens);

      return { isBookmarked: bookmarked };
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err) {
        throw err;
      }
      console.error('북마크 토글 오류:', err);
      return fail(500, {
        error: '북마크 처리 중 오류가 발생했습니다.'
      });
    }
  },
  delete: async ({ request, params, cookies }) => {
    try {
      const postId = params.id;

      if (!postId) {
        return fail(400, {
          error: '게시글 ID가 없습니다.'
        });
      }

      const post = await getPostById(postId);
      if (!post) {
        return fail(404, { error: '게시글을 찾을 수 없습니다.' });
      }

      // 익명 글 판단: post.isAnonymous 사용
      const isAnonymousPost = post.isAnonymous ?? false;

      const formData = await request.formData();
      const editPassword = formData.get('editPassword')?.toString();
      const user = await getUser(cookies);
      const isOwner = !!user && !!post.userId && user.id === post.userId;

      // 로그인 글: 작성자만 삭제 가능 (비밀번호 없음)
      if (!isAnonymousPost && !isOwner) {
        return fail(403, { error: '본인의 게시글만 삭제할 수 있습니다.' });
      }

      // 익명 글: "비로그인 상태"에서만 비밀번호로 삭제 가능
      if (isAnonymousPost && user && user.email) {
        return fail(403, { error: '익명 게시글은 로그아웃 상태에서 비밀번호로만 삭제할 수 있습니다.' });
      }
      if (isAnonymousPost && !editPassword) {
        return fail(400, {
          error: '비밀번호를 입력해주세요.'
        });
      }

      // 세션 토큰 가져오기 (RLS 정책 적용을 위해)
      // 익명 글의 경우 세션이 없으면 익명 세션 생성
      let sessionTokens = getSession(cookies);
      if (isAnonymousPost && !sessionTokens) {
        // 익명 글 삭제를 위해 익명 세션 생성
        const anonymousUser = await getUserOrCreateAnonymous(cookies);
        sessionTokens = getSession(cookies);
      }

      // 게시글 삭제
      await deletePost(
        postId,
        {
          userId: isAnonymousPost ? null : (user?.id ?? null), // 익명 글은 항상 null
          editPassword: isAnonymousPost ? editPassword : undefined // 익명 글은 항상 비밀번호 필요
        },
        sessionTokens || undefined
      );

      // 게시글 목록으로 리다이렉트
      throw redirect(303, '/posts');
    } catch (err) {
      // redirect는 throw이므로 그대로 전달
      if (err && typeof err === 'object' && 'status' in err) {
        throw err;
      }

      console.error('게시글 삭제 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '게시글 삭제 중 오류가 발생했습니다.';
      // 사용자의 입력/권한 문제는 failure로 내려서(use:enhance) UI에서 즉시 에러를 표시할 수 있게 함
      const status =
        errorMessage.includes('비밀번호') ? 400 :
        errorMessage.includes('로그인') ? 401 :
        errorMessage.includes('본인의') ? 403 :
        500;

      return fail(status, { error: errorMessage });
    }
  }
};
