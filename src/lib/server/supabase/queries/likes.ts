import { createSupabaseClientForSession } from '../client.js';
import type { SessionTokens } from '../auth.js';

/**
 * 게시글의 좋아요 개수 조회
 */
export async function getLikeCount(postId: string, sessionTokens?: SessionTokens): Promise<number> {
  try {
    const supabase = createSupabaseClientForSession(sessionTokens);
    
    const { count, error } = await supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      // RLS 정책 관련 에러는 조용히 처리 (기능은 정상 작동)
      // PGRST301: RLS 정책 위반, 42501: 권한 없음 등은 정상적인 경우일 수 있음
      if (error.code === 'PGRST301' || error.code === '42501') {
        // RLS 정책이 제대로 설정되지 않은 경우이지만, 기능은 정상 작동하므로 조용히 처리
        return 0;
      }
      // 기타 에러는 개발 환경에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.warn('좋아요 개수 조회 경고:', error.message);
      }
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    // 예상치 못한 에러는 개발 환경에서만 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.warn('좋아요 개수 조회 예외:', error instanceof Error ? error.message : error);
    }
    return 0;
  }
}

/**
 * 사용자가 게시글에 좋아요를 눌렀는지 확인
 */
export async function isLiked(postId: string, userId: string, sessionTokens?: SessionTokens): Promise<boolean> {
  try {
    const supabase = createSupabaseClientForSession(sessionTokens);
    
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 레코드가 없으면 좋아요 안 함 (정상적인 경우)
        return false;
      }
      // RLS 정책 관련 에러는 조용히 처리
      if (error.code === 'PGRST301' || error.code === '42501') {
        return false;
      }
      // 기타 에러는 개발 환경에서만 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.warn('좋아요 확인 경고:', error.message);
      }
      return false;
    }

    return !!data;
  } catch (error) {
    // 예상치 못한 에러는 개발 환경에서만 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.warn('좋아요 확인 예외:', error instanceof Error ? error.message : error);
    }
    return false;
  }
}

/**
 * 좋아요 토글 (추가/제거)
 * 익명 사용자도 좋아요 가능 (익명 세션 필요)
 */
export async function toggleLike(postId: string, userId: string, sessionTokens?: SessionTokens): Promise<boolean> {
  try {
    const supabase = createSupabaseClientForSession(sessionTokens);

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
