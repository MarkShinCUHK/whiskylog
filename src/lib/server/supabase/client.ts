import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Supabase 클라이언트 생성 (서버 전용)
 * 
 * 주의사항:
 * - 이 파일은 서버에서만 사용됩니다 (SvelteKit의 server 디렉토리 규칙)
 * - PUBLIC_ 접두사가 붙은 환경 변수는 클라이언트에 노출되지만,
 *   ANON_KEY는 읽기/쓰기 권한이 RLS로 제어되므로 안전합니다
 * - Service Role Key는 절대 사용하지 마세요 (클라이언트 노출 금지)
 */
if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase 환경 변수가 없습니다. .env 파일에 PUBLIC_SUPABASE_URL과 PUBLIC_SUPABASE_ANON_KEY를 설정해주세요.'
  );
}

/**
 * 기본 Supabase 클라이언트 생성 (ANON_KEY 사용)
 * RLS 정책이 적용되므로 익명 사용자도 인증된 사용자로 처리 가능
 */
export function createSupabaseClient() {
  return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * 세션 토큰을 사용하는 Supabase 클라이언트 생성
 * RLS 정책에서 auth.uid()를 사용할 수 있도록 함
 */
export function createSupabaseClientWithSession(sessionTokens: { accessToken: string; refreshToken?: string }) {
  return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${sessionTokens.accessToken}`
      }
    },
    auth: {
      persistSession: false // 세션은 쿠키로 관리됨
    }
  });
}
