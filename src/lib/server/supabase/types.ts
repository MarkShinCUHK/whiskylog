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
  is_anonymous?: boolean | null;
  whisky_id?: string | null;
  thumbnail_url?: string | null;
  created_at: string; // ISO 8601 timestamptz
  view_count?: number | null;
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
  userId?: string | null; // 로그인 글 소유자 (익명 글이면 null)
  isAnonymous?: boolean; // 익명 글 여부
  whiskyId?: string | null;
  thumbnailUrl?: string | null;
  tags?: string[]; // 태그 목록
  views?: number;
  likes?: number;
};

/**
 * Supabase comments 테이블의 row 타입
 */
export type CommentRow = {
  id: string; // UUID
  post_id: string; // UUID
  user_id: string; // UUID
  content: string;
  created_at: string; // ISO 8601 timestamptz
  updated_at: string; // ISO 8601 timestamptz
};

/**
 * UI에서 사용하는 Comment 타입
 */
export type Comment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string; // YYYY-MM-DD HH:mm
  updatedAt: string; // YYYY-MM-DD HH:mm
  authorName?: string; // user_metadata.nickname 또는 email
  authorEmail?: string;
};

/**
 * Supabase likes 테이블의 row 타입
 */
export type LikeRow = {
  id: string; // UUID
  post_id: string; // UUID
  user_id: string; // UUID
  created_at: string; // ISO 8601 timestamptz
};

/**
 * Supabase bookmarks 테이블의 row 타입
 */
export type BookmarkRow = {
  id: string; // UUID
  post_id: string; // UUID
  user_id: string; // UUID
  created_at: string; // ISO 8601 timestamptz
};

/**
 * Supabase notifications 테이블의 row 타입
 */
export type NotificationRow = {
  id: string; // UUID
  user_id: string; // UUID (수신자)
  actor_id: string; // UUID (행위자)
  actor_name?: string | null;
  post_id: string; // UUID
  comment_id?: string | null;
  type: 'comment' | 'like';
  read_at?: string | null; // ISO 8601 timestamptz
  created_at: string; // ISO 8601 timestamptz
};

/**
 * UI에서 사용하는 Notification 타입
 */
export type Notification = {
  id: string;
  userId: string;
  actorId: string;
  actorName?: string | null;
  postId: string;
  commentId?: string | null;
  type: 'comment' | 'like';
  createdAt: string; // YYYY-MM-DD HH:mm
  readAt?: string | null;
  postTitle?: string | null;
};

/**
 * Supabase profiles 테이블의 row 타입
 */
export type ProfileRow = {
  user_id: string; // UUID
  nickname?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at: string; // ISO 8601 timestamptz
};

export type Profile = {
  userId: string;
  nickname: string | null;
  bio: string | null;
  avatarUrl: string | null;
  updatedAt: string;
};

export type WhiskyRow = {
  id: string; // UUID
  name: string;
  brand?: string | null;
  type?: string | null;
  region?: string | null;
  age?: number | null;
  abv?: number | null;
  created_at: string; // ISO 8601 timestamptz
};

export type Whisky = {
  id: string;
  name: string;
  brand: string | null;
  type: string | null;
  region: string | null;
  age: number | null;
  abv: number | null;
  createdAt: string;
};
