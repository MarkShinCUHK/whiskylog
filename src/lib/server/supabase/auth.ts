import { redirect } from '@sveltejs/kit';
import { createSupabaseClient } from './client.js';
import type { Cookies } from '@sveltejs/kit';

const ACCESS_TOKEN_COOKIE = 'sb-access-token';
const REFRESH_TOKEN_COOKIE = 'sb-refresh-token';

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthUser = {
  id: string;
  email: string | null;
  nickname: string | null;
};

function cookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production'
  };
}

export function setSessionCookies(cookies: Cookies, tokens: SessionTokens) {
  cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, cookieOptions());
  cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, cookieOptions());
}

export function clearSessionCookies(cookies: Cookies) {
  cookies.delete(ACCESS_TOKEN_COOKIE, { path: '/' });
  cookies.delete(REFRESH_TOKEN_COOKIE, { path: '/' });
}

export function getSession(cookies: Cookies): SessionTokens | null {
  const accessToken = cookies.get(ACCESS_TOKEN_COOKIE);
  const refreshToken = cookies.get(REFRESH_TOKEN_COOKIE);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function getUser(cookies: Cookies): Promise<AuthUser | null> {
  const session = getSession(cookies);
  if (!session) return null;

  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.getUser(session.accessToken);
  if (error || !data.user) return null;

  const nickname =
    typeof data.user.user_metadata?.nickname === 'string' ? data.user.user_metadata.nickname : null;

  return { id: data.user.id, email: data.user.email ?? null, nickname };
}

export async function requireAuth(cookies: Cookies) {
  const user = await getUser(cookies);
  if (!user) {
    throw redirect(303, '/login');
  }
  return user;
}

