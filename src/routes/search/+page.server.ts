import { searchPosts, getSearchPostCount, type PostSearchSort } from '$lib/server/supabase/queries/posts';

const PER_PAGE = 12;

export async function load({ url }) {
  const q = url.searchParams.get('q')?.toString() || '';
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const offset = (page - 1) * PER_PAGE;
  const author = url.searchParams.get('author')?.toString() || '';
  const from = url.searchParams.get('from')?.toString() || '';
  const to = url.searchParams.get('to')?.toString() || '';
  const sortParam = url.searchParams.get('sort')?.toString() || 'newest';
  const allowedSorts: PostSearchSort[] = ['newest', 'oldest', 'views', 'tasting'];
  const sort = allowedSorts.includes(sortParam as PostSearchSort) ? (sortParam as PostSearchSort) : 'newest';
  const avgMinParam = url.searchParams.get('avgMin');
  const avgMaxParam = url.searchParams.get('avgMax');
  const colorMinParam = url.searchParams.get('colorMin');
  const colorMaxParam = url.searchParams.get('colorMax');
  const noseMinParam = url.searchParams.get('noseMin');
  const noseMaxParam = url.searchParams.get('noseMax');
  const palateMinParam = url.searchParams.get('palateMin');
  const palateMaxParam = url.searchParams.get('palateMax');
  const finishMinParam = url.searchParams.get('finishMin');
  const finishMaxParam = url.searchParams.get('finishMax');

  const avgMin = avgMinParam ? Number(avgMinParam) : undefined;
  const avgMax = avgMaxParam ? Number(avgMaxParam) : undefined;
  const colorMin = colorMinParam ? Number(colorMinParam) : undefined;
  const colorMax = colorMaxParam ? Number(colorMaxParam) : undefined;
  const noseMin = noseMinParam ? Number(noseMinParam) : undefined;
  const noseMax = noseMaxParam ? Number(noseMaxParam) : undefined;
  const palateMin = palateMinParam ? Number(palateMinParam) : undefined;
  const palateMax = palateMaxParam ? Number(palateMaxParam) : undefined;
  const finishMin = finishMinParam ? Number(finishMinParam) : undefined;
  const finishMax = finishMaxParam ? Number(finishMaxParam) : undefined;

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
        sort,
        avgMin: avgMinParam ?? '',
        avgMax: avgMaxParam ?? '',
        colorMin: colorMinParam ?? '',
        colorMax: colorMaxParam ?? '',
        noseMin: noseMinParam ?? '',
        noseMax: noseMaxParam ?? '',
        palateMin: palateMinParam ?? '',
        palateMax: palateMaxParam ?? '',
        finishMin: finishMinParam ?? '',
        finishMax: finishMaxParam ?? ''
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
    sort,
    tag: tag || undefined,
    avgMin: Number.isFinite(avgMin) ? avgMin : undefined,
    avgMax: Number.isFinite(avgMax) ? avgMax : undefined,
    colorMin: Number.isFinite(colorMin) ? colorMin : undefined,
    colorMax: Number.isFinite(colorMax) ? colorMax : undefined,
    noseMin: Number.isFinite(noseMin) ? noseMin : undefined,
    noseMax: Number.isFinite(noseMax) ? noseMax : undefined,
    palateMin: Number.isFinite(palateMin) ? palateMin : undefined,
    palateMax: Number.isFinite(palateMax) ? palateMax : undefined,
    finishMin: Number.isFinite(finishMin) ? finishMin : undefined,
    finishMax: Number.isFinite(finishMax) ? finishMax : undefined
  };

  const [posts, totalCount] = await Promise.all([
    searchPosts(isTagSearch ? '' : normalized, { limit: PER_PAGE, offset, filters }),
    getSearchPostCount(isTagSearch ? '' : normalized, filters)
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
      sort,
      avgMin: avgMinParam ?? '',
      avgMax: avgMaxParam ?? '',
      colorMin: colorMinParam ?? '',
      colorMax: colorMaxParam ?? '',
      noseMin: noseMinParam ?? '',
      noseMax: noseMaxParam ?? '',
      palateMin: palateMinParam ?? '',
      palateMax: palateMaxParam ?? '',
      finishMin: finishMinParam ?? '',
      finishMax: finishMaxParam ?? ''
    }
  };
}
