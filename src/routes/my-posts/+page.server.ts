import { error } from '@sveltejs/kit';
import { getSession, requireAuth } from '$lib/server/supabase/auth';
import { getMyPosts, getMyPostCount } from '$lib/server/supabase/queries/posts';

const PER_PAGE = 12;

export async function load({ cookies, url }) {
  const user = await requireAuth(cookies);
  const sessionTokens = getSession(cookies);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const offset = (page - 1) * PER_PAGE;

  const [posts, totalCount] = await Promise.all([
    getMyPosts(user.id, PER_PAGE, offset, sessionTokens),
    getMyPostCount(user.id, sessionTokens)
  ]);

  if (!posts) {
    throw error(500, '내 게시글을 불러오지 못했습니다.');
  }

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / PER_PAGE));

  return {
    user,
    page,
    perPage: PER_PAGE,
    totalCount,
    totalPages,
    posts
  };
}
