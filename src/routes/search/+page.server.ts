import { searchPosts, getSearchPostCount, listPostsByTag, getPostCountByTag } from '$lib/server/supabase/queries/posts';

const PER_PAGE = 12;

export async function load({ url }) {
  const q = url.searchParams.get('q')?.toString() || '';
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const offset = (page - 1) * PER_PAGE;

  if (!q.trim()) {
    return {
      q,
      page,
      perPage: PER_PAGE,
      totalCount: 0,
      totalPages: 0,
      posts: []
    };
  }

  const normalized = q.trim();
  const isTagSearch = normalized.startsWith('#');
  const tag = isTagSearch ? normalized.slice(1) : '';

  const [posts, totalCount] = await Promise.all([
    isTagSearch ? listPostsByTag(tag, PER_PAGE, offset) : searchPosts(normalized, { limit: PER_PAGE, offset }),
    isTagSearch ? getPostCountByTag(tag) : getSearchPostCount(normalized)
  ]);

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / PER_PAGE));

  return {
    q,
    page,
    perPage: PER_PAGE,
    totalCount,
    totalPages,
    posts
  };
}
