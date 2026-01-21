import { fail, redirect } from '@sveltejs/kit';
import { createPost } from '$lib/server/supabase/queries/posts';
import { getUser } from '$lib/server/supabase/auth';

export const actions = {
  default: async ({ request, cookies }) => {
    try {
      const formData = await request.formData();
      const title = formData.get('title')?.toString();
      const content = formData.get('content')?.toString();
      const author = formData.get('author')?.toString();
      const excerpt = formData.get('excerpt')?.toString();
      const editPassword = formData.get('editPassword')?.toString();
      const editPasswordConfirm = formData.get('editPasswordConfirm')?.toString();

      // 유효성 검사
      if (!title || !content) {
        return fail(400, {
          error: '제목과 내용을 입력해주세요.',
          values: {
            title: title || '',
            content: content || '',
            author: author || '',
            excerpt: excerpt || ''
          }
        });
      }

      const user = await getUser(cookies);
      const isLoggedIn = !!user;

      if (!isLoggedIn) {
        if (!editPassword || editPassword.length < 4) {
          return fail(400, {
            error: '비밀번호는 4자 이상으로 입력해주세요.',
            values: {
              title: title || '',
              content: content || '',
              author: author || '',
              excerpt: excerpt || ''
            }
          });
        }

        if (editPassword !== editPasswordConfirm) {
          return fail(400, {
            error: '비밀번호 확인이 일치하지 않습니다.',
            values: {
              title: title || '',
              content: content || '',
              author: author || '',
              excerpt: excerpt || ''
            }
          });
        }
      }

      // 게시글 생성 (queries/posts.ts의 createPost 사용)
      const post = await createPost({
        title,
        content,
        // 로그인 사용자는 닉네임을 작성자명으로 강제
        author_name: isLoggedIn ? (user?.nickname || user?.email || undefined) : (author || undefined),
        edit_password: isLoggedIn ? undefined : editPassword,
        user_id: user?.id ?? null
        // excerpt는 현재 스키마에 없으므로 제외
      });

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
          author: author || '',
          excerpt: excerpt || ''
        }
      });
    }
  }
};
