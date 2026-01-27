import { searchPosts, getSearchPostCount, listPostsByTag, getPostCountByTag, type PostSearchSort } from '$lib/server/supabase/queries/posts';

const PER_PAGE = 12;

export async function load({ url }) {
  const q = url.searchParams.get('q')?.toString() || '';
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const offset = (page - 1) * PER_PAGE;
  const author = url.searchParams.get('author')?.toString() || '';
  const from = url.searchParams.get('from')?.toString() || '';
  const to = url.searchParams.get('to')?.toString() || '';
  const sortParam = url.searchParams.get('sort')?.toString() || 'newest';
  const allowedSorts: PostSearchSort[] = ['newest', 'oldest', 'views'];
  const sort = allowedSorts.includes(sortParam as PostSearchSort) ? (sortParam as PostSearchSort) : 'newest';

  const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999Z`) : null;
  const fromIso = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate.toISOString() : '';
  const toIso = toDate && !Number.isNaN(toDate.getTime()) ? toDate.toISOString() : '';

  if (!q.trim()) {
    return {
      q,
      page,
      perPage: PER_PAGE,
      totalCount: 0,
      totalPages: 0,
      posts: [],
      filters: {
        author,
        from,
        to,
        sort
      }
    };
  }

  const normalized = q.trim();
  const isTagSearch = normalized.startsWith('#');
  const tag = isTagSearch ? normalized.slice(1) : '';
  const filters = {
    author: author.trim() || undefined,
    from: fromIso || undefined,
    to: toIso || undefined,
    sort
  };

  const [posts, totalCount] = await Promise.all([
    isTagSearch
      ? listPostsByTag(tag, PER_PAGE, offset, filters)
      : searchPosts(normalized, { limit: PER_PAGE, offset, filters }),
    isTagSearch
      ? getPostCountByTag(tag, filters)
      : getSearchPostCount(normalized, filters)
  ]);

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / PER_PAGE));

  return {
    q,
    page,
    perPage: PER_PAGE,
    totalCount,
    totalPages,
    posts,
    filters: {
      author,
      from,
      to,
      sort
    }
  };
}
