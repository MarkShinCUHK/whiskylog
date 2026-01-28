import { fail, redirect } from '@sveltejs/kit';
import { createPost } from '$lib/server/supabase/queries/posts';
import { listWhiskies } from '$lib/server/supabase/queries/whiskies';
import { getUser, getUserOrCreateAnonymous, getSession } from '$lib/server/supabase/auth';
import { convertBlobUrlsToStorageUrls, convertBlobUrlsToStorageUrlsWithMap } from '$lib/server/supabase/queries/images.js';
import { parseTags, validatePostInput, validateTastingInput } from '$lib/server/validation/posts';

export const actions = {
  create: async ({ request, cookies }) => {
    let title = '';
    let content = '';
    let author = '';
    let editPassword = '';
    let editPasswordConfirm = '';
    let tags = '';
    let whiskyId = '';
    let thumbnailUrl = '';
    let color = '0.5';
    let nose = '0';
    let palate = '0';
    let finish = '0';
    try {
      const formData = await request.formData();
      title = formData.get('title')?.toString() ?? '';
      content = formData.get('content')?.toString() ?? '';
      author = formData.get('author')?.toString() ?? '';
      tags = formData.get('tags')?.toString() ?? '';
      whiskyId = formData.get('whiskyId')?.toString() ?? '';
      thumbnailUrl = formData.get('thumbnailUrl')?.toString() ?? '';
      color = formData.get('color')?.toString() ?? '0.5';
      nose = formData.get('nose')?.toString() ?? '0';
      palate = formData.get('palate')?.toString() ?? '0';
      finish = formData.get('finish')?.toString() ?? '0';
      editPassword = formData.get('editPassword')?.toString() ?? '';
      editPasswordConfirm = formData.get('editPasswordConfirm')?.toString() ?? '';

      // 익명 사용자도 세션을 가지도록 함 (RLS 정책 적용을 위해)
      const user = await getUserOrCreateAnonymous(cookies);
      const isLoggedIn = !user.isAnonymous && !!user.email;

      const { fieldErrors, hasErrors: baseHasErrors } = validatePostInput(
        { title, content },
        {
          isLoggedIn,
          isAnonymousPost: !isLoggedIn,
          editPassword,
          editPasswordConfirm,
          requirePasswordConfirm: true
        }
      );

      if (!whiskyId) {
        fieldErrors.whiskyId = '위스키를 선택해주세요.';
      }

      const colorValue = Number(color);
      const noseValue = Number(nose);
      const palateValue = Number(palate);
      const finishValue = Number(finish);
      const tastingValidation = validateTastingInput({
        color: colorValue,
        nose: noseValue,
        palate: palateValue,
        finish: finishValue
      });

      if (tastingValidation.hasErrors) {
        Object.assign(fieldErrors, tastingValidation.fieldErrors);
      }

      const hasErrors = baseHasErrors || Object.keys(fieldErrors).length > 0;

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
            thumbnailUrl: thumbnailUrl || '',
            color,
            nose,
            palate,
            finish
          }
        });
      }

      // 세션 토큰 가져오기 (RLS 정책 적용을 위해)
      const session = getSession(cookies);
      const accessToken = session?.accessToken;
      const sessionTokens = session
        ? {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken
          }
        : undefined;

      // 이미지 파일 추출 및 업로드
      const images: File[] = [];
      const blobUrls: string[] = [];
      let index = 0;
      while (true) {
        const imageFile = formData.get(`image_${index}`);
        const blobUrl = formData.get(`image_url_${index}`)?.toString();
        if (!imageFile || !blobUrl) break;
        
        // File 객체인지 확인
        if (imageFile instanceof File) {
          images.push(imageFile);
          blobUrls.push(blobUrl);
          // console.log(`서버: image_${index} 추가됨 - Blob URL: ${blobUrl}, 파일명: ${imageFile.name}, 크기: ${imageFile.size} bytes`);
        } else {
          // console.error(`서버: image_${index}가 File 객체가 아닙니다:`, typeof imageFile, imageFile);
        }
        index++;
      }
      
      // console.log(`서버: 추출된 이미지 개수: ${images.length}, Blob URL 개수: ${blobUrls.length}`);
      // console.log(`서버: sessionTokens 존재 여부:`, !!sessionTokens);
      // console.log(`서버: user.id:`, user.id);

      // 게시글을 먼저 생성하여 postId 획득 (이미지 업로드에 필요)
      // console.log('서버: 게시글 생성 시작...', { title: title?.substring(0, 50) });
      const post = await createPost(
        {
          title,
          content, // 일단 원본 HTML 사용 (이미지 업로드 후 업데이트)
          // 로그인 사용자는 닉네임을 작성자명으로 강제
          author_name: isLoggedIn ? (user?.nickname || user?.email || undefined) : (author || undefined),
          edit_password: isLoggedIn ? undefined : editPassword,
          user_id: user.id, // 익명 사용자도 익명 세션의 user_id를 저장
          whisky_id: whiskyId || null,
          thumbnail_url: thumbnailUrl || null,
          tags: parseTags(tags),
          tasting: {
            color_100: Math.max(0, Math.min(100, Math.round(colorValue * 100))),
            nose_score_x2: Math.max(0, Math.min(10, Math.round(noseValue * 2))),
            palate_score_x2: Math.max(0, Math.min(10, Math.round(palateValue * 2))),
            finish_score_x2: Math.max(0, Math.min(10, Math.round(finishValue * 2)))
          }
        },
        accessToken
      );

      // Blob URL을 Storage URL로 변환 (postId 사용)
      let finalContent = content;
      const initialThumbnailUrl = thumbnailUrl;
      if (images.length > 0 && blobUrls.length > 0) {
        if (!sessionTokens) {
          // console.error('서버: sessionTokens가 없어서 이미지 업로드를 건너뜁니다.');
          // sessionTokens가 없으면 익명 세션을 생성하거나 에러를 반환
          // 일단 경고만 하고 Blob URL을 그대로 유지
        } else {
          try {
            // console.log('서버: 이미지 업로드 시작...');
            const { html, urlMap } = await convertBlobUrlsToStorageUrlsWithMap(
              content || '',
              images,
              blobUrls,
              user.id,
              post.id, // postId 전달
              sessionTokens
            );
            finalContent = html;
            if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
              const mapped = urlMap.get(thumbnailUrl);
              if (mapped) thumbnailUrl = mapped;
            }
            // console.log('서버: 이미지 업로드 완료, 변환된 HTML 길이:', finalContent.length);
            
            // 이미지 업로드가 완료되었으므로 게시글 내용 업데이트
            if (finalContent !== content || thumbnailUrl !== initialThumbnailUrl) {
              const { updatePost } = await import('$lib/server/supabase/queries/posts');
              await updatePost(
                post.id,
                {
                  content: finalContent,
                  thumbnail_url: thumbnailUrl || null
                },
                {
                  editPassword: isLoggedIn ? undefined : editPassword,
                  userId: isLoggedIn ? user.id : undefined
                },
                sessionTokens
              );
            }
          } catch (error) {
            console.error('서버: 이미지 업로드 오류:', error);
            // 이미지 업로드 실패 시 게시글 삭제 (트랜잭션 롤백)
            try {
              const { deletePost } = await import('$lib/server/supabase/queries/posts');
              await deletePost(
                post.id,
                {
                  editPassword: isLoggedIn ? undefined : editPassword,
                  userId: isLoggedIn ? user.id : undefined
                },
                sessionTokens
              );
            } catch (deleteError) {
              console.error('서버: 롤백 중 게시글 삭제 실패:', deleteError);
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
                thumbnailUrl: thumbnailUrl || '',
                color,
                nose,
                palate,
                finish
              }
            });
        }
        }
      } else {
        // console.log('서버: 이미지가 없거나 Blob URL이 없어서 변환을 건너뜁니다.');
      }

      // console.log('서버: 게시글 생성 완료, 리다이렉트:', `/posts/${post.id}`);
      // 게시글 상세 페이지로 리다이렉트 (id는 uuid이므로 string)
      throw redirect(303, `/posts/${post.id}`);
    } catch (error) {
      // redirect는 throw이므로 그대로 전달
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      // 에러 상세 정보 로깅
      // console.error('게시글 작성 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '게시글 작성 중 오류가 발생했습니다.';
      
      return fail(500, {
        error: errorMessage,
        values: {
          title: title || '',
          content: content || '',
          author: author || '',
          tags: tags || '',
          whiskyId: whiskyId || '',
          thumbnailUrl: thumbnailUrl || '',
          color,
          nose,
          palate,
          finish
        }
      });
    }
  }
};

export async function load() {
  const whiskies = await listWhiskies(200);
  return { whiskies };
}
