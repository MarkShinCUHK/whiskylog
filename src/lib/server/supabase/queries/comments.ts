import { createSupabaseClient, createSupabaseClientWithSession } from '../client.js';
import type { Comment, CommentRow } from '../types.js';
import type { SessionTokens } from '../auth.js';

/**
 * Supabase row를 Comment 타입으로 변환
 */
function mapRowToComment(row: CommentRow): Comment {
  const createdAt = new Date(row.created_at);
  const updatedAt = new Date(row.updated_at);
  
  const formatDateTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    content: row.content,
    createdAt: formatDateTime(createdAt),
    updatedAt: formatDateTime(updatedAt)
  };
}

/**
 * 게시글의 댓글 목록 조회
 */
export async function listComments(postId: string, sessionTokens?: SessionTokens): Promise<Comment[]> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();
    
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('댓글 목록 조회 오류:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 댓글 목록 반환 (사용자 정보는 클라이언트에서 처리)
    return data.map(mapRowToComment);
  } catch (error) {
    console.error('댓글 목록 조회 오류:', error);
    return [];
  }
}

/**
 * 댓글 작성
 * 익명 사용자도 댓글 작성 가능 (익명 세션 필요)
 */
export async function createComment(
  postId: string,
  content: string,
  userId: string,
  sessionTokens?: SessionTokens
): Promise<Comment> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

    if (!content || content.trim().length === 0) {
      throw new Error('댓글 내용을 입력해주세요.');
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('댓글 작성 오류:', error);
      throw error;
    }

    if (!data) {
      throw new Error('댓글 작성 후 데이터를 받아오지 못했습니다.');
    }

    return mapRowToComment(data);
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    throw error;
  }
}

/**
 * 댓글 수정
 */
export async function updateComment(
  commentId: string,
  content: string,
  userId: string,
  sessionTokens?: SessionTokens
): Promise<Comment> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

    if (!content || content.trim().length === 0) {
      throw new Error('댓글 내용을 입력해주세요.');
    }

    // 본인 댓글인지 확인
    const { data: existingComment, error: checkError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (checkError || !existingComment) {
      throw new Error('댓글을 찾을 수 없습니다.');
    }

    if (existingComment.user_id !== userId) {
      throw new Error('본인의 댓글만 수정할 수 있습니다.');
    }

    const { data, error } = await supabase
      .from('comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error) {
      console.error('댓글 수정 오류:', error);
      throw error;
    }

    if (!data) {
      throw new Error('댓글 수정 후 데이터를 받아오지 못했습니다.');
    }

    return mapRowToComment(data);
  } catch (error) {
    console.error('댓글 수정 오류:', error);
    throw error;
  }
}

/**
 * 댓글 삭제
 */
export async function deleteComment(
  commentId: string,
  userId: string,
  sessionTokens?: SessionTokens
): Promise<void> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

    // 본인 댓글인지 확인
    const { data: existingComment, error: checkError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (checkError || !existingComment) {
      throw new Error('댓글을 찾을 수 없습니다.');
    }

    if (existingComment.user_id !== userId) {
      throw new Error('본인의 댓글만 삭제할 수 있습니다.');
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('댓글 삭제 오류:', error);
      throw error;
    }
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    throw error;
  }
}
