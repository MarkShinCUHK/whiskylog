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
  isAnonymous?: boolean;
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

/**
 * 익명 사용자 세션 생성 (Anonymous Auth)
 * 익명 사용자도 인증된 사용자로 처리하여 RLS 정책 적용 가능
 */
export async function createAnonymousSession(cookies: Cookies): Promise<SessionTokens | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signInAnonymously();
  
  if (error || !data.session) {
    console.error('익명 세션 생성 실패:', error);
    return null;
  }

  const tokens: SessionTokens = {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token
  };

  setSessionCookies(cookies, tokens);
  return tokens;
}

/**
 * 사용자 정보 가져오기 (익명 사용자 포함)
 * 익명 사용자는 email이 null이고 isAnonymous가 true
 */
export async function getUser(cookies: Cookies): Promise<AuthUser | null> {
  const session = getSession(cookies);
  if (!session) return null;

  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.getUser(session.accessToken);
  if (error || !data.user) return null;

  const nickname =
    typeof data.user.user_metadata?.nickname === 'string' ? data.user.user_metadata.nickname : null;
  
  // 익명 사용자 확인 (email이 null이고 is_anonymous가 true)
  const isAnonymous = data.user.is_anonymous ?? false;

  return { 
    id: data.user.id, 
    email: data.user.email ?? null, 
    nickname,
    isAnonymous
  };
}

/**
 * 로그인 사용자만 허용 (익명 사용자 제외)
 */
export async function requireAuth(cookies: Cookies) {
  const user = await getUser(cookies);
  if (!user || user.isAnonymous) {
    throw redirect(303, '/login');
  }
  return user;
}

/**
 * 사용자 또는 익명 사용자 가져오기 (세션이 없으면 익명 세션 생성)
 * 게시글 작성 등에서 익명 사용자도 인증된 사용자로 처리하기 위해 사용
 */
export async function getUserOrCreateAnonymous(cookies: Cookies): Promise<AuthUser> {
  let user = await getUser(cookies);
  
  // 세션이 없거나 만료된 경우 익명 세션 생성
  if (!user) {
    const tokens = await createAnonymousSession(cookies);
    if (!tokens) {
      throw new Error('익명 세션 생성에 실패했습니다.');
    }
    // 다시 사용자 정보 가져오기
    user = await getUser(cookies);
    if (!user) {
      throw new Error('익명 세션 생성 후 사용자 정보를 가져오는데 실패했습니다.');
    }
  }
  
  return user;
}

