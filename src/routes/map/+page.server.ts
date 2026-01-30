import { listCorkagePlaces } from '$lib/server/supabase/queries/corkage';

export async function load() {
  try {
    const places = await listCorkagePlaces();
    return {
      places
    };
  } catch (error) {
    console.error('콜키지 장소 로드 오류:', error);
    // DB 오류 시 빈 배열 반환
    return {
      places: []
    };
  }
}
