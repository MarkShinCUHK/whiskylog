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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 환경에서도 안전하게 적용되도록 컬럼/기본값을 보강 (idempotent)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS edit_password_hash TEXT;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE posts
  ALTER COLUMN author_name SET DEFAULT '익명의 위스키 러버';

-- (선택) user_id FK는 Supabase Auth 사용 시에만 적용 권장
-- ALTER TABLE posts
--   ADD CONSTRAINT posts_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_name ON posts(author_name);

-- RLS (Row Level Security) 설정
-- 
-- MVP 단계: RLS 비활성화 (모든 사용자가 읽기/쓰기 가능)
-- 아래 명령어로 RLS를 비활성화합니다:
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
--
-- 프로덕션 단계: RLS 활성화 및 정책 설정
-- 1. RLS 활성화:
--    ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
--
-- 2. 읽기 정책 (모든 사용자 읽기 가능):
--    CREATE POLICY "Anyone can read posts"
--    ON posts FOR SELECT
--    USING (true);
--
-- 3. 쓰기 정책 (인증된 사용자만 작성 가능):
--    CREATE POLICY "Authenticated users can insert posts"
--    ON posts FOR INSERT
--    WITH CHECK (auth.role() = 'authenticated');
--
-- 4. 수정/삭제 정책 (작성자만 가능):
--    CREATE POLICY "Users can update own posts"
--    ON posts FOR UPDATE
--    USING (auth.uid()::text = user_id);
--
--    CREATE POLICY "Users can delete own posts"
--    ON posts FOR DELETE
--    USING (auth.uid()::text = user_id);
