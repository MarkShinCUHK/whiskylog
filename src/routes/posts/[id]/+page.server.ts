import { error, fail, redirect } from '@sveltejs/kit';
import { getPostById, deletePost } from '$lib/server/supabase/queries/posts';
import { getUser } from '$lib/server/supabase/auth';

export async function load({ params }) {
  try {
    const postId = params.id; // UUID (string)

    if (!postId) {
      throw error(404, '게시글을 찾을 수 없습니다');
    }

    const post = await getPostById(postId);

    if (!post) {
      throw error(404, '게시글을 찾을 수 없습니다');
    }

    // 조회수 증가는 MVP 단계에서 제외 (필요시 추후 추가)

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
}

export const actions = {
  delete: async ({ request, params, cookies }) => {
    try {
      const postId = params.id;

      if (!postId) {
        return fail(400, {
          error: '게시글 ID가 없습니다.'
        });
      }

      const formData = await request.formData();
      const editPassword = formData.get('editPassword')?.toString();
      const user = await getUser(cookies);
      const isLoggedIn = !!user;

      if (!isLoggedIn && !editPassword) {
        return fail(400, {
          error: '비밀번호를 입력해주세요.'
        });
      }

      // 게시글 삭제
      await deletePost(postId, {
        userId: user?.id ?? null,
        editPassword: isLoggedIn ? undefined : editPassword
      });

      // 게시글 목록으로 리다이렉트
      throw redirect(303, '/posts');
    } catch (err) {
      // redirect는 throw이므로 그대로 전달
      if (err && typeof err === 'object' && 'status' in err) {
        throw err;
      }

      console.error('게시글 삭제 오류:', err);
      return fail(500, {
        error: '게시글 삭제 중 오류가 발생했습니다.'
      });
    }
  }
};
