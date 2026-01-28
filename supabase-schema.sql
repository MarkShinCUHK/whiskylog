-- DramLog Supabase posts 테이블 스키마
-- 
-- 사용 방법:
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 아래 SQL을 복사하여 실행
-- 3. RLS는 MVP 단계에서 활성화하여 사용 (아래 정책 참고)

-- Postgres 확장(pgcrypto): gen_random_uuid, hmac 등에 사용
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- post_tasting 테이블 생성 (테이스팅 정보)
CREATE TABLE IF NOT EXISTS post_tasting (
  post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  color_100 SMALLINT NOT NULL,
  nose_score_x2 SMALLINT NOT NULL,
  palate_score_x2 SMALLINT NOT NULL,
  finish_score_x2 SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT post_tasting_color_range CHECK (color_100 BETWEEN 0 AND 100),
  CONSTRAINT post_tasting_nose_range CHECK (nose_score_x2 BETWEEN 0 AND 10),
  CONSTRAINT post_tasting_palate_range CHECK (palate_score_x2 BETWEEN 0 AND 10),
  CONSTRAINT post_tasting_finish_range CHECK (finish_score_x2 BETWEEN 0 AND 10)
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_post_tasting_updated_at ON post_tasting;
CREATE TRIGGER set_post_tasting_updated_at
BEFORE UPDATE ON post_tasting
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

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

-- 테이스팅 게시글 생성 RPC (posts + post_tasting)
CREATE OR REPLACE FUNCTION public.create_tasting_post(
  p_title TEXT,
  p_content TEXT,
  p_author_name TEXT,
  p_edit_password_hash TEXT,
  p_is_anonymous BOOLEAN,
  p_whisky_id UUID,
  p_thumbnail_url TEXT,
  p_tags TEXT[],
  p_color_100 SMALLINT,
  p_nose_score_x2 SMALLINT,
  p_palate_score_x2 SMALLINT,
  p_finish_score_x2 SMALLINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_post_id UUID;
BEGIN
  INSERT INTO public.posts (
    title,
    content,
    author_name,
    edit_password_hash,
    user_id,
    is_anonymous,
    whisky_id,
    thumbnail_url,
    tags
  )
  VALUES (
    p_title,
    p_content,
    COALESCE(p_author_name, '익명의 위스키 러버'),
    p_edit_password_hash,
    auth.uid(),
    p_is_anonymous,
    p_whisky_id,
    p_thumbnail_url,
    COALESCE(p_tags, '{}'::TEXT[])
  )
  RETURNING id INTO v_post_id;

  INSERT INTO public.post_tasting (
    post_id,
    color_100,
    nose_score_x2,
    palate_score_x2,
    finish_score_x2
  )
  VALUES (
    v_post_id,
    p_color_100,
    p_nose_score_x2,
    p_palate_score_x2,
    p_finish_score_x2
  );

  RETURN v_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tasting_post(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  BOOLEAN,
  UUID,
  TEXT,
  TEXT[],
  SMALLINT,
  SMALLINT,
  SMALLINT,
  SMALLINT
) TO anon, authenticated;

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

-- 안전한 검색 RPC (문자열 조립 기반 .or(...) 회피)
-- - PostgREST 필터 문자열에 사용자 입력을 직접 넣지 않기 위해 DB 함수로 이동
-- - SECURITY INVOKER: RLS 정책을 그대로 따름
CREATE OR REPLACE FUNCTION public.search_posts(
  p_query TEXT,
  p_author TEXT DEFAULT NULL,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_sort TEXT DEFAULT 'newest',
  p_limit INTEGER DEFAULT 12,
  p_offset INTEGER DEFAULT 0,
  p_tag TEXT DEFAULT NULL,
  p_avg_min NUMERIC DEFAULT NULL,
  p_avg_max NUMERIC DEFAULT NULL,
  p_color_min NUMERIC DEFAULT NULL,
  p_color_max NUMERIC DEFAULT NULL,
  p_nose_min NUMERIC DEFAULT NULL,
  p_nose_max NUMERIC DEFAULT NULL,
  p_palate_min NUMERIC DEFAULT NULL,
  p_palate_max NUMERIC DEFAULT NULL,
  p_finish_min NUMERIC DEFAULT NULL,
  p_finish_max NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  author_name TEXT,
  user_id UUID,
  is_anonymous BOOLEAN,
  whisky_id UUID,
  thumbnail_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  view_count INTEGER,
  tasting_avg NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_query TEXT := btrim(COALESCE(p_query, ''));
  v_tag TEXT := NULLIF(btrim(COALESCE(p_tag, '')), '');
  v_author TEXT := NULLIF(btrim(COALESCE(p_author, '')), '');
  v_sort TEXT := lower(COALESCE(p_sort, 'newest'));
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 12), 0), 100);
  v_offset INTEGER := LEAST(GREATEST(COALESCE(p_offset, 0), 0), 10000);
BEGIN
  IF v_query = '' AND v_tag IS NULL THEN
    RETURN;
  END IF;

  IF v_sort NOT IN ('newest', 'oldest', 'views', 'tasting') THEN
    v_sort := 'newest';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      p.id,
      p.title,
      p.content,
      p.author_name,
      p.user_id,
      p.is_anonymous,
      p.whisky_id,
      p.thumbnail_url,
      p.tags,
      p.created_at,
      p.view_count,
      (t.nose_score_x2 + t.palate_score_x2 + t.finish_score_x2) / 6.0 AS tasting_avg
    FROM posts AS p
    LEFT JOIN post_tasting AS t ON t.post_id = p.id
    WHERE
      (v_query = '' OR p.title ILIKE '%' || v_query || '%' OR p.content ILIKE '%' || v_query || '%')
      AND (v_tag IS NULL OR p.tags @> ARRAY[v_tag])
      AND (v_author IS NULL OR p.author_name ILIKE '%' || v_author || '%')
      AND (p_from IS NULL OR p.created_at >= p_from)
      AND (p_to IS NULL OR p.created_at <= p_to)
      AND (p_avg_min IS NULL OR (t.nose_score_x2 + t.palate_score_x2 + t.finish_score_x2) / 6.0 >= p_avg_min)
      AND (p_avg_max IS NULL OR (t.nose_score_x2 + t.palate_score_x2 + t.finish_score_x2) / 6.0 <= p_avg_max)
      AND (p_color_min IS NULL OR t.color_100 >= (p_color_min * 100))
      AND (p_color_max IS NULL OR t.color_100 <= (p_color_max * 100))
      AND (p_nose_min IS NULL OR t.nose_score_x2 >= (p_nose_min * 2))
      AND (p_nose_max IS NULL OR t.nose_score_x2 <= (p_nose_max * 2))
      AND (p_palate_min IS NULL OR t.palate_score_x2 >= (p_palate_min * 2))
      AND (p_palate_max IS NULL OR t.palate_score_x2 <= (p_palate_max * 2))
      AND (p_finish_min IS NULL OR t.finish_score_x2 >= (p_finish_min * 2))
      AND (p_finish_max IS NULL OR t.finish_score_x2 <= (p_finish_max * 2))
  )
  SELECT *
  FROM filtered
  ORDER BY
    CASE WHEN v_sort = 'views' THEN filtered.view_count END DESC,
    CASE WHEN v_sort = 'tasting' THEN filtered.tasting_avg END DESC NULLS LAST,
    CASE WHEN v_sort = 'oldest' THEN filtered.created_at END ASC,
    CASE WHEN v_sort <> 'oldest' THEN filtered.created_at END DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_posts(
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  INTEGER,
  INTEGER,
  TEXT,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC
) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_posts_count(
  p_query TEXT,
  p_author TEXT DEFAULT NULL,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_tag TEXT DEFAULT NULL,
  p_avg_min NUMERIC DEFAULT NULL,
  p_avg_max NUMERIC DEFAULT NULL,
  p_color_min NUMERIC DEFAULT NULL,
  p_color_max NUMERIC DEFAULT NULL,
  p_nose_min NUMERIC DEFAULT NULL,
  p_nose_max NUMERIC DEFAULT NULL,
  p_palate_min NUMERIC DEFAULT NULL,
  p_palate_max NUMERIC DEFAULT NULL,
  p_finish_min NUMERIC DEFAULT NULL,
  p_finish_max NUMERIC DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_query TEXT := btrim(COALESCE(p_query, ''));
  v_tag TEXT := NULLIF(btrim(COALESCE(p_tag, '')), '');
  v_author TEXT := NULLIF(btrim(COALESCE(p_author, '')), '');
  v_count INTEGER := 0;
BEGIN
  IF v_query = '' AND v_tag IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM posts AS p
  LEFT JOIN post_tasting AS t ON t.post_id = p.id
  WHERE
    (v_query = '' OR p.title ILIKE '%' || v_query || '%' OR p.content ILIKE '%' || v_query || '%')
    AND (v_tag IS NULL OR p.tags @> ARRAY[v_tag])
    AND (v_author IS NULL OR p.author_name ILIKE '%' || v_author || '%')
    AND (p_from IS NULL OR p.created_at >= p_from)
    AND (p_to IS NULL OR p.created_at <= p_to)
    AND (p_avg_min IS NULL OR (t.nose_score_x2 + t.palate_score_x2 + t.finish_score_x2) / 6.0 >= p_avg_min)
    AND (p_avg_max IS NULL OR (t.nose_score_x2 + t.palate_score_x2 + t.finish_score_x2) / 6.0 <= p_avg_max)
    AND (p_color_min IS NULL OR t.color_100 >= (p_color_min * 100))
    AND (p_color_max IS NULL OR t.color_100 <= (p_color_max * 100))
    AND (p_nose_min IS NULL OR t.nose_score_x2 >= (p_nose_min * 2))
    AND (p_nose_max IS NULL OR t.nose_score_x2 <= (p_nose_max * 2))
    AND (p_palate_min IS NULL OR t.palate_score_x2 >= (p_palate_min * 2))
    AND (p_palate_max IS NULL OR t.palate_score_x2 <= (p_palate_max * 2))
    AND (p_finish_min IS NULL OR t.finish_score_x2 >= (p_finish_min * 2))
    AND (p_finish_max IS NULL OR t.finish_score_x2 <= (p_finish_max * 2));

  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_posts_count(
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC
) TO anon, authenticated;

-- 익명 글 수정/삭제를 위한 서버 서명 기반 RPC
--
-- 목표:
-- - 익명 글은 "비밀번호를 아는 경우"에만 수정/삭제 가능해야 함
-- - 동시에 RLS에서 익명 글을 누구나 UPDATE/DELETE할 수 있게 두면 치명적 취약점이 됨
-- - 해결: 익명 글의 UPDATE/DELETE는 RLS에서 막고, 서버만 만들 수 있는 서명으로 우회
--
-- 사용 방법(필수):
-- 1) 서버 환경 변수에 ANON_POST_SECRET 설정
-- 2) 아래 app_private.app_secrets의 anon_post_secret 값을 같은 값으로 교체

-- 비공개 스키마 및 시크릿 테이블
CREATE SCHEMA IF NOT EXISTS app_private;

CREATE TABLE IF NOT EXISTS app_private.app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 기본값은 반드시 교체해야 함
INSERT INTO app_private.app_secrets (key, value)
VALUES ('anon_post_secret', 'CHANGE_ME')
ON CONFLICT (key) DO NOTHING;

-- 비공개 스키마/테이블 권한 차단
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA app_private FROM PUBLIC, anon, authenticated;

-- 시크릿 조회 함수 (직접 호출 금지)
CREATE OR REPLACE FUNCTION app_private.get_secret(p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT value INTO v_secret
  FROM app_private.app_secrets
  WHERE key = p_key;

  IF v_secret IS NULL OR v_secret = 'CHANGE_ME' THEN
    RAISE EXCEPTION 'app secret % not configured', p_key;
  END IF;

  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION app_private.get_secret(TEXT) FROM PUBLIC, anon, authenticated;

-- 서버 서명 검증 함수 (직접 호출 금지)
CREATE OR REPLACE FUNCTION app_private.verify_anon_post_signature(
  p_post_id UUID,
  p_operation TEXT,
  p_signature TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, extensions
AS $$
DECLARE
  v_secret TEXT;
  v_expected TEXT;
BEGIN
  v_secret := app_private.get_secret('anon_post_secret');
  v_expected := encode(
    extensions.hmac(
      convert_to(p_post_id::text || ':' || COALESCE(p_operation, ''), 'utf8'),
      convert_to(v_secret, 'utf8'),
      'sha256'::text
    ),
    'hex'
  );
  RETURN v_expected = COALESCE(p_signature, '');
END;
$$;

REVOKE ALL ON FUNCTION app_private.verify_anon_post_signature(UUID, TEXT, TEXT)
FROM PUBLIC, anon, authenticated;

-- 익명 글 전환(회원가입 시) 서명 검증 함수 (직접 호출 금지)
CREATE OR REPLACE FUNCTION app_private.verify_anon_conversion_signature(
  p_old_user_id UUID,
  p_new_user_id UUID,
  p_signature TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, extensions
AS $$
DECLARE
  v_secret TEXT;
  v_expected TEXT;
BEGIN
  v_secret := app_private.get_secret('anon_post_secret');
  v_expected := encode(
    extensions.hmac(
      convert_to(p_old_user_id::text || ':' || p_new_user_id::text || ':convert_anon_posts', 'utf8'),
      convert_to(v_secret, 'utf8'),
      'sha256'::text
    ),
    'hex'
  );
  RETURN v_expected = COALESCE(p_signature, '');
END;
$$;

REVOKE ALL ON FUNCTION app_private.verify_anon_conversion_signature(UUID, UUID, TEXT)
FROM PUBLIC, anon, authenticated;

-- 익명 글 비밀번호 해시 조회 (서버 서명 필요)
CREATE OR REPLACE FUNCTION public.get_anonymous_post_hash(
  p_post_id UUID,
  p_signature TEXT
)
RETURNS TABLE (
  edit_password_hash TEXT,
  is_anonymous BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
BEGIN
  IF NOT app_private.verify_anon_post_signature(p_post_id, 'read_hash', p_signature) THEN
    RAISE EXCEPTION 'invalid anon post signature (read_hash)';
  END IF;

  RETURN QUERY
  SELECT posts.edit_password_hash, posts.is_anonymous
  FROM posts
  WHERE posts.id = p_post_id
    AND posts.is_anonymous = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'anonymous post not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_anonymous_post_hash(UUID, TEXT) TO anon, authenticated;

-- 익명 글 수정 (서버 서명 필요, 비밀번호 검증은 서버에서 수행)
CREATE OR REPLACE FUNCTION public.update_anonymous_post(
  p_post_id UUID,
  p_signature TEXT,
  p_title TEXT,
  p_content TEXT,
  p_author_name TEXT,
  p_whisky_id UUID,
  p_thumbnail_url TEXT,
  p_tags TEXT[]
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  author_name TEXT,
  user_id UUID,
  is_anonymous BOOLEAN,
  whisky_id UUID,
  thumbnail_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  view_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
BEGIN
  IF NOT app_private.verify_anon_post_signature(p_post_id, 'anon_update', p_signature) THEN
    RAISE EXCEPTION 'invalid anon post signature (anon_update)';
  END IF;

  PERFORM 1
  FROM posts AS p
  WHERE p.id = p_post_id
    AND p.is_anonymous = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'anonymous post not found or not anonymous';
  END IF;

  UPDATE posts AS p
  SET
    title = COALESCE(p_title, p.title),
    content = COALESCE(p_content, p.content),
    author_name = COALESCE(p_author_name, p.author_name),
    whisky_id = p_whisky_id,
    thumbnail_url = p_thumbnail_url,
    tags = COALESCE(p_tags, p.tags)
  WHERE p.id = p_post_id;

  RETURN QUERY
  SELECT
    posts.id,
    posts.title,
    posts.content,
    posts.author_name,
    posts.user_id,
    posts.is_anonymous,
    posts.whisky_id,
    posts.thumbnail_url,
    posts.tags,
    posts.created_at,
    posts.view_count
  FROM posts
  WHERE posts.id = p_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_anonymous_post(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  UUID,
  TEXT,
  TEXT[]
) TO anon, authenticated;

-- 익명 글 테이스팅 수정 (서버 서명 필요)
CREATE OR REPLACE FUNCTION public.update_anonymous_post_tasting(
  p_post_id UUID,
  p_signature TEXT,
  p_color_100 SMALLINT,
  p_nose_score_x2 SMALLINT,
  p_palate_score_x2 SMALLINT,
  p_finish_score_x2 SMALLINT
)
RETURNS public.post_tasting
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  v_row public.post_tasting;
BEGIN
  IF NOT app_private.verify_anon_post_signature(p_post_id, 'anon_update_tasting', p_signature) THEN
    RAISE EXCEPTION 'invalid anon post signature (anon_update_tasting)';
  END IF;

  PERFORM 1
  FROM posts AS p
  WHERE p.id = p_post_id
    AND p.is_anonymous = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'anonymous post not found or not anonymous';
  END IF;

  INSERT INTO public.post_tasting (
    post_id,
    color_100,
    nose_score_x2,
    palate_score_x2,
    finish_score_x2
  )
  VALUES (
    p_post_id,
    p_color_100,
    p_nose_score_x2,
    p_palate_score_x2,
    p_finish_score_x2
  )
  ON CONFLICT (post_id) DO UPDATE
  SET
    color_100 = EXCLUDED.color_100,
    nose_score_x2 = EXCLUDED.nose_score_x2,
    palate_score_x2 = EXCLUDED.palate_score_x2,
    finish_score_x2 = EXCLUDED.finish_score_x2
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_anonymous_post_tasting(
  UUID,
  TEXT,
  SMALLINT,
  SMALLINT,
  SMALLINT,
  SMALLINT
) TO anon, authenticated;

-- 익명 글 삭제 (서버 서명 필요, 비밀번호 검증은 서버에서 수행)
CREATE OR REPLACE FUNCTION public.delete_anonymous_post(
  p_post_id UUID,
  p_signature TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
BEGIN
  IF NOT app_private.verify_anon_post_signature(p_post_id, 'anon_delete', p_signature) THEN
    RAISE EXCEPTION 'invalid anon post signature (anon_delete)';
  END IF;

  DELETE FROM posts
  WHERE id = p_post_id
    AND is_anonymous = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'anonymous post not found or not anonymous';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_anonymous_post(UUID, TEXT) TO anon, authenticated;

-- 익명 글 → 회원 글 전환 (회원가입 시, 서버 서명 필요)
CREATE OR REPLACE FUNCTION public.convert_anonymous_posts(
  p_old_user_id UUID,
  p_new_user_id UUID,
  p_signature TEXT
)
RETURNS TABLE (
  id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
BEGIN
  IF NOT app_private.verify_anon_conversion_signature(p_old_user_id, p_new_user_id, p_signature) THEN
    RAISE EXCEPTION 'invalid anon conversion signature (convert_anon_posts)';
  END IF;

  -- 로그인 세션과 전환 대상 사용자 일치 강제 (서버 버그/오용 방지)
  IF auth.uid() IS NULL OR auth.uid() <> p_new_user_id THEN
    RAISE EXCEPTION 'auth uid mismatch for anon conversion';
  END IF;

  RETURN QUERY
  UPDATE posts
  SET
    is_anonymous = false,
    user_id = p_new_user_id,
    edit_password_hash = NULL
  WHERE user_id = p_old_user_id
    AND is_anonymous = true
  RETURNING posts.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_anonymous_posts(UUID, UUID, TEXT) TO anon, authenticated;

-- RLS (Row Level Security) 설정
--
-- 핵심 원칙:
-- - 익명 글 UPDATE/DELETE는 RLS에서 허용하지 않음 (직접 호출 차단)
-- - 익명 글 수정/삭제는 서버 서명 + RPC 경로로만 허용
-- - 로그인 글은 기존처럼 작성자만 UPDATE/DELETE 허용

-- 1. RLS 활성화
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tasting ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. posts 테이블 정책
-- 읽기: 모든 사용자 (익명 포함) 읽기 가능
DROP POLICY IF EXISTS "Anyone can read posts" ON posts;
CREATE POLICY "Anyone can read posts"
ON posts FOR SELECT
USING (true);

-- 작성: 인증된 사용자(익명 포함)만 작성 가능
-- auth.uid()와 user_id를 일치시켜 직접 DB 호출 우회를 줄임
DROP POLICY IF EXISTS "Anyone can insert posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON posts;
CREATE POLICY "Authenticated users can insert posts"
ON posts FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND (user_id IS NULL OR auth.uid() = user_id)
);

-- 수정: 로그인 글(비익명) 작성자만 허용
-- 익명 글은 RLS로는 수정 불가 (서버 서명 RPC로만 수정)
DROP POLICY IF EXISTS "Users can update own posts or anonymous posts" ON posts;
DROP POLICY IF EXISTS "Users can update own non-anonymous posts" ON posts;
CREATE POLICY "Users can update own non-anonymous posts"
ON posts FOR UPDATE
USING (
  is_anonymous = false
  AND user_id IS NOT NULL
  AND auth.uid() = user_id
)
WITH CHECK (
  is_anonymous = false
  AND user_id IS NOT NULL
  AND auth.uid() = user_id
);

-- 삭제: 로그인 글(비익명) 작성자만 허용
-- 익명 글은 RLS로는 삭제 불가 (서버 서명 RPC로만 삭제)
DROP POLICY IF EXISTS "Users can delete own posts or anonymous posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own non-anonymous posts" ON posts;
CREATE POLICY "Users can delete own non-anonymous posts"
ON posts FOR DELETE
USING (
  is_anonymous = false
  AND user_id IS NOT NULL
  AND auth.uid() = user_id
);

-- 비밀번호 해시 컬럼은 API에서 직접 조회 불가하도록 차단
REVOKE SELECT (edit_password_hash) ON posts FROM anon, authenticated;

-- 2-1. post_tasting 테이블 정책
-- 읽기: 모든 사용자 (익명 포함) 읽기 가능
DROP POLICY IF EXISTS "Anyone can read post_tasting" ON post_tasting;
CREATE POLICY "Anyone can read post_tasting"
ON post_tasting FOR SELECT
USING (true);

-- 작성: 인증된 사용자(익명 포함)만 작성 가능
DROP POLICY IF EXISTS "Authenticated users can insert own post_tasting" ON post_tasting;
CREATE POLICY "Authenticated users can insert own post_tasting"
ON post_tasting FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1
    FROM posts AS p
    WHERE p.id = post_tasting.post_id
      AND p.user_id = auth.uid()
  )
);

-- 수정: 로그인 글(비익명) 작성자만 허용
DROP POLICY IF EXISTS "Users can update own non-anonymous post_tasting" ON post_tasting;
CREATE POLICY "Users can update own non-anonymous post_tasting"
ON post_tasting FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM posts AS p
    WHERE p.id = post_tasting.post_id
      AND p.user_id = auth.uid()
      AND p.is_anonymous = false
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM posts AS p
    WHERE p.id = post_tasting.post_id
      AND p.user_id = auth.uid()
      AND p.is_anonymous = false
  )
);

-- 삭제: 로그인 글(비익명) 작성자만 허용
DROP POLICY IF EXISTS "Users can delete own non-anonymous post_tasting" ON post_tasting;
CREATE POLICY "Users can delete own non-anonymous post_tasting"
ON post_tasting FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM posts AS p
    WHERE p.id = post_tasting.post_id
      AND p.user_id = auth.uid()
      AND p.is_anonymous = false
  )
);

-- 3. comments 테이블 정책
-- 읽기: 모든 사용자 읽기 가능
DROP POLICY IF EXISTS "Anyone can read comments" ON comments;
CREATE POLICY "Anyone can read comments"
ON comments FOR SELECT
USING (true);

-- 작성: 모든 인증된 사용자(익명 포함) 작성 가능
-- Anonymous Auth를 사용하면 익명 사용자도 auth.role() = 'authenticated'를 가짐
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON comments;
CREATE POLICY "Authenticated users can insert comments"
ON comments FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 수정: 작성자 본인만
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments"
ON comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 삭제: 작성자 본인만
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments"
ON comments FOR DELETE
USING (auth.uid() = user_id);

-- 4. likes 테이블 정책
-- 읽기: 모든 사용자 읽기 가능
DROP POLICY IF EXISTS "Anyone can read likes" ON likes;
CREATE POLICY "Anyone can read likes"
ON likes FOR SELECT
USING (true);

-- 작성: 모든 인증된 사용자(익명 포함) 작성 가능
-- Anonymous Auth를 사용하면 익명 사용자도 auth.role() = 'authenticated'를 가짐
DROP POLICY IF EXISTS "Authenticated users can insert likes" ON likes;
CREATE POLICY "Authenticated users can insert likes"
ON likes FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 삭제: 작성자 본인만
DROP POLICY IF EXISTS "Users can delete own likes" ON likes;
CREATE POLICY "Users can delete own likes"
ON likes FOR DELETE
USING (auth.uid() = user_id);

-- 5. notifications 테이블 정책
-- 읽기: 본인 알림만
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- 작성: 알림 발생자만 (actor_id)
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
CREATE POLICY "Users can insert notifications"
ON notifications FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() = actor_id
  -- 알림 수신자는 해당 게시글의 소유자여야 함 (임의 스팸 방지)
  AND EXISTS (
    SELECT 1
    FROM posts
    WHERE posts.id = notifications.post_id
      AND posts.user_id = notifications.user_id
  )
);

-- 수정: 본인 알림만 (읽음 처리)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- 6. bookmarks 테이블 정책
-- 읽기: 본인 북마크만
DROP POLICY IF EXISTS "Users can read own bookmarks" ON bookmarks;
CREATE POLICY "Users can read own bookmarks"
ON bookmarks FOR SELECT
USING (auth.uid() = user_id);

-- 작성: 로그인 사용자만
DROP POLICY IF EXISTS "Authenticated users can insert bookmarks" ON bookmarks;
CREATE POLICY "Authenticated users can insert bookmarks"
ON bookmarks FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 삭제: 작성자 본인만
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON bookmarks;
CREATE POLICY "Users can delete own bookmarks"
ON bookmarks FOR DELETE
USING (auth.uid() = user_id);

-- 7. profiles 테이블 정책
-- 읽기: 모든 사용자
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
CREATE POLICY "Anyone can read profiles"
ON profiles FOR SELECT
USING (true);

-- 작성/수정: 본인만
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
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
DROP POLICY IF EXISTS "Anyone can read post images" ON storage.objects;
CREATE POLICY "Anyone can read post images"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

-- 업로드: 인증된 사용자(익명 포함)만 업로드 가능
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-images'
  AND auth.role() = 'authenticated'
  -- 경로 구조 강제: posts/{userId}/... 또는 avatars/{userId}/...
  -- PostgreSQL 배열은 1-based: [1] = posts|avatars, [2] = userId
  AND (storage.foldername(name))[1] IN ('posts', 'avatars')
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 삭제: 업로드한 사용자만 삭제 가능
-- 경로 구조: posts/{userId}/{postId}/image_{index}.{extension}
-- PostgreSQL 배열은 1-based: foldername(name)[1] = posts|avatars, [2] = userId
-- 기존 정책이 있으면 삭제 후 재생성
DROP POLICY IF EXISTS "Users can delete own post images" ON storage.objects;
CREATE POLICY "Users can delete own post images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-images'
  -- 경로 구조 강제 + PostgreSQL 배열은 1-based: [2]가 userId
  AND (storage.foldername(name))[1] IN ('posts', 'avatars')
  AND auth.uid()::text = (storage.foldername(name))[2]
);
