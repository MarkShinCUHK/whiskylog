-- DramLog Supabase posts 테이블 스키마
-- 
-- 사용 방법:
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 아래 SQL을 복사하여 실행
-- 3. RLS는 MVP 단계에서 비활성화 (아래 안내 참조)

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
  ALTER COLUMN author_name SET DEFAULT '익명의 위스키 러버';

-- (선택) user_id FK는 Supabase Auth 사용 시에만 적용 권장
-- ALTER TABLE posts
--   ADD CONSTRAINT posts_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_name ON posts(author_name);

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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

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
