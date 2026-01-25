import { fail, redirect } from '@sveltejs/kit';
import { createPost } from '$lib/server/supabase/queries/posts';
import { getUser, getUserOrCreateAnonymous, getSession } from '$lib/server/supabase/auth';

function plainTextFromHtml(html: string) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export const actions = {
  default: async ({ request, cookies }) => {
    try {
      const formData = await request.formData();
      const title = formData.get('title')?.toString();
      const content = formData.get('content')?.toString();
      const author = formData.get('author')?.toString();
      const editPassword = formData.get('editPassword')?.toString();
      const editPasswordConfirm = formData.get('editPasswordConfirm')?.toString();

      // 필드별 유효성 검사
      const fieldErrors = {};
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
            author: author || ''
          }
        });
      }

      // 세션 토큰 가져오기 (RLS 정책 적용을 위해)
      const session = getSession(cookies);
      const accessToken = session?.accessToken;

      // 게시글 생성 (queries/posts.ts의 createPost 사용)
      // 익명 글도 익명 세션의 user_id를 저장 (RLS 정책 적용을 위해)
      const post = await createPost(
        {
          title,
          content,
          // 로그인 사용자는 닉네임을 작성자명으로 강제
          author_name: isLoggedIn ? (user?.nickname || user?.email || undefined) : (author || undefined),
          edit_password: isLoggedIn ? undefined : editPassword,
          user_id: user.id // 익명 사용자도 익명 세션의 user_id를 저장
        },
        accessToken
      );

      // 게시글 상세 페이지로 리다이렉트 (id는 uuid이므로 string)
      throw redirect(303, `/posts/${post.id}`);
    } catch (error) {
      // redirect는 throw이므로 그대로 전달
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      // 에러 상세 정보 로깅
      console.error('게시글 작성 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '게시글 작성 중 오류가 발생했습니다.';
      
      return fail(500, {
        error: errorMessage,
        values: {
          title: title || '',
          content: content || '',
          author: author || ''
        }
      });
    }
  }
};
