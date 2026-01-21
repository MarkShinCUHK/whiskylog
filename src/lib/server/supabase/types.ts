/**
 * Supabase posts 테이블의 row 타입
 */
export type PostRow = {
  id: string; // UUID
  title: string;
  content: string;
  author_name: string;
  edit_password_hash?: string | null;
  user_id?: string | null;
  created_at: string; // ISO 8601 timestamptz
  // 선택적 필드들 (스키마에 없어도 안전하게 처리)
  like_count?: number | null;
  comment_count?: number | null;
  tags?: string[] | null;
  rating?: number | null;
};

/**
 * UI에서 사용하는 Post 타입 (기존 Post 타입과 호환)
 */
export type Post = {
  id: string; // UUID (기존 number에서 변경)
  title: string;
  content: string;
  author: string;
  createdAt: string; // YYYY-MM-DD
  excerpt?: string;
  views?: number;
  likes?: number;
};
