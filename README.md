# DramLog

SvelteKit + Tailwind CSS 기반의 위스키 리뷰 및 게시글 커뮤니티 웹사이트입니다.

## 🚀 시작하기

### 필수 요구사항
- Node.js 20 권장 (최소 18)
- npm 또는 yarn
- Supabase 계정 및 프로젝트

## ☁️ 배포 (Vercel)

### 현재 배포 도메인
- Production: `https://dramlog-topaz.vercel.app`

### 배포 방식
- GitHub `main` 브랜치에 push하면 **Vercel이 자동으로 Production 배포**합니다.

### Vercel 필수 설정
- **Node.js 버전**: `20.x`
- **Environment Variables** (Production/Preview/Development 모두 등록 권장)
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`

### Supabase Auth 설정 (배포 도메인 반영)
Supabase 대시보드 → Authentication → URL Configuration
- **Site URL**: `https://dramlog-topaz.vercel.app`
- **Redirect URLs**:
  - `https://dramlog-topaz.vercel.app/*`
  - `https://*.vercel.app/*` (Preview 도메인까지 사용할 경우)

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경 변수 설정
# .env 파일을 생성하고 다음 내용 추가:
# PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:5173 열기
```

### 로컬 네트워크(같은 Wi‑Fi)에서 접속하기 (Vite)

다른 기기(휴대폰/태블릿)에서 내 PC의 IP로 접근하려면 dev server를 `--host`로 실행하면 됩니다.

```bash
# 같은 네트워크에서 내 PC IP로 접속 허용
npm run dev -- --host
```

- **접속**: `http://<내PC의-로컬-IP>:5173`
- **주의**: 개발 서버를 외부에 노출하는 것이므로, 공용 네트워크에서는 사용하지 않는 것을 권장합니다.

### Supabase 설정

1. [Supabase 대시보드](https://app.supabase.com)에서 프로젝트 생성
2. 프로젝트 URL과 Anon Key 확인 (Settings → API)
3. SQL Editor에서 `supabase-schema.sql` 파일의 내용을 실행하여 테이블 생성 (`posts`, `comments`, `likes`)
4. RLS (Row Level Security)는 MVP 단계에서 비활성화 (테이블 생성 SQL에 포함됨)
5. `.env` 파일에 환경 변수 설정 (위 참조)

### 빌드

```bash
# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 📁 프로젝트 구조

```
dramlog/
├── src/
│   ├── lib/
│   │   ├── components/          # 재사용 컴포넌트
│   │   │   ├── Header.svelte
│   │   │   ├── Footer.svelte
│   │   │   ├── PostCard.svelte
│   │   │   ├── SearchBar.svelte
│   │   │   ├── Pagination.svelte
│   │   │   ├── Skeleton.svelte
│   │   │   ├── LikeButton.svelte
│   │   │   ├── CommentForm.svelte
│   │   │   ├── CommentList.svelte
│   │   │   └── CommentItem.svelte
│   │   └── server/              # 서버 전용 코드
│   │       └── supabase/
│   │           ├── client.ts   # Supabase 클라이언트 생성
│   │           ├── auth.ts     # 인증(쿠키 세션) 헬퍼
│   │           ├── types.ts     # 타입 정의
│   │           └── queries/
│   │               ├── posts.ts    # 게시글 쿼리 함수
│   │               ├── comments.ts # 댓글 쿼리 함수
│   │               └── likes.ts    # 좋아요 쿼리 함수
│   ├── routes/
│   │   ├── +layout.svelte       # 공통 레이아웃
│   │   ├── +layout.server.ts    # 전역 세션 로드 (Header에서 사용)
│   │   ├── +page.svelte         # 메인 페이지
│   │   ├── login/               # 로그인
│   │   ├── signup/              # 회원가입
│   │   ├── logout/              # 로그아웃
│   │   ├── my-posts/            # 내 글 목록
│   │   ├── search/              # 검색 결과
│   │   ├── contact/             # 문의
│   │   ├── posts/               # 게시글 관련 페이지
│   │   │   ├── +page.svelte     # 게시글 리스트
│   │   │   └── [id]/
│   │   │       ├── +page.svelte # 게시글 상세
│   │   │       └── edit/
│   │   │           └── +page.svelte # 게시글 수정
│   │   └── write/               # 글 작성 페이지
│   ├── app.css                  # Tailwind CSS
│   └── app.html                 # HTML 템플릿
├── supabase-schema.sql          # Supabase 테이블 스키마
├── .cursorrules                 # Cursor AI 규칙
└── web-dev-guidelines.md        # 개발 가이드라인
```

## 🎨 기능

### 현재 구현된 기능 (MVP 1-3단계 완료 ✅)

#### MVP 1-2단계: 기본 기능
- ✅ 메인 페이지 (커뮤니티 소개 + 최신 글 목록)
- ✅ 게시글 리스트 페이지
- ✅ 게시글 상세 페이지
- ✅ 글 작성 페이지 (Supabase 저장)
- ✅ 공통 레이아웃 (헤더/푸터)
- ✅ Supabase 통합 (완전 전환 완료)
- ✅ 게시글 CRUD 기능 (생성, 조회, 목록)

#### MVP 3단계: 게시글 관리 기능
- ✅ 게시글 수정 기능 (`/posts/[id]/edit`)
- ✅ 게시글 삭제 기능 (상세 페이지)
- ✅ 쿼리 계층 구조 (`src/lib/server/supabase/queries/posts.ts`)

### 다음 단계 (예정)

#### MVP 4단계: 익명 게시판 + 선택 로그인 (개인 DB) (완료 ✅)
- ✅ 익명 게시글 작성 (로그인 불필요, 기본 작성자명: "익명의 위스키 러버")
- ✅ 게시글 비밀번호로 수정/삭제 관리 (서버에서 해시 저장/검증)
- ✅ 선택 로그인 기능 (Supabase Auth) - 개인 DB(보유 위스키, 북마크 등)용
- ✅ 내 글 목록 (`/my-posts`) - 로그인 사용자가 작성한 글만 조회
- ✅ 로그인 사용자 글 작성: 닉네임 자동 적용, 비밀번호 입력 불필요, `user_id`로 수정/삭제
- ✅ 익명/로그인 구분: 같은 페이지(`/write`)에서 로그인 여부에 따라 UI/로직 자동 분기

#### MVP 5단계: 핵심 기능 강화 (완료 ✅)
- ✅ 검색 기능 (게시글 제목/내용 검색) - Header 검색바 + `/search` 라우트
- ✅ 페이지네이션 (12개/페이지) - `/posts`, `/my-posts`, `/search`에 적용
- ✅ 댓글 시스템 (로그인 사용자 전용) - 게시글 상세 페이지에 통합
- ✅ 좋아요 기능 (로그인 사용자 전용) - 게시글 상세 페이지에 통합

#### MVP 6단계: UI/UX 개선 (진행 중 🔄)
- ✅ 모던 UI 리프레시 (헤더/배경/전역 스타일 개선)
  - 헤더: 라이트 톤 + 반투명 + backdrop-blur 스타일
  - 배경: 위스키 계열 그라데이션 + 노이즈 패턴
  - 전역 스타일: 폰트 렌더링, 포커스 링, 선택 색상 통일
- ✅ 메인 페이지 정리 (게시글 목록/작성만 남기고 문의 추가)
- ✅ 문의 페이지 추가 (`/contact`)
- 🔄 반응형 디자인 세부 개선 (모바일/태블릿/데스크톱)
- 🔄 로딩 상태 표시 (스켈레톤 UI)
- 🔄 에러 메시지 개선
- 🔄 토스트 알림 시스템 (선택)
- ✅ 좋아요/댓글 UX 개선: redirect 없이 `use:enhance`로 즉시 반영 (낙관적 업데이트)
- ✅ 권한 UX/보안 강화:
  - 로그인 글: 작성자 본인만 수정/삭제(비밀번호 없음)
  - 익명 글: 로그아웃 상태에서만 비밀번호로 수정/삭제

### 향후 추가 예정
- 이미지 업로드 (Supabase Storage)
- 사용자 프로필 페이지
- 북마크 기능
- 태그 시스템
- 위스키 정보 데이터베이스

## 🛠 기술 스택

- **SvelteKit**: 프레임워크 (SSR 지원)
- **Tailwind CSS**: 유틸리티 기반 CSS
- **Supabase**: PostgreSQL 기반 BaaS
  - 데이터베이스: PostgreSQL (Supabase 호스팅)
  - 인증: Supabase Auth (선택 로그인)
- **TypeScript**: 타입 안정성
- **Vite**: 빌드 도구

## 📝 개발 가이드라인

자세한 개발 가이드라인은 다음 파일을 참조하세요:
- `.cursorrules`: Cursor AI 개발 규칙
- `web-dev-guidelines.md`: 상세 개발 가이드라인

### 핵심 원칙
- **Tailwind CSS만 사용**: 일반 CSS 작성 최소화
- **컴포넌트 분리**: 작은 단위로 컴포넌트 분리
- **쿼리 계층**: 모든 DB 접근은 `src/lib/server/supabase/queries/`를 통해서만
- **서버 전용**: `src/lib/server/` 아래 코드는 서버에서만 실행

## 🎨 디자인

DramLog를 위한 따뜻한 색감 (골드, 앰버, 다크 브라운)을 사용합니다.
- **색감**: 위스키 커뮤니티 느낌의 따뜻한 톤
- **반응형**: Mobile First 접근
- **UI**: 모던하고 깔끔한 디자인, Tailwind 기본 스타일 활용

## 📅 업데이트 이력

- **2026-01-21**: MVP 6단계 시작 (모던 UI 리프레시: 헤더/배경/전역 스타일, 메인 페이지 정리, 문의 페이지 추가)
- **2026-01-21**: MVP 5단계 완료 (검색, 페이지네이션, 댓글, 좋아요)
- **2026-01-21**: UI 개선 (loatto.kr 스타일 메인 페이지, ASCII art 로고, 반응형 헤더)
- **2026-01-21**: MVP 4단계 완료 (익명 게시판 + 선택 로그인, 로그인 사용자 글 작성)
- **2026-01-20**: MVP 3단계 완료 (게시글 수정/삭제 기능)
- **2026-01-20**: Supabase 통합 완료
- **2026-01-20**: 프로젝트 이름 DramLog로 통일
- **2026-01-22**: Vercel 배포 완료 (Node 20 고정, 환경변수/Redirect URL 설정)