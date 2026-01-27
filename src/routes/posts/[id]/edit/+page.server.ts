import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getPostById, updatePost } from '$lib/server/supabase/queries/posts';
import { listWhiskies } from '$lib/server/supabase/queries/whiskies';
import { getUser, getSession, getUserOrCreateAnonymous } from '$lib/server/supabase/auth';
import { convertBlobUrlsToStorageUrlsWithMap } from '$lib/server/supabase/queries/images.js';
import { deleteImage } from '$lib/server/supabase/queries/storage.js';
import { parseTags, validatePostInput } from '$lib/server/validation/posts';

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

    const whiskies = await listWhiskies(200);
    return {
      post,
      whiskies
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
  update: async ({ request, params, cookies }) => {
    try {
      const postId = params.id;

      if (!postId) {
        console.error('[EDIT] postId가 없습니다.');
        return fail(400, {
          error: '게시글 ID가 없습니다.'
        });
      }

      const post = await getPostById(postId);
      if (!post) {
        console.error('[EDIT] 게시글을 찾을 수 없습니다.');
        return fail(404, { error: '게시글을 찾을 수 없습니다.' });
      }

      // 익명 글 판단: post.isAnonymous 사용
      const isAnonymousPost = post.isAnonymous ?? false;

      const formData = await request.formData();
      const title = formData.get('title')?.toString();
      const content = formData.get('content')?.toString();
      const author = formData.get('author')?.toString();
      const editPassword = formData.get('editPassword')?.toString();
      const tags = formData.get('tags')?.toString() ?? '';
      const whiskyId = formData.get('whiskyId')?.toString() ?? '';
      let thumbnailUrl = formData.get('thumbnailUrl')?.toString() ?? '';
      
      const user = await getUser(cookies);
      const isOwner = !!user && !!post.userId && user.id === post.userId;
      const isLoggedIn = !!user && !user.isAnonymous && !!user.email;

      // 로그인 글: 작성자만 수정 가능 (비밀번호 없음)
      if (!isAnonymousPost && !isOwner) {
        return fail(403, { error: '본인의 게시글만 수정할 수 있습니다.' });
      }

      // 익명 글: "비로그인 상태"에서만 비밀번호로 수정 가능
      if (isAnonymousPost && user && user.email) {
        return fail(403, { error: '익명 게시글은 로그아웃 상태에서 비밀번호로만 수정할 수 있습니다.' });
      }

      const { fieldErrors, hasErrors: initialHasErrors } = validatePostInput(
        { title, content },
        {
          isLoggedIn,
          isAnonymousPost,
          editPassword,
          requirePasswordConfirm: false
        }
      );

      if (isAnonymousPost && (!editPassword || editPassword.length < 4)) {
        fieldErrors.editPassword = '비밀번호를 입력해주세요.';
      }

      const hasErrors = initialHasErrors || Object.keys(fieldErrors).length > 0;

      if (hasErrors) {
        return fail(400, {
          error: '입력한 내용을 확인해주세요.',
          fieldErrors,
          values: {
            title: title || '',
            content: content || '',
            author: author || '',
            tags: tags || '',
            whiskyId: whiskyId || '',
            thumbnailUrl: thumbnailUrl || ''
          }
        });
      }

      // 세션 토큰 가져오기 (RLS 정책 적용을 위해)
      // 익명 글의 경우 세션이 없으면 익명 세션 생성
      let sessionTokens = getSession(cookies);
      if (isAnonymousPost && !sessionTokens) {
        // 익명 글 수정을 위해 익명 세션 생성
        await getUserOrCreateAnonymous(cookies);
        sessionTokens = getSession(cookies);
      }

      // 이미지 파일 추출 및 업로드
      const images: File[] = [];
      const blobUrls: string[] = [];
      let index = 0;
      while (true) {
        const imageFile = formData.get(`image_${index}`);
        const blobUrl = formData.get(`image_url_${index}`)?.toString();
        if (!imageFile || !blobUrl) break;
        
        // File 객체인지 확인 (기존 이미지는 Storage URL이므로 File 객체가 아님)
        if (imageFile instanceof File) {
          images.push(imageFile);
          blobUrls.push(blobUrl);
        }
        index++;
      }

      // 기존 게시글의 이미지 경로 추출
      const existingImageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      const existingMatches = Array.from((post.content || '').matchAll(existingImageRegex));
      const existingImageUrls = existingMatches
        .map((m) => m[1])
        .filter((url) => url && !url.startsWith('blob:')); // Blob URL 제외

      // 기존 이미지 개수 계산 (Storage URL에서 image_N 패턴 찾기)
      let existingImageCount = 0;
      existingImageUrls.forEach((url) => {
        // Storage URL에서 image_N 패턴 찾기 (예: image_1.jpg, image_2.webp)
        const imageIndexMatch = url.match(/image_(\d+)\./i);
        if (imageIndexMatch && imageIndexMatch[1]) {
          const index = parseInt(imageIndexMatch[1], 10);
          if (index > existingImageCount) {
            existingImageCount = index;
          }
        }
      });

      // Blob URL을 Storage URL로 변환 (기존 이미지 개수 + 1부터 시작)
      let finalContent = content || '';
      if (images.length > 0 && blobUrls.length > 0 && sessionTokens) {
        try {
          // 익명 글의 경우 익명 사용자 생성, 로그인 글의 경우 기존 user 사용
          const targetUser = isAnonymousPost 
            ? await getUserOrCreateAnonymous(cookies)
            : user;
          
          if (!targetUser?.id) {
            console.error('[EDIT] 사용자 ID를 가져올 수 없습니다.');
            throw new Error('사용자 ID를 가져올 수 없습니다.');
          }

          const { html, urlMap } = await convertBlobUrlsToStorageUrlsWithMap(
            content || '',
            images,
            blobUrls,
            targetUser.id,
            postId, // postId 전달
            sessionTokens, // sessionTokens 그대로 전달
            existingImageCount + 1 // 기존 이미지 개수 + 1부터 시작
          );
          finalContent = html;
          if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
            const mapped = urlMap.get(thumbnailUrl);
            if (mapped) thumbnailUrl = mapped;
          }
        } catch (error) {
          console.error('[EDIT] 이미지 업로드 오류:', error);
          if (error instanceof Error) {
            console.error('[EDIT] 에러 메시지:', error.message);
            console.error('[EDIT] 에러 스택:', error.stack);
          }
          return fail(500, {
            error: '이미지 업로드 중 오류가 발생했습니다.',
            fieldErrors: {},
            values: {
              title: title || '',
              content: content || '',
              author: author || '',
              tags: tags || '',
              whiskyId: whiskyId || '',
              thumbnailUrl: thumbnailUrl || ''
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

      if (thumbnailUrl && !newImageUrls.includes(thumbnailUrl)) {
        thumbnailUrl = newImageUrls[0] || '';
      }

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
              await deleteImage(filePath, sessionTokens);
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
          author_name: isAnonymousPost ? (author || undefined) : (user?.nickname || user?.email || undefined),
          tags: parseTags(tags),
          whisky_id: whiskyId || null,
          thumbnail_url: thumbnailUrl || null
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

      console.error('[EDIT] 게시글 수정 오류:', err);
      if (err instanceof Error) {
        console.error('[EDIT] 에러 메시지:', err.message);
        console.error('[EDIT] 에러 스택:', err.stack);
      }
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
