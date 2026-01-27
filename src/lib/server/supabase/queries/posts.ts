import { createSupabaseClient, createSupabaseClientForSession } from '../client.js';
import type { Post, PostRow } from '../types.js';
import type { SessionTokens } from '../auth.js';
import crypto from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import { deletePostImages } from './storage.js';
import { env } from '$env/dynamic/private';

const DEFAULT_AUTHOR_NAME = '익명의 위스키 러버';
export const POST_PUBLIC_COLUMNS =
  'id,title,content,author_name,user_id,is_anonymous,whisky_id,thumbnail_url,tags,created_at,view_count';

type AnonSignatureOperation = 'read_hash' | 'anon_update' | 'anon_delete';

function getAnonPostSecret(): string {
  const secret = env.ANON_POST_SECRET;
  if (!secret || secret === 'CHANGE_ME') {
    throw new Error('ANON_POST_SECRET 환경 변수가 필요합니다.');
  }
  return secret;
}

function signAnonPostOperation(postId: string, operation: AnonSignatureOperation): string {
  const secret = getAnonPostSecret();
  return crypto.createHmac('sha256', secret).update(`${postId}:${operation}`).digest('hex');
}

function signAnonConversion(oldUserId: string, newUserId: string): string {
  const secret = getAnonPostSecret();
  const payload = `${oldUserId}:${newUserId}:convert_anon_posts`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function normalizeAuthorName(author?: string) {
  const trimmed = author?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_AUTHOR_NAME;
}

function normalizeTags(tags?: string[]) {
  if (!tags || tags.length === 0) return [];
  const unique = new Set(
    tags
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
  );
  return Array.from(unique).slice(0, 10);
}

/**
 * 비밀번호 해시 생성 (서버 전용)
 * - 저장 포맷: scrypt$N$r$p$saltBase64$hashBase64
 */
function hashEditPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const N = 16384;
  const r = 8;
  const p = 1;
  const keyLen = 64;
  const hash = crypto.scryptSync(password, salt, keyLen, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyEditPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');

  const actual = crypto.scryptSync(password, salt, expected.length, { N, r, p });
  return crypto.timingSafeEqual(actual, expected);
}

/**
 * 게시글 본문 HTML을 안전하게 정리 (XSS 방지)
 * - TipTap이 생성하는 태그/속성만 allowlist로 허용
 * - 링크 스킴 제한 + rel 강제
 * - text-align 스타일만 제한적으로 허용
 */
export function sanitizePostHtml(html: string): string {
  const input = html ?? '';

  return sanitizeHtml(input, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'blockquote',
      'ul',
      'ol',
      'li',
      'code',
      'pre',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'a',
      'mark',
      'span',
      'div',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'img'
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      p: ['style'],
      h1: ['style'],
      h2: ['style'],
      h3: ['style'],
      h4: ['style'],
      h5: ['style'],
      h6: ['style'],
      div: ['style'],
      span: ['style'],
      table: ['style'],
      img: ['src', 'alt', 'title', 'width', 'height', 'class']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    allowedStyles: {
      '*': {
        'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/]
      }
    },
    transformTags: {
      a: (tagName: string, attribs: Record<string, string>) => {
        // rel/target 강제 (새 탭 열기 기본)
        const next = { ...attribs };
        if (!next.target) next.target = '_blank';
        next.rel = 'noopener noreferrer';
        
        // URL 정규화: http:// 또는 https://로 시작하지 않으면 절대 URL로 변환
        if (next.href) {
          const href = next.href.trim();
          // 상대 경로나 프로토콜 없는 URL인 경우
          if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:')) {
            // 이미 상대 경로인 경우 그대로 유지 (내부 링크)
            // 하지만 www.google.com 같은 경우는 https://를 추가
            if (href.includes('.') && !href.startsWith('/') && !href.startsWith('./') && !href.startsWith('../')) {
              next.href = `https://${href}`;
            }
          }
        }
        
        return { tagName, attribs: next };
      }
    }
  });
}

/**
 * Supabase row를 Post 타입으로 변환
 */
export function mapRowToPost(row: PostRow): Post {
  const createdAt = new Date(row.created_at);
  const dateStr = createdAt.toISOString().split('T')[0]; // YYYY-MM-DD

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    author: row.author_name || DEFAULT_AUTHOR_NAME,
    createdAt: dateStr,
    userId: row.user_id ?? null,
    isAnonymous: row.is_anonymous ?? false,
    whiskyId: row.whisky_id ?? null,
    thumbnailUrl: row.thumbnail_url ?? null,
    tags: row.tags ?? [],
    // 선택적 필드들 안전하게 처리
    likes: row.like_count ?? undefined,
    views: row.view_count ?? 0,
  };
}

/**
 * 게시글 목록 조회 (최신순)
 */
export async function listPosts(limit?: number, offset?: number): Promise<Post[]> {
  try {
    const supabase = createSupabaseClient();
    const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : undefined;
    const safeOffset = typeof offset === 'number' && offset >= 0 ? Math.min(offset, 10000) : 0;
    
    let query = supabase
      .from('posts')
      .select(POST_PUBLIC_COLUMNS)
      .order('created_at', { ascending: false });

    if (safeLimit && safeOffset >= 0) {
      query = query.range(safeOffset, safeOffset + safeLimit - 1);
    } else if (safeLimit) {
      query = query.limit(safeLimit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('게시글 목록 조회 오류:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(mapRowToPost);
  } catch (error) {
    console.error('게시글 목록 조회 오류:', error);
    // 에러 발생 시 빈 배열 반환 (UI가 깨지지 않도록)
    return [];
  }
}

/**
 * 태그로 게시글 목록 조회
 */
export async function listPostsByTag(
  tag: string,
  limit?: number,
  offset?: number,
  filters?: PostSearchFilters
): Promise<Post[]> {
  try {
    const trimmed = tag.trim();
    if (!trimmed) return [];

    const supabase = createSupabaseClient();
    const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : undefined;
    const safeOffset = typeof offset === 'number' && offset >= 0 ? Math.min(offset, 10000) : 0;
    let query = supabase
      .from('posts')
      .select(POST_PUBLIC_COLUMNS)
      .contains('tags', [trimmed]);

    query = applyPostFilters(query, filters);
    query = applyPostSort(query, filters?.sort);

    if (safeLimit && safeOffset >= 0) {
      query = query.range(safeOffset, safeOffset + safeLimit - 1);
    } else if (safeLimit) {
      query = query.limit(safeLimit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('태그 게시글 조회 오류:', error);
      throw error;
    }
    if (!data || data.length === 0) return [];
    return data.map(mapRowToPost);
  } catch (error) {
    console.error('태그 게시글 조회 오류:', error);
    return [];
  }
}

export async function getPostCountByTag(tag: string, filters?: PostSearchFilters): Promise<number> {
  try {
    const trimmed = tag.trim();
    if (!trimmed) return 0;

    const supabase = createSupabaseClient();
    let query = supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .contains('tags', [trimmed]);

    query = applyPostFilters(query, filters);
    const { count, error } = await query;

    if (error) {
      console.error('태그 게시글 개수 조회 오류:', error);
      return 0;
    }
    return count ?? 0;
  } catch (error) {
    console.error('태그 게시글 개수 조회 오류:', error);
    return 0;
  }
}

/**
 * 게시글 전체 개수 조회
 */
export async function getPostCount(): Promise<number> {
  try {
    const supabase = createSupabaseClient();
    const { count, error } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('게시글 개수 조회 오류:', error);
      return 0;
    }
    return count ?? 0;
  } catch (error) {
    console.error('게시글 개수 조회 오류:', error);
    return 0;
  }
}

export type PostSearchSort = 'newest' | 'oldest' | 'views';
export type PostSearchFilters = {
  author?: string;
  from?: string;
  to?: string;
  sort?: PostSearchSort;
};

function applyPostFilters(query: any, filters?: PostSearchFilters) {
  if (!filters) return query;
  const author = filters.author?.trim();
  if (author) {
    query = query.ilike('author_name', `%${author}%`);
  }
  if (filters.from) {
    query = query.gte('created_at', filters.from);
  }
  if (filters.to) {
    query = query.lte('created_at', filters.to);
  }
  return query;
}

function applyPostSort(query: any, sort?: PostSearchSort) {
  const sortKey = sort || 'newest';
  if (sortKey === 'oldest') {
    return query.order('created_at', { ascending: true });
  }
  if (sortKey === 'views') {
    return query.order('view_count', { ascending: false }).order('created_at', { ascending: false });
  }
  return query.order('created_at', { ascending: false });
}

/**
 * 게시글 검색 (제목/내용)
 */
export async function searchPosts(
  queryText: string,
  input?: { limit?: number; offset?: number; filters?: PostSearchFilters }
): Promise<Post[]> {
  try {
    const q = queryText.trim();
    if (!q) return [];

    const supabase = createSupabaseClient();
    const filters = input?.filters;
    const limit = input?.limit && input.limit > 0 ? Math.min(input.limit, 100) : 12;
    const offset = input?.offset && input.offset > 0 ? Math.min(input.offset, 10000) : 0;
    const sort = filters?.sort || 'newest';
    const author = filters?.author?.trim() || null;
    const from = filters?.from || null;
    const to = filters?.to || null;

    const { data, error } = await supabase.rpc('search_posts', {
      p_query: q,
      p_author: author,
      p_from: from,
      p_to: to,
      p_sort: sort,
      p_limit: limit,
      p_offset: offset
    });
    if (error) {
      console.error('게시글 검색 오류:', error);
      throw error;
    }
    if (!data || data.length === 0) return [];
    return data.map(mapRowToPost);
  } catch (error) {
    console.error('게시글 검색 오류:', error);
    return [];
  }
}

export async function getSearchPostCount(queryText: string, filters?: PostSearchFilters): Promise<number> {
  try {
    const q = queryText.trim();
    if (!q) return 0;

    const supabase = createSupabaseClient();
    const author = filters?.author?.trim() || null;
    const from = filters?.from || null;
    const to = filters?.to || null;

    const { data, error } = await supabase.rpc('search_posts_count', {
      p_query: q,
      p_author: author,
      p_from: from,
      p_to: to
    });

    if (error) {
      console.error('검색 개수 조회 오류:', error);
      return 0;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (typeof row === 'number') return row;
    if (row && typeof row === 'object' && 'search_posts_count' in row) {
      const value = (row as { search_posts_count?: unknown }).search_posts_count;
      return typeof value === 'number' ? value : 0;
    }
    return 0;
  } catch (error) {
    console.error('검색 개수 조회 오류:', error);
    return 0;
  }
}

/**
 * ID로 게시글 조회
 */
export async function getPostById(id: string): Promise<Post | null> {
  try {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from('posts')
      .select(POST_PUBLIC_COLUMNS)
      .eq('id', id)
      .single();

    if (error) {
      // 404 에러는 null 반환
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('게시글 조회 오류:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapRowToPost(data);
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    return null;
  }
}

/**
 * 게시글 조회수 증가 (RLS 우회 함수 사용)
 */
export async function incrementPostView(postId: string): Promise<number | null> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.rpc('increment_post_view', { p_post_id: postId });
    if (error) {
      console.error('조회수 증가 오류:', error);
      return null;
    }
    return typeof data === 'number' ? data : null;
  } catch (error) {
    console.error('조회수 증가 오류:', error);
    return null;
  }
}

/**
 * 게시글 생성
 * @param input 게시글 입력 데이터
 * @param accessToken 세션 토큰 (RLS 정책 적용을 위해 필요)
 */
export async function createPost(
  input: {
    title: string;
    content: string;
    author_name?: string;
    edit_password?: string;
    user_id?: string | null;
    whisky_id?: string | null;
    thumbnail_url?: string | null;
    tags?: string[];
  },
  accessToken?: string
): Promise<Post> {
  try {
    // 세션 토큰이 있으면 사용, 없으면 기본 클라이언트 사용
    const supabase = createSupabaseClientForSession(
      accessToken ? { accessToken, refreshToken: '' } : null
    );

    // edit_password가 있으면 익명 글, 없으면 로그인 글
    const isAnonymous = !!input.edit_password;
    const needsPassword = isAnonymous;

    if (needsPassword) {
      if (!input.edit_password || input.edit_password.length < 4) {
        throw new Error('비밀번호는 4자 이상으로 설정해주세요.');
      }
    }

    const editPasswordHash =
      needsPassword && input.edit_password ? hashEditPassword(input.edit_password) : null;

    const safeContent = sanitizePostHtml(input.content);

    const { data, error } = await supabase
      .from('posts')
      .insert({
        title: input.title,
        content: safeContent,
        author_name: normalizeAuthorName(input.author_name),
        edit_password_hash: editPasswordHash,
        user_id: input.user_id ?? null,
        is_anonymous: isAnonymous,
        whisky_id: input.whisky_id ?? null,
        thumbnail_url: input.thumbnail_url ?? null,
        tags: normalizeTags(input.tags)
      })
      .select(POST_PUBLIC_COLUMNS)
      .single();

    if (error) {
      console.error('게시글 생성 오류:', error);
      throw error;
    }

    if (!data) {
      throw new Error('게시글 생성 후 데이터를 받아오지 못했습니다.');
    }

    return mapRowToPost(data);
  } catch (error) {
    console.error('게시글 생성 오류:', error);
    throw error;
  }
}

/**
 * 로그인 사용자의 게시글 목록 조회
 */
export async function getMyPosts(
  userId: string,
  limit?: number,
  offset?: number,
  sessionTokens?: SessionTokens | null
): Promise<Post[]> {
  try {
    const supabase = createSupabaseClientForSession(sessionTokens);

    let query = supabase
      .from('posts')
      .select(POST_PUBLIC_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (typeof offset === 'number' && offset >= 0 && limit && limit > 0) {
      query = query.range(offset, offset + limit - 1);
    } else if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('내 게시글 목록 조회 오류:', error);
      throw error;
    }

    if (!data || data.length === 0) return [];
    return data.map(mapRowToPost);
  } catch (error) {
    console.error('내 게시글 목록 조회 오류:', error);
    return [];
  }
}

export async function getMyPostCount(userId: string, sessionTokens?: SessionTokens | null): Promise<number> {
  try {
    const supabase = createSupabaseClientForSession(sessionTokens);
    const { count, error } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('내 게시글 개수 조회 오류:', error);
      return 0;
    }
    return count ?? 0;
  } catch (error) {
    console.error('내 게시글 개수 조회 오류:', error);
    return 0;
  }
}

/**
 * 게시글 수정
 * 
 * 보안 정책:
 * - 익명 글(is_anonymous = true): user_id와 무관하게 비밀번호로만 수정 가능
 *   (토큰 만료 시 user_id가 바뀔 수 있으므로 user_id 기반 권한 검사 불가)
 * - 로그인 글(is_anonymous = false): 작성자(user_id)만 수정 가능 (비밀번호 불필요)
 */
export async function updatePost(
  id: string,
  input: {
    title?: string;
    content?: string;
    author_name?: string;
    whisky_id?: string | null;
    thumbnail_url?: string | null;
    tags?: string[];
  },
  auth: { editPassword?: string; userId?: string | null },
  sessionTokens?: SessionTokens // Optional session tokens for RLS
): Promise<Post> {
  try {
    const supabase = createSupabaseClientForSession(sessionTokens);

    // 소유권/익명 여부 확인용 최소 정보만 조회 (비밀번호 해시는 RPC로 조회)
    const { data: authRow, error: authError } = await supabase
      .from('posts')
      .select('id, user_id, is_anonymous')
      .eq('id', id)
      .single();

    if (authError) {
      if (authError.code === 'PGRST116') {
        throw new Error('게시글을 찾을 수 없습니다.');
      }
      console.error('게시글 수정(비밀번호 조회) 오류:', authError);
      throw authError;
    }

    if (!authRow) {
      throw new Error('게시글을 찾을 수 없습니다.');
    }

    // 익명 글 판단: is_anonymous 컬럼 사용
    const isAnonymousPost = authRow.is_anonymous ?? false;
    
    // 업데이트할 필드만 구성
    const updateData: Partial<PostRow> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = sanitizePostHtml(input.content);
    if (input.author_name !== undefined) updateData.author_name = normalizeAuthorName(input.author_name);
    if (input.whisky_id !== undefined) updateData.whisky_id = input.whisky_id;
    if (input.thumbnail_url !== undefined) updateData.thumbnail_url = input.thumbnail_url;
    if (input.tags !== undefined) updateData.tags = normalizeTags(input.tags);

    if (isAnonymousPost) {
      // 익명 글: RLS에서 막고, 서버 서명 + RPC 경로로만 수정 허용
      if (!auth.editPassword) {
        throw new Error('비밀번호를 입력해주세요.');
      }

      // 서버 서명으로 해시 조회 (직접 select 불가)
      const readHashSignature = signAnonPostOperation(id, 'read_hash');
      const { data: hashData, error: hashError } = await supabase.rpc('get_anonymous_post_hash', {
        p_post_id: id,
        p_signature: readHashSignature
      });

      if (hashError) {
        console.error('익명 게시글 해시 조회 오류:', hashError);
        throw new Error('익명 게시글 인증 중 오류가 발생했습니다.');
      }

      const hashRow = Array.isArray(hashData) ? hashData[0] : hashData;
      const storedHash = hashRow?.edit_password_hash ?? null;
      if (!storedHash) {
        throw new Error('이 게시글은 비밀번호로 수정할 수 없습니다.');
      }

      const ok = verifyEditPassword(auth.editPassword, storedHash);
      if (!ok) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }

      const updateSignature = signAnonPostOperation(id, 'anon_update');
      const { data: rpcData, error: rpcError } = await supabase.rpc('update_anonymous_post', {
        p_post_id: id,
        p_signature: updateSignature,
        p_title: updateData.title ?? null,
        p_content: updateData.content ?? null,
        p_author_name: updateData.author_name ?? null,
        p_whisky_id: updateData.whisky_id ?? null,
        p_thumbnail_url: updateData.thumbnail_url ?? null,
        p_tags: updateData.tags ?? null
      });

      if (rpcError) {
        console.error('익명 게시글 수정 RPC 오류:', rpcError);
        throw rpcError;
      }

      const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (!rpcRow) {
        throw new Error('게시글 수정 후 데이터를 받아오지 못했습니다.');
      }

      return mapRowToPost(rpcRow as PostRow);
    }

    // 로그인 글: user_id로 소유권 검증 (비밀번호 불필요)
    if (!authRow.user_id) {
      throw new Error('이 게시글은 수정할 수 없습니다.');
    }
    if (!auth.userId) {
      throw new Error('로그인이 필요합니다.');
    }
    if (auth.userId !== authRow.user_id) {
      throw new Error('본인의 게시글만 수정할 수 있습니다.');
    }

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select(POST_PUBLIC_COLUMNS)
      .single();

    if (error) {
      // 404 에러는 null 반환
      if (error.code === 'PGRST116') {
        throw new Error('게시글을 찾을 수 없습니다.');
      }
      console.error('게시글 수정 오류:', error);
      throw error;
    }

    if (!data) {
      throw new Error('게시글 수정 후 데이터를 받아오지 못했습니다.');
    }

    return mapRowToPost(data);
  } catch (error) {
    console.error('게시글 수정 오류:', error);
    throw error;
  }
}

/**
 * 게시글 삭제
 * 
 * 보안 정책:
 * - 익명 글(is_anonymous = true): user_id와 무관하게 비밀번호로만 삭제 가능
 *   (토큰 만료 시 user_id가 바뀔 수 있으므로 user_id 기반 권한 검사 불가)
 * - 로그인 글(is_anonymous = false): 작성자(user_id)만 삭제 가능 (비밀번호 불필요)
 */
export async function deletePost(
  id: string,
  auth: { editPassword?: string; userId?: string | null },
  sessionTokens?: SessionTokens // Optional session tokens for RLS
): Promise<void> {
  try {
    const supabase = createSupabaseClientForSession(sessionTokens);

    // 삭제 가능 여부 판단용 최소 정보만 조회 (비밀번호 해시는 RPC로 조회)
    const { data: authRow, error: authError } = await supabase
      .from('posts')
      .select('id, user_id, is_anonymous')
      .eq('id', id)
      .single();

    if (authError) {
      if (authError.code === 'PGRST116') {
        throw new Error('게시글을 찾을 수 없습니다.');
      }
      console.error('게시글 삭제(비밀번호 조회) 오류:', authError);
      throw authError;
    }

    if (!authRow) {
      throw new Error('게시글을 찾을 수 없습니다.');
    }

    // 익명 글 판단: is_anonymous 컬럼 사용
    const isAnonymousPost = authRow.is_anonymous ?? false;
    
    if (isAnonymousPost) {
      if (!auth.editPassword) {
        throw new Error('비밀번호를 입력해주세요.');
      }

      const readHashSignature = signAnonPostOperation(id, 'read_hash');
      const { data: hashData, error: hashError } = await supabase.rpc('get_anonymous_post_hash', {
        p_post_id: id,
        p_signature: readHashSignature
      });

      if (hashError) {
        console.error('익명 게시글 해시 조회 오류:', hashError);
        throw new Error('익명 게시글 인증 중 오류가 발생했습니다.');
      }

      const hashRow = Array.isArray(hashData) ? hashData[0] : hashData;
      const storedHash = hashRow?.edit_password_hash ?? null;
      if (!storedHash) {
        throw new Error('이 게시글은 비밀번호로 삭제할 수 없습니다.');
      }

      const ok = verifyEditPassword(auth.editPassword, storedHash);
      if (!ok) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }
    } else {
      // 로그인 글: user_id로 소유권 검증 (비밀번호 불필요)
      if (!authRow.user_id) {
        throw new Error('이 게시글은 삭제할 수 없습니다.');
      }
      if (!auth.userId) {
        throw new Error('로그인이 필요합니다.');
      }
      if (auth.userId !== authRow.user_id) {
        throw new Error('본인의 게시글만 삭제할 수 있습니다.');
      }
    }

    // 게시글 삭제 전에 이미지 폴더 삭제
    const userId = authRow.user_id;
    if (userId) {
      const imageFolderPath = `posts/${userId}/${id}`;
      try {
        await deletePostImages(imageFolderPath, sessionTokens);
      } catch (imageError) {
        // 이미지 삭제 실패해도 게시글 삭제는 진행 (로그만 기록)
        console.warn(`게시글 이미지 삭제 실패 (postId: ${id}), 게시글은 삭제됩니다.`, imageError);
      }
    }

    if (isAnonymousPost) {
      const deleteSignature = signAnonPostOperation(id, 'anon_delete');
      const { error: rpcError } = await supabase.rpc('delete_anonymous_post', {
        p_post_id: id,
        p_signature: deleteSignature
      });

      if (rpcError) {
        console.error('익명 게시글 삭제 RPC 오류:', rpcError);
        throw rpcError;
      }
      return;
    }

    const { error } = await supabase.from('posts').delete().eq('id', id);

    if (error) {
      console.error('게시글 삭제 오류:', error);
      throw error;
    }
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    throw error;
  }
}

/**
 * 사용자의 모든 익명 글을 회원 글로 전환
 * 회원가입 시 기존 익명 글의 is_anonymous를 false로 변경하고 user_id를 업데이트
 */
export async function convertAnonymousPostsToUserPosts(
  oldUserId: string,
  newUserId: string,
  sessionTokens?: SessionTokens
): Promise<number> {
  try {
    const supabase = createSupabaseClientForSession(sessionTokens);

    // 먼저 업데이트할 글들을 조회 (디버깅용)
    const { data: postsToUpdate, error: selectError } = await supabase
      .from('posts')
      .select('id, user_id, is_anonymous')
      .eq('user_id', oldUserId)
      .eq('is_anonymous', true);

    if (selectError) {
      console.error('익명 글 조회 오류:', selectError);
      throw selectError;
    }

    if (!postsToUpdate || postsToUpdate.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.info('전환할 익명 글이 없습니다.', { oldUserId, newUserId });
      }
      return 0;
    }

    if (process.env.NODE_ENV === 'development') {
      console.info(`익명 글 전환 시도: ${postsToUpdate.length}개`, { oldUserId, newUserId });
    }

    // 익명 글 업데이트는 RLS에서 막고, 서버 서명 + RPC 경로로만 허용
    const conversionSignature = signAnonConversion(oldUserId, newUserId);
    const { data, error } = await supabase.rpc('convert_anonymous_posts', {
      p_old_user_id: oldUserId,
      p_new_user_id: newUserId,
      p_signature: conversionSignature
    });

    if (error) {
      console.error('익명 글 전환 오류:', error);
      console.error('에러 상세:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    const updatedRows = Array.isArray(data) ? data : data ? [data] : [];
    const updatedCount = updatedRows.length;
    if (process.env.NODE_ENV === 'development') {
      console.info(`익명 글 전환 완료: ${updatedCount}개 업데이트됨`);
    }
    
    if (updatedCount !== postsToUpdate.length) {
      console.warn(
        `경고: 조회된 글(${postsToUpdate.length}개)과 업데이트된 글(${updatedCount}개)의 개수가 다릅니다.`
      );
    }

    return updatedCount;
  } catch (error) {
    console.error('익명 글 전환 오류:', error);
    throw error;
  }
}
