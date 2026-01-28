import { createSupabaseClient } from '../client.js';
import type { PostTasting, PostTastingRow } from '../types.js';

function mapRowToPostTasting(row: PostTastingRow): PostTasting {
  return {
    postId: row.post_id,
    color: row.color_100 / 100,
    nose: row.nose_score_x2 / 2,
    palate: row.palate_score_x2 / 2,
    finish: row.finish_score_x2 / 2,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getPostTasting(postId: string): Promise<PostTasting | null> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('post_tasting')
      .select('post_id,color_100,nose_score_x2,palate_score_x2,finish_score_x2,created_at,updated_at')
      .eq('post_id', postId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('포스트 테이스팅 조회 오류:', error);
      return null;
    }

    if (!data) return null;
    return mapRowToPostTasting(data as PostTastingRow);
  } catch (error) {
    console.error('포스트 테이스팅 조회 오류:', error);
    return null;
  }
}
