import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getPostById, updatePost } from '$lib/server/supabase/queries/posts';
import { getUser, getSession, getUserOrCreateAnonymous } from '$lib/server/supabase/auth';
import { convertBlobUrlsToStorageUrls } from '$lib/server/supabase/queries/images.js';

function plainTextFromHtml(html: string) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export const load: PageServerLoad = async ({ params, cookies }) => {
  try {
    const postId = params.id;

    if (!postId) {
      throw error(404, '게시글을 찾을 수 없습니다');
    }

    const post = await getPostById(postId);

    if (!post) {
      throw error(404, '게시글을 찾을 수 없습니다');
    }

    // 익명 글 판단: post.isAnonymous 사용
    const isAnonymousPost = post.isAnonymous ?? false;

    const user = await getUser(cookies);

    // 정책:
    // - 익명 글: "비로그인 상태"에서만 비밀번호로 수정 가능 (다른 컴퓨터에서도 비밀번호로 수정 가능)
    // - 로그인 글: 작성자만 수정 가능
    if (isAnonymousPost) {
      // 익명 글은 로그인 사용자가 아닌 경우만 수정 가능 (항상 비밀번호 필요)
      if (user && user.email) {
        throw error(403, '익명 게시글은 로그아웃 상태에서 비밀번호로만 수정할 수 있습니다');
      }
    } else {
      // 로그인 글은 작성자 본인만 수정 가능
      if (!user || !post.userId || user.id !== post.userId) {
        throw error(403, '본인의 게시글만 수정할 수 있습니다');
      }
    }

    return {
      post
    };
  } catch (err) {
    // SvelteKit error는 그대로 전달
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('게시글 로드 오류:', err);
    throw error(500, '게시글을 불러오는 중 오류가 발생했습니다');
  }
};

export const actions: Actions = {
  default: async ({ request, params, cookies }) => {
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
      const title = formData.get('title')?.toString();
      const content = formData.get('content')?.toString();
      const author = formData.get('author')?.toString();
      const editPassword = formData.get('editPassword')?.toString();
      const user = await getUser(cookies);
      const isOwner = !!user && !!post.userId && user.id === post.userId;

      // 필드별 유효성 검사
      const fieldErrors: Record<string, string> = {};
      let hasErrors = false;

      if (!title || title.trim().length === 0) {
        fieldErrors.title = '제목을 입력해주세요.';
        hasErrors = true;
      }

      if (!content || plainTextFromHtml(content).length === 0) {
        fieldErrors.content = '내용을 입력해주세요.';
        hasErrors = true;
      }

      // 로그인 글: 작성자만 수정 가능 (비밀번호 없음)
      if (!isAnonymousPost && !isOwner) {
        return fail(403, { error: '본인의 게시글만 수정할 수 있습니다.' });
      }

      // 익명 글: "비로그인 상태"에서만 비밀번호로 수정 가능
      if (isAnonymousPost && user && user.email) {
        return fail(403, { error: '익명 게시글은 로그아웃 상태에서 비밀번호로만 수정할 수 있습니다.' });
      }
      
      if (isAnonymousPost && !editPassword) {
        fieldErrors.editPassword = '비밀번호를 입력해주세요.';
        hasErrors = true;
      }

      if (hasErrors) {
        return fail(400, {
          error: '입력한 내용을 확인해주세요.',
          fieldErrors,
          values: {
            title: title || '',
            content: content || '',
            author: author || ''
          }
        });
      }

      // 세션 토큰 가져오기 (RLS 정책 적용을 위해)
      // 익명 글의 경우 세션이 없으면 익명 세션 생성
      let sessionTokens = getSession(cookies);
      if (isAnonymousPost && !sessionTokens) {
        // 익명 글 수정을 위해 익명 세션 생성
        const anonymousUser = await getUserOrCreateAnonymous(cookies);
        sessionTokens = getSession(cookies);
      }

      // 이미지 파일 추출 및 업로드
      const images: File[] = [];
      const blobUrls: string[] = [];
      let index = 0;
      while (true) {
        const imageFile = formData.get(`image_${index}`) as File | null;
        const blobUrl = formData.get(`image_url_${index}`)?.toString();
        if (!imageFile || !blobUrl) break;
        images.push(imageFile);
        blobUrls.push(blobUrl);
        index++;
      }

      // 기존 게시글의 이미지 경로 추출
      const existingImageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      const existingMatches = Array.from((post.content || '').matchAll(existingImageRegex));
      const existingImageUrls = existingMatches
        .map((m) => m[1])
        .filter((url) => url && !url.startsWith('blob:')); // Blob URL 제외

      // Blob URL을 Storage URL로 변환
      let finalContent = content || '';
      if (images.length > 0 && blobUrls.length > 0 && sessionTokens) {
        try {
          const userId = isAnonymousPost ? (await getUserOrCreateAnonymous(cookies)).id : (user?.id || '');
          finalContent = await convertBlobUrlsToStorageUrls(
            content || '',
            images,
            blobUrls,
            userId,
            postId, // postId 전달
            {
              accessToken: sessionTokens.accessToken,
              refreshToken: sessionTokens.refreshToken
            }
          );
        } catch (error) {
          console.error('이미지 업로드 오류:', error);
          return fail(500, {
            error: '이미지 업로드 중 오류가 발생했습니다.',
            fieldErrors: {},
            values: {
              title: title || '',
              content: content || '',
              author: author || ''
            }
          });
        }
      }

      // 새 게시글의 이미지 경로 추출
      const newImageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      const newMatches = Array.from((finalContent || '').matchAll(newImageRegex));
      const newImageUrls = newMatches
        .map((m) => m[1])
        .filter((url) => url && !url.startsWith('blob:')); // Blob URL 제외

      // 삭제된 이미지 경로 계산 (기존에 있지만 새에는 없는 이미지)
      const deletedImageUrls = existingImageUrls.filter((url) => !newImageUrls.includes(url));

      // 삭제된 이미지 파일 삭제
      if (deletedImageUrls.length > 0 && sessionTokens) {
        for (const imageUrl of deletedImageUrls) {
          try {
            // Storage URL에서 경로 추출
            // 예: https://xxx.supabase.co/storage/v1/object/public/post-images/posts/userId/postId/image_1.webp
            // → posts/userId/postId/image_1.webp
            const urlMatch = imageUrl.match(/post-images\/(.+)$/);
            if (urlMatch && urlMatch[1]) {
              const filePath = urlMatch[1];
              await deleteImage(filePath, {
                accessToken: sessionTokens.accessToken,
                refreshToken: sessionTokens.refreshToken
              });
            }
          } catch (deleteError) {
            // 이미지 삭제 실패해도 게시글 수정은 진행 (로그만 기록)
            console.warn(`이미지 삭제 실패 (URL: ${imageUrl}), 게시글은 수정됩니다.`, deleteError);
          }
        }
      }

      // 게시글 수정
      await updatePost(
        postId,
        {
        title,
        content: finalContent, // 변환된 HTML 사용
          author_name: isAnonymousPost ? (author || undefined) : (user?.nickname || user?.email || undefined)
        },
        {
          userId: isAnonymousPost ? null : (user?.id ?? null), // 익명 글은 항상 null
          editPassword: isAnonymousPost ? editPassword : undefined // 익명 글은 항상 비밀번호 필요
        },
        sessionTokens || undefined
      );

      // 게시글 상세 페이지로 리다이렉트
      throw redirect(303, `/posts/${postId}`);
    } catch (err) {
      // redirect는 throw이므로 그대로 전달
      if (err && typeof err === 'object' && 'status' in err) {
        throw err;
      }

      console.error('게시글 수정 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '게시글 수정 중 오류가 발생했습니다.';
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
