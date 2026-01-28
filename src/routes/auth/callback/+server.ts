import { redirect } from '@sveltejs/kit';
import { createSupabaseAuthClient } from '$lib/server/supabase/client';
import { setSessionCookies } from '$lib/server/supabase/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error_description') || url.searchParams.get('error');
  const next = url.searchParams.get('next') || '/my-posts';
  const safeNext = next.startsWith('/') ? next : '/my-posts';

  if (error) {
    throw redirect(303, `/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    throw redirect(303, `/login?error=${encodeURIComponent('로그인 인증 코드가 없습니다.')}`);
  }

  const supabase = createSupabaseAuthClient(cookies);
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.session) {
    throw redirect(303, `/login?error=${encodeURIComponent('구글 로그인에 실패했습니다.')}`);
  }

  setSessionCookies(cookies, {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token
  });

  throw redirect(303, safeNext);
};
