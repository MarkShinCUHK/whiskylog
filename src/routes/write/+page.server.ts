import { fail, redirect } from '@sveltejs/kit';
import { createPost } from '$lib/server/supabase/queries/posts';
import { listWhiskies } from '$lib/server/supabase/queries/whiskies';
import { getUser, getUserOrCreateAnonymous, getSession } from '$lib/server/supabase/auth';
import { convertBlobUrlsToStorageUrls } from '$lib/server/supabase/queries/images.js';

function plainTextFromHtml(html: string) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseTags(value: string): string[] {
  return (value || '')
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter((tag) => tag.length > 0);
}

export const actions = {
  create: async ({ request, cookies }) => {
    let title = '';
    let content = '';
    let author = '';
    let editPassword = '';
    let editPasswordConfirm = '';
    let tags = '';
    let whiskyId = '';
    try {
      const formData = await request.formData();
      title = formData.get('title')?.toString() ?? '';
      content = formData.get('content')?.toString() ?? '';
      author = formData.get('author')?.toString() ?? '';
      tags = formData.get('tags')?.toString() ?? '';
      whiskyId = formData.get('whiskyId')?.toString() ?? '';
      editPassword = formData.get('editPassword')?.toString() ?? '';
      editPasswordConfirm = formData.get('editPasswordConfirm')?.toString() ?? '';

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

      // 익명 사용자도 세션을 가지도록 함 (RLS 정책 적용을 위해)
      const user = await getUserOrCreateAnonymous(cookies);
      const isLoggedIn = !user.isAnonymous && !!user.email;

      if (!isLoggedIn) {
        if (!editPassword || editPassword.length < 4) {
          fieldErrors.editPassword = '비밀번호는 4자 이상으로 입력해주세요.';
          hasErrors = true;
        }

        if (!editPasswordConfirm) {
          fieldErrors.editPasswordConfirm = '비밀번호 확인을 입력해주세요.';
          hasErrors = true;
        } else if (editPassword && editPassword !== editPasswordConfirm) {
          fieldErrors.editPasswordConfirm = '비밀번호 확인이 일치하지 않습니다.';
          hasErrors = true;
        }
      }

      if (hasErrors) {
        return fail(400, {
          error: '입력한 내용을 확인해주세요.',
          fieldErrors,
          values: {
            title: title || '',
            content: content || '',
            author: author || '',
            tags: tags || '',
            whiskyId: whiskyId || ''
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
          tags: parseTags(tags)
        },
        accessToken
      );

      // Blob URL을 Storage URL로 변환 (postId 사용)
      let finalContent = content;
      if (images.length > 0 && blobUrls.length > 0) {
        if (!sessionTokens) {
          // console.error('서버: sessionTokens가 없어서 이미지 업로드를 건너뜁니다.');
          // sessionTokens가 없으면 익명 세션을 생성하거나 에러를 반환
          // 일단 경고만 하고 Blob URL을 그대로 유지
        } else {
          try {
            // console.log('서버: 이미지 업로드 시작...');
            finalContent = await convertBlobUrlsToStorageUrls(
              content || '',
              images,
              blobUrls,
              user.id,
              post.id, // postId 전달
              sessionTokens
            );
            // console.log('서버: 이미지 업로드 완료, 변환된 HTML 길이:', finalContent.length);
            
            // 이미지 업로드가 완료되었으므로 게시글 내용 업데이트
            if (finalContent !== content) {
              const { updatePost } = await import('$lib/server/supabase/queries/posts');
              await updatePost(
                post.id,
                {
                  content: finalContent
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
                whiskyId: whiskyId || ''
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
          whiskyId: whiskyId || ''
        }
      });
    }
  }
};

export async function load() {
  const whiskies = await listWhiskies(200);
  return { whiskies };
}
