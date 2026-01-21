import { createSupabaseClient } from '../client.js';
import type { Post, PostRow } from '../types.js';
import crypto from 'node:crypto';

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

function verifyEditPassword(password: string, stored: string) {
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
 * Supabase row를 Post 타입으로 변환
 */
function mapRowToPost(row: PostRow): Post {
  const createdAt = new Date(row.created_at);
  const dateStr = createdAt.toISOString().split('T')[0]; // YYYY-MM-DD

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    author: row.author_name || DEFAULT_AUTHOR_NAME,
    createdAt: dateStr,
    // 선택적 필드들 안전하게 처리
    likes: row.like_count ?? undefined,
    views: undefined, // 현재 스키마에 없음
  };
}

/**
 * 게시글 목록 조회 (최신순)
 */
export async function listPosts(limit?: number): Promise<Post[]> {
  try {
    const supabase = createSupabaseClient();
    
    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (limit && limit > 0) {
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
 * 게시글 생성
 */
export async function createPost(input: {
  title: string;
  content: string;
  author_name?: string;
  edit_password?: string;
  user_id?: string | null;
}): Promise<Post> {
  try {
    const supabase = createSupabaseClient();

    const isLoggedInPost = !!input.user_id;
    const needsPassword = !isLoggedInPost;

    if (needsPassword) {
      if (!input.edit_password || input.edit_password.length < 4) {
        throw new Error('비밀번호는 4자 이상으로 설정해주세요.');
      }
    }

    const editPasswordHash =
      needsPassword && input.edit_password ? hashEditPassword(input.edit_password) : null;

    const { data, error } = await supabase
      .from('posts')
      .insert({
        title: input.title,
        content: input.content,
        author_name: normalizeAuthorName(input.author_name),
        edit_password_hash: editPasswordHash,
        user_id: input.user_id ?? null
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
export async function getMyPosts(userId: string, limit?: number): Promise<Post[]> {
  try {
    const supabase = createSupabaseClient();

    let query = supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit && limit > 0) {
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

/**
 * 게시글 수정
 */
export async function updatePost(
  id: string,
  input: {
    title?: string;
    content?: string;
    author_name?: string;
  },
  auth: { editPassword?: string; userId?: string | null }
): Promise<Post> {
  try {
    const supabase = createSupabaseClient();

    // 소유/비밀번호 검증을 위해 authRow 조회
    const { data: authRow, error: authError } = await supabase
      .from('posts')
      .select('id, edit_password_hash, user_id')
      .eq('id', id)
      .single();

    if (authError) {
      if (authError.code === 'PGRST116') {
        throw new Error('게시글을 찾을 수 없습니다.');
      }
      console.error('게시글 수정(비밀번호 조회) 오류:', authError);
      throw authError;
    }

    // 로그인 글: user_id가 있으면 userId로 소유권 검증
    if (authRow?.user_id) {
      if (!auth.userId) {
        throw new Error('로그인이 필요합니다.');
      }
      if (auth.userId !== authRow.user_id) {
        throw new Error('본인의 게시글만 수정할 수 있습니다.');
      }
    } else {
      // 익명 글: 비밀번호 검증
      if (!authRow?.edit_password_hash) {
        throw new Error('이 게시글은 비밀번호로 수정할 수 없습니다.');
      }
      if (!auth.editPassword) {
        throw new Error('비밀번호를 입력해주세요.');
      }

      const ok = verifyEditPassword(auth.editPassword, authRow.edit_password_hash);
      if (!ok) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }
    }

    // 업데이트할 필드만 구성
    const updateData: Partial<PostRow> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
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
 */
export async function deletePost(id: string, auth: { editPassword?: string; userId?: string | null }): Promise<void> {
  try {
    const supabase = createSupabaseClient();

    // 비밀번호 검증을 위해 해시 조회
    // (delete는 반환 row가 없을 수 있으므로 먼저 select)
    const { data: authRow, error: authError } = await supabase
      .from('posts')
      .select('id, edit_password_hash, user_id')
      .eq('id', id)
      .single();

    if (authError) {
      if (authError.code === 'PGRST116') {
        throw new Error('게시글을 찾을 수 없습니다.');
      }
      console.error('게시글 삭제(비밀번호 조회) 오류:', authError);
      throw authError;
    }

    // 로그인 글: user_id가 있으면 userId로 소유권 검증
    if (authRow?.user_id) {
      if (!auth.userId) {
        throw new Error('로그인이 필요합니다.');
      }
      if (auth.userId !== authRow.user_id) {
        throw new Error('본인의 게시글만 삭제할 수 있습니다.');
      }
    } else {
      // 익명 글: 비밀번호 검증
      if (!authRow?.edit_password_hash) {
        throw new Error('이 게시글은 비밀번호로 삭제할 수 없습니다.');
      }
      if (!auth.editPassword) {
        throw new Error('비밀번호를 입력해주세요.');
      }

      const ok = verifyEditPassword(auth.editPassword, authRow.edit_password_hash);
      if (!ok) {
        throw new Error('비밀번호가 일치하지 않습니다.');
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
