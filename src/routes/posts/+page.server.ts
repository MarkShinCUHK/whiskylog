import { listPosts, getPostCount, listPostsByTag, getPostCountByTag } from '$lib/server/supabase/queries/posts';

const PER_PAGE = 12;

export async function load({ url }) {
  try {
    const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
    const offset = (page - 1) * PER_PAGE;
    const tag = url.searchParams.get('tag')?.toString() || '';

    const [posts, totalCount] = await Promise.all([
      tag ? listPostsByTag(tag, PER_PAGE, offset) : listPosts(PER_PAGE, offset),
      tag ? getPostCountByTag(tag) : getPostCount()
    ]);

    const totalPages = Math.max(1, Math.ceil((totalCount || 0) / PER_PAGE));

    return {
      page,
      perPage: PER_PAGE,
      totalCount,
      totalPages,
      posts,
      tag
    };
  } catch (error) {
    console.error('게시글 목록 로드 오류:', error);
    return {
      page: 1,
      perPage: PER_PAGE,
      totalCount: 0,
      totalPages: 0,
      posts: [],
      tag: ''
    };
  }
}
