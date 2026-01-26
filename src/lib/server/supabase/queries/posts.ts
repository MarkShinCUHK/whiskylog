import { createSupabaseClient, createSupabaseClientWithSession } from '../client.js';
import type { Post, PostRow } from '../types.js';
import type { SessionTokens } from '../auth.js';
import crypto from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import { deletePostImages } from './storage.js';

const DEFAULT_AUTHOR_NAME = '익명의 위스키 러버';

function normalizeAuthorName(author?: string) {
  const trimmed = author?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_AUTHOR_NAME;
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
    
    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (typeof offset === 'number' && offset >= 0 && limit && limit > 0) {
      query = query.range(offset, offset + limit - 1);
    } else if (limit && limit > 0) {
      query = query.limit(limit);
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
 * 게시글 전체 개수 조회
 */
export async function getPostCount(): Promise<number> {
  try {
    const supabase = createSupabaseClient();
    const { count, error } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

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

/**
 * 게시글 검색 (제목/내용)
 */
export async function searchPosts(
  queryText: string,
  input?: { limit?: number; offset?: number }
): Promise<Post[]> {
  try {
    const q = queryText.trim();
    if (!q) return [];

    const supabase = createSupabaseClient();
    let query = supabase
      .from('posts')
      .select('*')
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .order('created_at', { ascending: false });

    if (input?.offset && input.offset > 0) {
      query = query.range(input.offset, input.offset + (input.limit ?? 12) - 1);
    } else if (input?.limit && input.limit > 0) {
      query = query.limit(input.limit);
    }

    const { data, error } = await query;
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

export async function getSearchPostCount(queryText: string): Promise<number> {
  try {
    const q = queryText.trim();
    if (!q) return 0;

    const supabase = createSupabaseClient();
    const { count, error } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`);

    if (error) {
      console.error('검색 개수 조회 오류:', error);
      return 0;
    }
    return count ?? 0;
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
      .select('*')
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
  },
  accessToken?: string
): Promise<Post> {
  try {
    // 세션 토큰이 있으면 사용, 없으면 기본 클라이언트 사용
    const supabase = accessToken
      ? createSupabaseClientWithSession({ accessToken, refreshToken: '' })
      : createSupabaseClient();

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
        is_anonymous: isAnonymous
      })
      .select()
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
export async function getMyPosts(userId: string, limit?: number, offset?: number): Promise<Post[]> {
  try {
    const supabase = createSupabaseClient();

    let query = supabase
      .from('posts')
      .select('*')
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

export async function getMyPostCount(userId: string): Promise<number> {
  try {
    const supabase = createSupabaseClient();
    const { count, error } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
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
  },
  auth: { editPassword?: string; userId?: string | null },
  sessionTokens?: SessionTokens // Optional session tokens for RLS
): Promise<Post> {
  try {
    const supabase = sessionTokens ? createSupabaseClientWithSession(sessionTokens) : createSupabaseClient();

    // 소유/비밀번호 검증을 위해 authRow 조회
    const { data: authRow, error: authError } = await supabase
      .from('posts')
      .select('id, edit_password_hash, user_id, is_anonymous')
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
    
    if (isAnonymousPost) {
      // 익명 글: user_id와 무관하게 비밀번호로만 수정 가능
      if (!auth.editPassword) {
        throw new Error('비밀번호를 입력해주세요.');
      }

      if (!authRow.edit_password_hash) {
        throw new Error('이 게시글은 비밀번호로 수정할 수 없습니다.');
      }

      // 비밀번호 검증 (timing-safe 비교)
      const ok = verifyEditPassword(auth.editPassword, authRow.edit_password_hash);
      if (!ok) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }
    } else {
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
    }

    // 업데이트할 필드만 구성
    const updateData: Partial<PostRow> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = sanitizePostHtml(input.content);
    if (input.author_name !== undefined) updateData.author_name = normalizeAuthorName(input.author_name);

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select()
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
    const supabase = sessionTokens ? createSupabaseClientWithSession(sessionTokens) : createSupabaseClient();

    // 비밀번호 검증을 위해 해시 조회
    // (delete는 반환 row가 없을 수 있으므로 먼저 select)
    const { data: authRow, error: authError } = await supabase
      .from('posts')
      .select('id, edit_password_hash, user_id, is_anonymous')
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
      // 익명 글: user_id와 무관하게 비밀번호로만 삭제 가능
      if (!auth.editPassword) {
        throw new Error('비밀번호를 입력해주세요.');
      }

      if (!authRow.edit_password_hash) {
        throw new Error('이 게시글은 비밀번호로 삭제할 수 없습니다.');
      }

      // 비밀번호 검증 (timing-safe 비교)
      const ok = verifyEditPassword(auth.editPassword, authRow.edit_password_hash);
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

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

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
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

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
      console.log('전환할 익명 글이 없습니다.', { oldUserId, newUserId });
      return 0;
    }

    console.log(`익명 글 전환 시도: ${postsToUpdate.length}개`, { oldUserId, newUserId });

    // 익명 글 업데이트
    // RLS 정책: 익명 글(user_id IS NULL 또는 is_anonymous = true)은 업데이트 가능해야 함
    const { data, error } = await supabase
      .from('posts')
      .update({ 
        is_anonymous: false,
        user_id: newUserId
      })
      .eq('user_id', oldUserId)
      .eq('is_anonymous', true)
      .select('id');

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

    const updatedCount = data?.length ?? 0;
    console.log(`익명 글 전환 완료: ${updatedCount}개 업데이트됨`);
    
    if (updatedCount !== postsToUpdate.length) {
      console.warn(`경고: 조회된 글(${postsToUpdate.length}개)과 업데이트된 글(${updatedCount}개)의 개수가 다릅니다.`);
    }

    return updatedCount;
  } catch (error) {
    console.error('익명 글 전환 오류:', error);
    throw error;
  }
}
