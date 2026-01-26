import { requireAuth, getSession } from '$lib/server/supabase/auth';
import { listBookmarkedPosts, getBookmarkCount } from '$lib/server/supabase/queries/bookmarks';

const PER_PAGE = 12;

export async function load({ cookies, url }) {
  const user = await requireAuth(cookies);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const offset = (page - 1) * PER_PAGE;
  const sessionTokens = getSession(cookies);

  const [posts, totalCount] = await Promise.all([
    listBookmarkedPosts(user.id, PER_PAGE, offset, sessionTokens || undefined),
    getBookmarkCount(user.id, sessionTokens || undefined)
  ]);

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
