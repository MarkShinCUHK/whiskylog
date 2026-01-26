import { createSupabaseClient, createSupabaseClientWithSession } from '../client.js';
import type { PostRow, Post } from '../types.js';
import type { SessionTokens } from '../auth.js';
import { mapRowToPost } from './posts.js';

type BookmarkWithPost = {
  post: PostRow | null;
};

/**
 * 북마크된 게시글 목록 조회
 */
export async function listBookmarkedPosts(
  userId: string,
  limit?: number,
  offset?: number,
  sessionTokens?: SessionTokens
): Promise<Post[]> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

    let query = supabase
      .from('bookmarks')
      .select('post:posts(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (typeof offset === 'number' && offset >= 0 && limit && limit > 0) {
      query = query.range(offset, offset + limit - 1);
    } else if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('북마크 목록 조회 오류:', error);
      return [];
    }

    const rows = (data ?? []) as unknown as BookmarkWithPost[];
    return rows
      .map((row) => Array.isArray(row.post) ? row.post[0] : row.post)
      .filter((post): post is PostRow => !!post)
      .map(mapRowToPost);
  } catch (error) {
    console.error('북마크 목록 조회 오류:', error);
    return [];
  }
}

export async function getBookmarkCount(
  userId: string,
  sessionTokens?: SessionTokens
): Promise<number> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

    const { count, error } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('북마크 개수 조회 오류:', error);
      return 0;
    }
    return count ?? 0;
  } catch (error) {
    console.error('북마크 개수 조회 오류:', error);
    return 0;
  }
}

export async function isBookmarked(
  postId: string,
  userId: string,
  sessionTokens?: SessionTokens
): Promise<boolean> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false;
      if (process.env.NODE_ENV === 'development') {
        console.warn('북마크 확인 경고:', error.message);
      }
      return false;
    }

    return !!data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('북마크 확인 예외:', error instanceof Error ? error.message : error);
    }
    return false;
  }
}

export async function toggleBookmark(
  postId: string,
  userId: string,
  sessionTokens?: SessionTokens
): Promise<boolean> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

    const { data: existing, error: checkError } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('북마크 상태 확인 오류:', checkError);
      throw checkError;
    }

    if (existing) {
      const { error: deleteError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      if (deleteError) {
        console.error('북마크 삭제 오류:', deleteError);
        throw deleteError;
      }
      return false;
    }

    const { error: insertError } = await supabase
      .from('bookmarks')
      .insert({
        post_id: postId,
        user_id: userId
      });
    if (insertError) {
      console.error('북마크 추가 오류:', insertError);
      throw insertError;
    }
    return true;
  } catch (error) {
    console.error('북마크 토글 오류:', error);
    throw error;
  }
}
