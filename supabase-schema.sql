-- DramLog Supabase posts 테이블 스키마
-- 
-- 사용 방법:
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 아래 SQL을 복사하여 실행
-- 3. RLS는 MVP 단계에서 활성화하여 사용 (아래 정책 참고)

-- posts 테이블 생성
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  -- 익명 게시글 기본 작성자명 (디시 스타일)
  author_name TEXT NOT NULL DEFAULT '익명의 위스키 러버',
  -- 익명 게시글 수정/삭제용 비밀번호 해시 (평문 저장 금지)
  edit_password_hash TEXT,
  -- 선택 로그인 도입 시 연결 (게스트 글 Claim은 하지 않음)
  user_id UUID,
  -- 익명 글 여부 (명확한 판단을 위해)
  is_anonymous BOOLEAN DEFAULT false,
  -- 조회수
  view_count INTEGER NOT NULL DEFAULT 0,
  -- 태그 (검색/필터)
  tags TEXT[] DEFAULT '{}'::TEXT[],
  -- 위스키 연결
  whisky_id UUID,
  -- 대표 이미지 URL
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 환경에서도 안전하게 적용되도록 컬럼/기본값을 보강 (idempotent)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS edit_password_hash TEXT;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[];

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS whisky_id UUID;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- (선택) whisky_id FK는 위스키 테이블 생성 후 적용
-- ALTER TABLE posts
--   ADD CONSTRAINT posts_whisky_id_fkey
--   FOREIGN KEY (whisky_id) REFERENCES whiskies(id) ON DELETE SET NULL;

ALTER TABLE posts
  ALTER COLUMN author_name SET DEFAULT '익명의 위스키 러버';

-- (선택) user_id FK는 Supabase Auth 사용 시에만 적용 권장
-- ALTER TABLE posts
--   ADD CONSTRAINT posts_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_name ON posts(author_name);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_posts_whisky_id ON posts(whisky_id);

-- whiskies 테이블 생성 (위스키 DB)
CREATE TABLE IF NOT EXISTS whiskies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  type TEXT,
  region TEXT,
  age INTEGER,
  abv NUMERIC(4,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whiskies_name ON whiskies(name);
CREATE INDEX IF NOT EXISTS idx_whiskies_brand ON whiskies(brand);

-- 조회수 증가 함수 (RLS 우회용, 서버에서 호출)
CREATE OR REPLACE FUNCTION increment_post_view(p_post_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_post_id
  RETURNING view_count INTO new_count;

  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_post_view(UUID) TO anon, authenticated;

-- comments 테이블 생성 (댓글)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- auth.users 참조 (FK는 선택사항)
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- likes 테이블 생성 (좋아요)
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- auth.users 참조 (FK는 선택사항)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id) -- 중복 좋아요 방지
);

-- notifications 테이블 생성 (알림)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- 알림 수신자
  actor_id UUID NOT NULL, -- 알림 발생자
  actor_name TEXT,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('comment', 'like')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- bookmarks 테이블 생성 (북마크)
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- auth.users 참조 (FK는 선택사항)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id) -- 중복 북마크 방지
);

-- profiles 테이블 생성 (프로필)
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY, -- auth.users 참조 (FK는 선택사항)
  nickname TEXT,
  bio TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at DESC);

-- RLS (Row Level Security) 설정
-- 
-- Anonymous Auth와 함께 사용하여 익명 사용자도 인증된 사용자로 처리
-- 
-- 익명 글 보안 정책:
-- - 익명 글(is_anonymous = true)은 user_id와 무관하게 비밀번호로만 수정/삭제 가능
-- - 토큰 만료 시 user_id가 바뀔 수 있으므로 user_id 기반 권한 검사 불가
-- - RLS 정책: 익명 글은 누구나 수정/삭제 시도 가능 (서버에서 비밀번호 검증으로 보안 보장)
-- - 실제 보안: 서버 사이드에서 비밀번호 해시 검증을 철저히 수행
-- 
-- 로그인 글 보안 정책:
-- - 로그인 글(user_id IS NOT NULL AND is_anonymous = false)은 작성자(user_id)만 수정/삭제 가능
-- - RLS 정책: auth.uid() = user_id인 경우에만 수정/삭제 허용

-- 1. RLS 활성화
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. posts 테이블 정책
-- 읽기: 모든 사용자 (익명 포함) 읽기 가능
CREATE POLICY "Anyone can read posts"
ON posts FOR SELECT
USING (true);

-- 작성: 모든 사용자 (익명 포함) 작성 가능
-- Anonymous Auth를 사용하면 익명 사용자도 auth.uid()를 가짐
CREATE POLICY "Anyone can insert posts"
ON posts FOR INSERT
WITH CHECK (true);

-- 수정: 로그인 글은 작성자만, 익명 글은 서버에서 비밀번호 검증
-- 주의: 익명 글(is_anonymous = true)은 RLS에서 누구나 수정 시도 가능
--       실제 보안은 서버 사이드 비밀번호 검증으로 보장 (user_id 무관)
CREATE POLICY "Users can update own posts or anonymous posts"
ON posts FOR UPDATE
USING (
  -- 로그인 글: 작성자 본인만 (user_id로 권한 검사)
  (user_id IS NOT NULL AND auth.uid() = user_id)
  OR
  -- 익명 글: RLS는 허용하되 서버에서 비밀번호 검증 필수 (user_id 무관)
  (is_anonymous = true)
);

-- 삭제: 로그인 글은 작성자만, 익명 글은 서버에서 비밀번호 검증
-- 주의: 익명 글(is_anonymous = true)은 RLS에서 누구나 삭제 시도 가능
--       실제 보안은 서버 사이드 비밀번호 검증으로 보장 (user_id 무관)
CREATE POLICY "Users can delete own posts or anonymous posts"
ON posts FOR DELETE
USING (
  -- 로그인 글: 작성자 본인만 (user_id로 권한 검사)
  (user_id IS NOT NULL AND auth.uid() = user_id)
  OR
  -- 익명 글: RLS는 허용하되 서버에서 비밀번호 검증 필수 (user_id 무관)
  (is_anonymous = true)
);

-- 3. comments 테이블 정책
-- 읽기: 모든 사용자 읽기 가능
CREATE POLICY "Anyone can read comments"
ON comments FOR SELECT
USING (true);

-- 작성: 모든 인증된 사용자(익명 포함) 작성 가능
-- Anonymous Auth를 사용하면 익명 사용자도 auth.role() = 'authenticated'를 가짐
CREATE POLICY "Authenticated users can insert comments"
ON comments FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 수정: 작성자 본인만
CREATE POLICY "Users can update own comments"
ON comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 삭제: 작성자 본인만
CREATE POLICY "Users can delete own comments"
ON comments FOR DELETE
USING (auth.uid() = user_id);

-- 4. likes 테이블 정책
-- 읽기: 모든 사용자 읽기 가능
CREATE POLICY "Anyone can read likes"
ON likes FOR SELECT
USING (true);

-- 작성: 모든 인증된 사용자(익명 포함) 작성 가능
-- Anonymous Auth를 사용하면 익명 사용자도 auth.role() = 'authenticated'를 가짐
CREATE POLICY "Authenticated users can insert likes"
ON likes FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 삭제: 작성자 본인만
CREATE POLICY "Users can delete own likes"
ON likes FOR DELETE
USING (auth.uid() = user_id);

-- 5. notifications 테이블 정책
-- 읽기: 본인 알림만
CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- 작성: 알림 발생자만 (actor_id)
CREATE POLICY "Users can insert notifications"
ON notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = actor_id);

-- 수정: 본인 알림만 (읽음 처리)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- 6. bookmarks 테이블 정책
-- 읽기: 본인 북마크만
CREATE POLICY "Users can read own bookmarks"
ON bookmarks FOR SELECT
USING (auth.uid() = user_id);

-- 작성: 로그인 사용자만
CREATE POLICY "Authenticated users can insert bookmarks"
ON bookmarks FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 삭제: 작성자 본인만
CREATE POLICY "Users can delete own bookmarks"
ON bookmarks FOR DELETE
USING (auth.uid() = user_id);

-- 7. profiles 테이블 정책
-- 읽기: 모든 사용자
CREATE POLICY "Anyone can read profiles"
ON profiles FOR SELECT
USING (true);

-- 작성/수정: 본인만
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Storage 버킷 생성 (게시글 이미지용)
-- Supabase 대시보드에서 Storage → Create bucket으로 생성하거나 아래 SQL 실행
-- 버킷 이름: post-images

-- Storage 버킷 생성 (이미 존재하면 무시)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS 정책 설정
-- 읽기: 모든 사용자 읽기 가능
CREATE POLICY "Anyone can read post images"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

-- 업로드: 인증된 사용자(익명 포함)만 업로드 가능
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-images' 
  AND auth.role() = 'authenticated'
);

-- 삭제: 업로드한 사용자만 삭제 가능
-- 경로 구조: posts/{userId}/{postId}/image_{index}.{extension}
-- foldername(name)[0] = 'posts', foldername(name)[1] = userId, foldername(name)[2] = postId
-- 기존 정책이 있으면 삭제 후 재생성
DROP POLICY IF EXISTS "Users can delete own post images" ON storage.objects;
CREATE POLICY "Users can delete own post images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);
