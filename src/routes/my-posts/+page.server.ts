import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/supabase/auth';
import { getMyPosts } from '$lib/server/supabase/queries/posts';

export async function load({ cookies }) {
  const user = await requireAuth(cookies);
  const posts = await getMyPosts(user.id);

  if (!posts) {
    throw error(500, '내 게시글을 불러오지 못했습니다.');
  }

  return { user, posts };
}

