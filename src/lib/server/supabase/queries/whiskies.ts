import { createSupabaseClient } from '../client.js';
import type { Whisky, WhiskyRow } from '../types.js';

function mapRowToWhisky(row: WhiskyRow): Whisky {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? null,
    type: row.type ?? null,
    region: row.region ?? null,
    age: row.age ?? null,
    abv: row.abv ?? null,
    createdAt: row.created_at
  };
}

export async function listWhiskies(limit?: number): Promise<Whisky[]> {
  try {
    const supabase = createSupabaseClient();
    let query = supabase
      .from('whiskies')
      .select('*')
      .order('name', { ascending: true });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('위스키 목록 조회 오류:', error);
      return [];
    }
    return (data ?? []).map(mapRowToWhisky);
  } catch (error) {
    console.error('위스키 목록 조회 오류:', error);
    return [];
  }
}

export async function getWhiskyById(id: string): Promise<Whisky | null> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('whiskies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('위스키 조회 오류:', error);
      return null;
    }
    if (!data) return null;
    return mapRowToWhisky(data);
  } catch (error) {
    console.error('위스키 조회 오류:', error);
    return null;
  }
}
