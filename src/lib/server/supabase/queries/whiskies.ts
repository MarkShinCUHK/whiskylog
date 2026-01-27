import { createSupabaseClient } from '../client.js';
import type { Whisky, WhiskyRow } from '../types.js';

const WHISKY_COLUMNS = 'id,name,brand,type,region,age,abv,created_at';

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
    const safeLimit = limit && limit > 0 ? Math.min(limit, 500) : undefined;
    let query = supabase
      .from('whiskies')
      .select(WHISKY_COLUMNS)
      .order('name', { ascending: true });

    if (safeLimit) {
      query = query.limit(safeLimit);
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
      .select(WHISKY_COLUMNS)
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
