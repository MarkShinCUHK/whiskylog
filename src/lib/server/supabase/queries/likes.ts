import { createSupabaseClient, createSupabaseClientWithSession } from '../client.js';
import type { SessionTokens } from '../auth.js';

/**
 * 게시글의 좋아요 개수 조회
 */
export async function getLikeCount(postId: string, sessionTokens?: SessionTokens): Promise<number> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();
    
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      console.error('좋아요 개수 조회 오류:', error);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error('좋아요 개수 조회 오류:', error);
    return 0;
  }
}

/**
 * 사용자가 게시글에 좋아요를 눌렀는지 확인
 */
export async function isLiked(postId: string, userId: string, sessionTokens?: SessionTokens): Promise<boolean> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();
    
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 레코드가 없으면 좋아요 안 함
        return false;
      }
      console.error('좋아요 확인 오류:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('좋아요 확인 오류:', error);
    return false;
  }
}

/**
 * 좋아요 토글 (추가/제거)
 * 익명 사용자도 좋아요 가능 (익명 세션 필요)
 */
export async function toggleLike(postId: string, userId: string, sessionTokens?: SessionTokens): Promise<boolean> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

    // 현재 좋아요 상태 확인
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('좋아요 상태 확인 오류:', checkError);
      throw checkError;
    }

    if (existingLike) {
      // 좋아요 제거
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('좋아요 제거 오류:', deleteError);
        throw deleteError;
      }

      return false; // 좋아요 해제됨
    } else {
      // 좋아요 추가
      const { error: insertError } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: userId
        });

      if (insertError) {
        console.error('좋아요 추가 오류:', insertError);
        throw insertError;
      }

      return true; // 좋아요 추가됨
    }
  } catch (error) {
    console.error('좋아요 토글 오류:', error);
    throw error;
  }
}
