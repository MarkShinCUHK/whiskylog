import { createSupabaseClient } from '../client.js';

export type CorkagePlace = {
  id: string;
  name: string;
  address: string | null;
  corkage: string | null;
  bottle_limit: string | null;
  glass_support: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  last_checked: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * 모든 콜키지 장소 조회
 * 좌표가 있는 장소만 반환 (지도 표시용)
 */
export async function listCorkagePlaces(): Promise<CorkagePlace[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('corkage_places')
    .select('*')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .order('name', { ascending: true });

  if (error) {
    console.error('콜키지 장소 조회 오류:', error);
    throw error;
  }

  return (data || []) as CorkagePlace[];
}
