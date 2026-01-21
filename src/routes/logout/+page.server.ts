import { redirect } from '@sveltejs/kit';
import { clearSessionCookies } from '$lib/server/supabase/auth';

export const load = async ({ cookies }) => {
  clearSessionCookies(cookies);
  
  // 쿼리 파라미터를 추가해서 클라이언트에서 데이터 갱신 트리거
  throw redirect(303, '/?logout=1');
};

