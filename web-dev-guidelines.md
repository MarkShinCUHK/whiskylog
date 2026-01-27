# DramLog 개발 가이드라인

이 문서는 SvelteKit (Svelte 5) + Tailwind CSS 기반의 DramLog (위스키 리뷰/게시글 커뮤니티) 개발 시 따라야 할 상세 가이드라인을 정의합니다.

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [SvelteKit 구조](#sveltekit-구조)
4. [Tailwind CSS 가이드](#tailwind-css-가이드)
5. [컴포넌트 설계](#컴포넌트-설계)
6. [라우팅 구조](#라우팅-구조)
7. [디자인 시스템](#디자인-시스템)
8. [코딩 컨벤션](#코딩-컨벤션)

---

## 프로젝트 개요

### 목표
- DramLog: 위스키 리뷰 및 게시글 커뮤니티 플랫폼
- 1인 개발 기준의 MVP 구현
- 서버사이드 렌더링(SSR) 기반의 빠른 로딩
- Tailwind CSS만 사용한 스타일링
- Supabase (PostgreSQL 기반 BaaS) 사용

### 현재 단계 (2026-01-26 기준)
- ✅ 기본 라우트 구조 설계 및 구현
- ✅ Tailwind 기반 UI 스켈레톤 생성
- ✅ 위스키 커뮤니티 느낌의 색감/톤 적용
- ✅ MVP 기능 구현 완료
  - ✅ 메인 페이지 (커뮤니티 소개 + 최신 글 목록)
  - ✅ 게시글 리스트 페이지
  - ✅ 게시글 상세 페이지
  - ✅ 글 작성 페이지 (Supabase 저장)
  - ✅ 게시글 목록 페이지 (Supabase 조회)
  - ✅ 게시글 상세 페이지 (Supabase 조회)
  - ✅ 공통 레이아웃 (Header, Footer)
- ✅ Supabase 통합 완료 (글 작성/목록/상세 - 완전 전환)
- ✅ 데이터베이스 스키마 생성 (Supabase posts 테이블)
- ✅ 게시글 CRUD 기능 구현 (생성, 조회, 목록)
- ✅ Supabase 쿼리 계층 구조 구축 (`src/lib/server/supabase/queries/posts.ts`)
- ✅ 프로젝트 이름 DramLog로 통일
- ✅ 날짜 2026-01-22 기준으로 업데이트
- ✅ Svelte 5 도입 완료 (신규 컴포넌트는 Runes 모드, 기존 컴포넌트는 점진적 마이그레이션)
- ✅ 검색 필터 추가 (작성자/날짜/정렬)
- ✅ 대표 이미지(썸네일) 선택 기능
- ✅ 알림 기능 (좋아요/댓글) + `/notifications` 라우트

---

## 기술 스택

### 핵심 스택
- **SvelteKit**: 프레임워크 (SSR 지원)
- **Svelte 5**: 프론트엔드 프레임워크 (Runes 모드 사용)
- **Tailwind CSS**: 유틸리티 기반 CSS 프레임워크
- **Supabase**: PostgreSQL 기반 BaaS (Backend as a Service)
  - 데이터베이스: PostgreSQL (Supabase 호스팅)
  - 인증: Supabase Auth (선택 로그인 - 회원가입/로그인/로그아웃/내 글 목록)
  - 스토리지: Supabase Storage (이미지 업로드 기능 구현 완료 ✅)
- **TipTap**: 리치 텍스트 에디터 (게시글 작성/수정에 사용)
- **TypeScript**: 타입 안정성 (서버 로직/타입 정의에 사용)

### 개발 도구
- **Vite**: 빌드 도구 (SvelteKit 내장)
- **ESLint**: 코드 품질 관리
- **Prettier**: 코드 포맷팅 (선택사항)

### 현재 제외
- ❌ (없음) 기본 로그인 기능은 이미 구현됨 (선택 로그인)
- ❌ 복잡한 상태 관리 라이브러리

---

## SvelteKit 구조

### 파일 기반 라우팅

```
src/routes/
├── +layout.svelte          # 루트 레이아웃 (헤더/푸터)
├── +layout.server.ts       # 전역 세션 로드 (Header 등에서 사용)
├── +page.svelte            # 메인 페이지 (/)
├── +error.svelte           # 에러 페이지
├── contact/
│   └── +page.svelte        # 문의 페이지 (/contact)
├── search/
│   ├── +page.svelte        # 검색 결과 (/search)
│   └── +page.server.ts     # 검색 로직
├── notifications/
│   ├── +page.svelte        # 알림 목록 (/notifications)
│   └── +page.server.ts     # 알림 로직
├── login/                  # 로그인
├── signup/                 # 회원가입
├── logout/                 # 로그아웃
├── my-posts/               # 내 글 목록
├── posts/
│   ├── +page.svelte        # 게시글 리스트 (/posts)
│   ├── +page.server.ts     # 서버 로직 (Supabase)
│   └── [id]/
│       ├── +page.svelte    # 게시글 상세 (/posts/[id])
│       ├── +page.server.ts # 서버 로직 (Supabase)
│       └── edit/
│           ├── +page.svelte
│           └── +page.server.ts
└── write/
    ├── +page.svelte        # 글 작성 (/write)
    └── +page.server.ts     # 서버 액션 (Supabase)
```

### 주요 파일 타입
- `+page.svelte`: 페이지 컴포넌트
- `+layout.svelte`: 레이아웃 컴포넌트
- `+page.server.ts`: 서버 사이드 로직 (load 함수)
- `+page.ts`: 클라이언트/서버 공통 로직

### 예시: 서버 로직 (Supabase 쿼리 계층 사용)

```typescript
// src/routes/posts/+page.server.ts
import { listPosts } from '$lib/server/supabase/queries/posts';

export async function load() {
  try {
    // Supabase에서 게시글 목록 조회
    const posts = await listPosts();
    return {
      posts
    };
  } catch (error) {
    console.error('게시글 목록 로드 오류:', error);
    return {
      posts: []
    };
  }
}
```

### 데이터 계층 구조

```
src/lib/server/supabase/
├── client.ts              # Supabase 클라이언트 생성
├── auth.ts                # 쿠키 기반 세션 헬퍼
├── types.ts               # PostRow (DB), Post (UI) 타입 정의
└── queries/
    ├── posts.ts           # 게시글 쿼리 함수들
    ├── comments.ts        # 댓글 CRUD
    └── likes.ts           # 좋아요 토글/조회
        - listPosts()       # 목록 조회
        - getPostById()     # 상세 조회
        - createPost()      # 생성
```

**데이터 변환 흐름:**
- Supabase에서 가져온 `PostRow` (DB 스키마) → `mapRowToPost()` → `Post` (UI용 DTO)
- 모든 DB 접근은 `queries/posts.ts`의 함수들을 통해서만 수행
- `+page.server.ts`에서는 직접 Supabase 클라이언트를 사용하지 않고, 쿼리 함수만 호출

---

## Tailwind CSS 가이드

### 기본 원칙
- **유틸리티 클래스 우선**: 모든 스타일은 Tailwind 클래스로 작성
- **일반 CSS 최소화**: Tailwind로 불가능한 경우만 예외
- **커스텀 클래스 지양**: `@apply` 사용 최소화

### 좋은 예

```svelte
<!-- ✅ 좋은 예: Tailwind 유틸리티 클래스 사용 -->
<button class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
  작성하기
</button>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-amber-900 mb-4">위스키 리뷰</h1>
</div>
```

### 나쁜 예

```svelte
<!-- ❌ 나쁜 예: 인라인 스타일 또는 커스텀 CSS -->
<button style="padding: 8px 16px; background: #d97706;">
  작성하기
</button>

<style>
  .container {
    max-width: 896px;
    margin: 0 auto;
  }
</style>
```

### Tailwind 설정 (tailwind.config.js)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // 위스키 테마 색상
        whiskey: {
          50: '#fef8f0',
          100: '#fef0d9',
          200: '#fcdeb3',
          300: '#f9c582',
          400: '#f5a84d',
          500: '#f18a1c', // Primary
          600: '#d97706', // Hover
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
    },
  },
  plugins: [],
};
```

---

## 컴포넌트 설계

### 컴포넌트 구조

```
src/lib/
├── components/
│   ├── Header.svelte      # 헤더 컴포넌트 ✅
│   ├── Footer.svelte     # 푸터 컴포넌트 ✅
│   ├── PostCard.svelte   # 게시글 카드 컴포넌트 ✅
│   ├── SearchBar.svelte  # 검색바 ✅
│   ├── Pagination.svelte # 페이지네이션 ✅
│   ├── Skeleton.svelte   # 로딩 스켈레톤 ✅
│   ├── LikeButton.svelte # 좋아요 버튼 ✅
│   ├── CommentForm.svelte # 댓글 작성 폼 ✅
│   ├── CommentList.svelte # 댓글 목록 ✅
│   ├── CommentItem.svelte # 댓글 아이템 ✅
│   ├── RichTextEditor.svelte # TipTap 리치 텍스트 에디터 ✅
│   ├── Toast.svelte      # 토스트 알림 ✅
│   └── ToastContainer.svelte # 토스트 컨테이너 ✅
├── stores/
│   └── toast.ts          # 토스트 알림 store ✅
└── server/
    └── supabase/
        ├── client.ts     # Supabase 클라이언트 생성 ✅
        ├── auth.ts       # 인증 헬퍼 ✅
        ├── types.ts      # 타입 정의 ✅
        └── queries/
            ├── posts.ts   # 게시글 쿼리 함수 ✅
            ├── comments.ts # 댓글 쿼리 함수 ✅
            ├── likes.ts   # 좋아요 쿼리 함수 ✅
            ├── storage.ts # 이미지 업로드 함수 ✅
            ├── images.ts  # Blob URL 변환 함수 ✅
            └── notifications.ts # 알림 쿼리 함수 ✅
```

### 컴포넌트 예시

```svelte
<!-- src/lib/components/PostCard.svelte -->
<script>
  export let post;
</script>

<article class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
  <h2 class="text-xl font-bold text-gray-900 mb-2">
    <a href="/posts/{post.id}" class="hover:text-whiskey-600">
      {post.title}
    </a>
  </h2>
  <div class="flex items-center justify-between text-sm text-gray-500">
    <span>{post.author}</span>
    <span>{post.createdAt}</span>
  </div>
</article>
```

### 컴포넌트 사용

```svelte
<!-- src/routes/posts/+page.svelte -->
<script>
  import PostCard from '$lib/components/PostCard.svelte';
  
  export let data;
</script>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-whiskey-900 mb-8">게시글 목록</h1>
  <div class="space-y-4">
    {#each data.posts as post}
      <PostCard {post} />
    {/each}
  </div>
</div>
```

---

## 라우팅 구조

### MVP 라우트

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `src/routes/+page.svelte` | 메인 페이지 (커뮤니티 소개 + 최신 글) |
| `/posts` | `src/routes/posts/+page.svelte` | 게시글 리스트 |
| `/posts/[id]` | `src/routes/posts/[id]/+page.svelte` | 게시글 상세 |
| `/write` | `src/routes/write/+page.svelte` | 글 작성 |

### 네비게이션 예시

```svelte
<!-- src/lib/components/Header.svelte -->
<nav class="bg-whiskey-900 text-white">
  <div class="max-w-6xl mx-auto px-4 py-4">
    <div class="flex items-center justify-between">
      <a href="/" class="text-2xl font-bold">DramLog</a>
      <div class="flex gap-4">
        <a href="/posts" class="hover:text-whiskey-300">게시글</a>
        <a href="/write" class="hover:text-whiskey-300">작성하기</a>
      </div>
    </div>
  </div>
</nav>
```

---

## 디자인 시스템

### 색상 팔레트 (위스키 테마)

```javascript
// Tailwind 설정에서 정의
whiskey: {
  50: '#fef8f0',   // 가장 밝은 베이지
  100: '#fef0d9',  // 밝은 크림
  200: '#fcdeb3',  // 라이트 골드
  300: '#f9c582',  // 골드
  400: '#f5a84d',  // 앰버
  500: '#f18a1c',  // Primary (주요 액션)
  600: '#d97706',  // Hover 상태
  700: '#b45309',  // 다크 앰버
  800: '#92400e',  // 브라운
  900: '#78350f',  // 다크 브라운 (텍스트)
}
```

### 타이포그래피

- **제목 (h1)**: `text-4xl font-bold text-whiskey-900`
- **제목 (h2)**: `text-3xl font-bold text-whiskey-800`
- **제목 (h3)**: `text-2xl font-semibold text-whiskey-800`
- **본문**: `text-base text-gray-700`
- **작은 텍스트**: `text-sm text-gray-500`

### 간격 시스템

Tailwind 기본 간격 사용:
- `p-4` (16px), `p-6` (24px), `p-8` (32px)
- `gap-4`, `gap-6`, `gap-8`
- `space-y-4`, `space-y-6`

### 버튼 스타일

```svelte
<!-- Primary 버튼 -->
<button class="px-6 py-3 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium">
  작성하기
</button>

<!-- Secondary 버튼 -->
<button class="px-6 py-3 bg-white text-whiskey-600 border-2 border-whiskey-600 rounded-lg hover:bg-whiskey-50 transition-colors font-medium">
  취소
</button>
```

---

## 코딩 컨벤션

### Svelte 5 컴포넌트 구조 (Runes 모드)

```svelte
<script lang="ts">
  // 1. Imports
  import Component from '$lib/components/Component.svelte';
  
  // 2. Props (Svelte 5 Runes)
  let { prop1, prop2 = 'default' }: { prop1: string; prop2?: string } = $props();
  
  // 3. State (반응성 변수)
  let count = $state(0);
  
  // 4. Derived (파생 값)
  let computed = $derived(prop1.length * 2);
  
  // 5. Effects (사이드 이펙트)
  $effect(() => {
    console.log('prop1 changed:', prop1);
  });
  
  // 6. Functions
  function handleClick() {
    count++;
  }
</script>

<!-- 7. Markup -->
<div class="...">
  <!-- ... -->
</div>

<!-- 8. Styles (최소화) -->
<style>
  /* Tailwind로 불가능한 경우만 */
</style>
```

**Svelte 5 마이그레이션 정책 (2026-01-22~)**
- 신규 컴포넌트는 Runes 모드로 작성
- 기존 컴포넌트는 점진적으로 마이그레이션
- 권장 변환:
  - `export let` → `let { prop } = $props()`
  - `$: computed = ...` → `let computed = $derived(...)`
  - `$: { ... }` → `$effect(() => { ... })`
  - `createEventDispatcher()` → 함수 props (`let { onevent } = $props()`)

### 네이밍 규칙

- **컴포넌트**: PascalCase (`PostCard.svelte`)
- **변수/함수**: camelCase (`getPostData`, `handleSubmit`)
- **상수**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **파일**: kebab-case 또는 PascalCase (컴포넌트는 PascalCase)

### 주석 규칙

```svelte
<script>
  // 한국어 주석 사용
  // 게시글 데이터를 가져옵니다
  export let data;
  
  /**
   * 게시글을 삭제합니다
   * @param {number} id - 게시글 ID
   */
  async function deletePost(id) {
    // ...
  }
</script>
```

---

## 성능 최적화

### SvelteKit 최적화
- SSR 활용으로 초기 로딩 속도 향상
- 코드 스플리팅 자동 적용
- 이미지 최적화 (향후 추가 예정)
  - ✅ 기본 업로드 기능 구현 완료 (Supabase Storage)
  - ✅ 이미지 압축 기능 (클라이언트 리사이즈/압축)
  - Lazy loading
  - WebP 형식 지원
  - 썸네일 생성

### Tailwind 최적화
- Production 빌드 시 미사용 CSS 자동 제거
- JIT 모드로 필요한 클래스만 생성

---

## 접근성

### 기본 접근성 고려사항
- 시맨틱 HTML 태그 사용 (`<header>`, `<nav>`, `<main>`, `<article>`)
- ARIA 레이블 추가 (필요시)
- 키보드 네비게이션 지원
- 색상 대비 충분히 확보 (WCAG AA 기준)

```svelte
<!-- 좋은 예 -->
<button 
  type="button"
  aria-label="게시글 작성하기"
  class="..."
>
  작성하기
</button>
```

---

## 다음 단계

### MVP 1단계 완료 ✅ (2026-01-20)
1. ✅ 기본 라우트 구조
2. ✅ Tailwind UI 스켈레톤
3. ✅ 위스키 테마 색상 적용
4. ✅ 메인 페이지 구현
5. ✅ 게시글 리스트/상세 페이지
6. ✅ 글 작성 페이지
7. ✅ 공통 컴포넌트 (Header, Footer, PostCard)

### MVP 2단계 완료 ✅ (2026-01-20)
- ✅ Supabase 통합 완료 (글 작성/목록/상세 - 완전 전환)
- ✅ Supabase 쿼리 계층 구조 구축 (`src/lib/server/supabase/queries/posts.ts`)
- ✅ 게시글 CRUD 기능 (생성, 조회, 목록) 완료
- ✅ 레거시 PostgreSQL 코드 제거 완료

### MVP 3단계: 게시글 관리 기능 (완료 ✅)
**목표**: 게시글 수정 및 삭제 기능 구현

1. ✅ **게시글 수정 기능**
   - 라우트: `/posts/[id]/edit` 구현 완료
   - 파일 구조:
     - `src/routes/posts/[id]/edit/+page.svelte` (수정 폼) ✅
     - `src/routes/posts/[id]/edit/+page.server.ts` (서버 액션) ✅
   - 기능:
     - 기존 게시글 데이터 로드 (`load` 함수) ✅
     - 수정 폼에 기존 데이터 자동 입력 ✅
     - 서버 액션으로 업데이트 (`updatePost` 함수) ✅
    - 수정 완료 후 상세 페이지로 이동 ✅
   - 쿼리 함수: `src/lib/server/supabase/queries/posts.ts`에 `updatePost(id, input)` 추가 완료 ✅
  - 권한(강제): 로그인 글은 작성자만 수정 가능, 익명 글은 **로그아웃 상태에서만** 비밀번호로 수정 가능 ✅

2. ✅ **게시글 삭제 기능**
   - 위치: 게시글 상세 페이지 (`/posts/[id]`) ✅
   - 기능:
     - 삭제 버튼 추가 ✅
     - 삭제 확인 다이얼로그 (confirm) ✅
     - 서버 액션으로 삭제 (`deletePost` 함수) ✅
    - 삭제 완료 후 게시글 목록으로 이동 ✅
   - 쿼리 함수: `src/lib/server/supabase/queries/posts.ts`에 `deletePost(id)` 추가 완료 ✅
  - 권한(강제): 로그인 글은 작성자만 삭제 가능, 익명 글은 **로그아웃 상태에서만** 비밀번호로 삭제 가능 ✅

3. ✅ **구현 세부사항**
   - 에러 처리: 존재하지 않는 게시글, 잘못된 ID 등 처리 완료 ✅
   - UI: Tailwind로 버튼 스타일링 완료 ✅
   - 사용자 피드백: confirm 다이얼로그로 삭제 확인 ✅

### MVP 4단계: 익명 게시판 + 선택 로그인 (개인 DB) (완료 ✅)
**목표**: 디시 위스키갤 스타일의 익명 게시판 구현 (로그인 없이 글 작성 가능, 비밀번호로 관리)

1. ✅ **익명 게시글 작성 기능**
   - 로그인 없이 게시글 작성 가능
   - 기본 작성자명: `익명의 위스키 러버` (작성자명 입력은 선택사항)
   - 게시글 작성 시 비밀번호 필수 입력 (수정/삭제용)

2. ✅ **게시글 비밀번호 관리**
   - `posts` 테이블에 `edit_password_hash TEXT` 컬럼 추가
   - 서버에서 비밀번호를 scrypt 해시로 저장 (평문 저장 금지)
   - 수정/삭제 시 비밀번호 검증 (timing-safe 비교)

3. ✅ **데이터베이스 스키마**
   - `author_name TEXT NOT NULL DEFAULT '익명의 위스키 러버'`
   - `edit_password_hash TEXT` (익명 글이면 값 존재)
   - `user_id UUID` (선택 로그인 도입 시 사용, 게스트 글 Claim 없음)

4. ✅ **구현 완료**
   - `/write`: 로그인 여부에 따라 UI 분기 (로그인: 닉네임 자동/비번 없음, 익명: 작성자 선택/비번 필수)
   - `/posts/[id]/edit`: 로그인 글은 `user_id`로 수정, 익명 글은 비밀번호 검증
   - `/posts/[id]`: 로그인 글은 `user_id`로 삭제, 익명 글은 비밀번호 검증
   - 쿼리 계층: `createPost()`, `updatePost()`, `deletePost()`에 (로그인 `user_id`) 또는 (익명 비밀번호) 둘 다 지원

5. ✅ **선택 로그인 기능** (Supabase Auth)
   - ✅ 라우트: `/login`, `/signup`, `/logout`, `/my-posts`
   - ✅ 전역 세션 로드: `src/routes/+layout.server.ts`
   - ✅ 쿠키 세션 헬퍼: `src/lib/server/supabase/auth.ts`
   - ✅ 로그인 사용자 글 작성: 닉네임(`user_metadata.nickname`) 자동 적용, 비밀번호 입력 불필요, `user_id`로 수정/삭제
   - ✅ 익명/로그인 구분: 같은 페이지(`/write`)에서 `$page.data.user`로 로그인 여부 확인하여 UI/로직 자동 분기
   - 로그인은 개인 DB(보유 위스키, 북마크 등)용으로만 사용
   - 내 글 목록: `/my-posts` (posts.user_id 기준)
   - 게스트 글 Claim 기능 없음 (익명 글은 계속 익명 소유)

### MVP 5단계: 핵심 기능 강화 (완료 ✅)
**목표**: 커뮤니티 기능 확장

1. ✅ **검색 기능**
   - **파일 구조**:
     ```
     src/
     ├── routes/
     │   └── search/
     │       ├── +page.svelte (검색 결과 페이지)
     │       └── +page.server.ts (검색 로직)
     ├── lib/
     │   ├── server/
     │   │   └── supabase/
     │   │       └── queries/
     │   │           └── posts.ts (searchPosts 함수 추가)
     │   └── components/
     │       └── SearchBar.svelte (검색바 컴포넌트)
     ```
   - ✅ **구현 완료**:
     - 검색바 컴포넌트: Header에 통합 (데스크톱/모바일 반응형)
     - 검색 쿼리 함수: `searchPosts(query, { limit, offset })`, `getSearchPostCount(query)` - Supabase `ilike` 사용
     - ✅ 필터: 작성자/날짜/정렬 지원
     - 검색 결과 페이지: 쿼리 파라미터 `q` 읽기, 결과 목록 표시, 페이지네이션 지원
     - 파일: `src/lib/components/SearchBar.svelte`, `src/routes/search/+page.svelte`, `src/routes/search/+page.server.ts`

2. ✅ **페이지네이션** (12개/페이지)
   - ✅ **구현 완료**:
     - `/posts`, `/my-posts`, `/search`에 페이지네이션 적용
     - 쿼리 함수: `listPosts(limit, offset)`, `getPostCount()`, `getMyPosts(userId, limit, offset)`, `getMyPostCount(userId)`
     - UI 컴포넌트: `Pagination.svelte` (이전/다음, 페이지 번호, ellipsis 지원)
     - 서버 로드: `page` 파라미터 파싱, `limit/offset` 계산, `totalPages` 계산

3. ✅ **댓글 시스템** (로그인 사용자 전용)
   - **파일 구조**:
     ```
     src/
     ├── routes/
     │   └── posts/
     │       └── [id]/
     │           └── +page.svelte (댓글 섹션 추가)
     ├── lib/
     │   ├── server/
     │   │   └── supabase/
     │   │       ├── queries/
     │   │       │   └── comments.ts (댓글 CRUD 함수)
     │   │       └── types.ts (Comment 타입 추가)
     │   └── components/
     │       ├── CommentList.svelte (댓글 목록)
     │       ├── CommentForm.svelte (댓글 작성 폼)
     │       └── CommentItem.svelte (댓글 아이템)
     ```
   - ✅ **데이터베이스 스키마**: `comments` 테이블 생성 완료 (`supabase-schema.sql`에 포함)
   - ✅ **구현 완료**:
     - 댓글 쿼리 함수: `listComments()`, `createComment()`, `updateComment()`, `deleteComment()` (`src/lib/server/supabase/queries/comments.ts`)
     - 댓글 컴포넌트: `CommentList.svelte`, `CommentForm.svelte`, `CommentItem.svelte`
     - 게시글 상세 페이지(`/posts/[id]`)에 댓글 섹션 통합
     - 로그인 사용자만 댓글 작성/수정/삭제 가능
     - 본인 댓글만 수정/삭제 가능
     - 서버 액션: `createComment`, `deleteComment` (`/posts/[id]/+page.server.ts`)

4. ✅ **좋아요 기능** (로그인 사용자 전용)
   - **파일 구조**:
     ```
     src/
     ├── lib/
     │   ├── server/
     │   │   └── supabase/
     │   │       ├── queries/
     │   │       │   └── likes.ts (좋아요 함수)
     │   │       └── types.ts (Like 타입 추가)
     │   └── components/
     │       └── LikeButton.svelte (좋아요 버튼)
     ```
   - ✅ **데이터베이스 스키마**: `likes` 테이블 생성 완료 (`supabase-schema.sql`에 포함, UNIQUE 제약조건, 인덱스 포함)
   - ✅ **구현 완료**:
     - 좋아요 쿼리 함수: `getLikeCount()`, `isLiked()`, `toggleLike()` (`src/lib/server/supabase/queries/likes.ts`)
     - LikeButton 컴포넌트: 하트 아이콘, 좋아요 개수 표시, 클릭 시 토글
     - 게시글 상세 페이지(`/posts/[id]`)에 LikeButton 컴포넌트 통합
   - 로그인 사용자만 좋아요 가능
   - 서버 액션: `toggleLike` (`/posts/[id]/+page.server.ts`)

5. ✅ **조회수 집계**
  - `posts.view_count` 컬럼 추가 (`supabase-schema.sql`)
  - `increment_post_view()` 함수로 조회수 증가 (RLS 우회)
  - 쿠키 기반 중복 방지 (24시간)

6. ✅ **알림 기능**
  - `/notifications` 라우트 추가
  - 좋아요/댓글 알림 생성 및 읽음 처리
  - 헤더에 읽지 않은 알림 배지 표시

### MVP 6단계: UI/UX 개선 (완료 ✅)
**목표**: 사용자 경험 향상 및 반응형 최적화

1. ✅ **모던 UI 리프레시** (완료)
   - ✅ **헤더 모던화** (`src/lib/components/Header.svelte`):
     - 라이트 톤 (화이트/반투명) + backdrop-blur 스타일
     - sticky 포지셔닝으로 스크롤 시 상단 고정
     - 글씨 가독성 개선 (진한 텍스트 색상)
     - 버튼/링크 톤 통일 (작성하기는 위스키 컬러 강조)
   - ✅ **배경 톤 업그레이드** (`src/routes/+layout.svelte`):
     - 위스키 계열 그라데이션 + 노이즈 패턴
     - 단순 `bg-gray-50` → 모던한 그라데이션 배경
   - ✅ **전역 스타일 개선** (`src/app.css`):
     - 폰트 렌더링 최적화 (antialiasing)
     - 포커스 링 통일 (`focus-visible`)
     - 선택 색상 통일 (위스키 컬러)
   - ✅ **메인 페이지 정리** (`src/routes/+page.svelte`):
     - 게시글 목록/작성만 남기고 나머지 제거
     - 문의 카드 추가 (`/contact` 링크)
   - ✅ **문의 페이지 추가** (`src/routes/contact/+page.svelte`):
     - Discord, 오픈카카오톡, Email 연락처 (임시 텍스트)
   - ✅ **푸터 정리** (`src/lib/components/Footer.svelte`):
     - 밝은 반투명 톤 + 얇은 구분선

2. ✅ **반응형 디자인 세부 개선** (완료)
   - **모바일 최적화** (< 640px):
     - Header: 햄버거 메뉴 또는 간소화된 네비게이션
     - 게시글 목록: 단일 컬럼, 카드 레이아웃
     - 버튼: 터치 친화적 크기 (최소 44x44px)
   - **태블릿 레이아웃** (640px - 1024px):
     - 게시글 목록: 2컬럼 그리드
     - 사이드바 또는 추가 정보 표시
   - **데스크톱 레이아웃** (> 1024px):
     - 최대 너비 제한 (예: max-w-7xl)
     - 최적화된 여백 및 간격
   - **Tailwind 반응형 클래스 활용**: `sm:`, `md:`, `lg:`, `xl:` 브레이크포인트 사용, Mobile First 접근

2. **사용자 경험 개선**
   - **로딩 상태**:
     - ✅ **스켈레톤 UI 컴포넌트** (`src/lib/components/Skeleton.svelte`) - 구현 완료:
       - 게시글 목록 로딩 시 스켈레톤 표시 (`/posts`, `/search` 페이지에서 `$navigating` 사용)
       - Tailwind 애니메이션 활용 (`animate-pulse`)
     - **SvelteKit `{#await}` 블록 활용**:
       - 비동기 데이터 로딩 상태 표시
       - 에러 상태 처리
   - **에러 처리**:
     - ✅ **에러 페이지 개선** (`src/routes/+error.svelte`):
       - 친화적인 에러 메시지
       - 홈으로 돌아가기 버튼
       - 에러 코드별 메시지 (404, 403, 500 등)
     - ✅ **폼 에러 처리**:
       - ✅ 실시간 유효성 검사 (`on:input`, `on:blur` 이벤트)
       - ✅ 필드별 에러 메시지 표시 (`clientFieldErrors`, `fieldErrors` 병합)
       - ✅ 서버 에러 메시지 표시
       - ✅ `touchedFields` 패턴: 필드가 blur되거나 입력이 시작된 경우에만 에러 표시
       - ✅ Svelte 반응성 보장: `clientFieldErrors` 객체 수정 시 재할당 필수
         ```javascript
         // ✅ 올바른 예
         clientFieldErrors = { ...clientFieldErrors };
         delete clientFieldErrors.title;
         ```
   - **브라우저 자동완성 방지**:
     - ✅ `autocomplete` 속성 추가:
       - `editPassword` 필드: `autocomplete="new-password"`
       - `editPasswordConfirm` 필드: `autocomplete="new-password"`
       - 수정 페이지 비밀번호: `autocomplete="current-password"`
   - **피드백**:
     - ✅ **토스트 알림 시스템**:
       - ✅ 성공/에러 메시지 표시 (`Toast.svelte`, `ToastContainer.svelte`)
       - ✅ 자동 사라짐 (5초)
       - ✅ Svelte store 기반 (`src/lib/stores/toast.ts`)
       - ✅ `showToast(message, type)` 함수로 간편 사용
       - ✅ 글 작성/수정/삭제 성공 시 토스트 메시지 표시
   - **페이지네이션**:
     - ✅ **게시글 목록 페이지네이션**: 12개/페이지 (`/posts`, `/my-posts`, `/search`)
     - ✅ **쿼리 함수**: `listPosts(limit, offset)`, `getPostCount()` 등
     - ✅ **컴포넌트**: `Pagination.svelte`

3. **성능 최적화**
   - **이미지 최적화** (향후 추가 예정):
     - ✅ 기본 업로드 기능 구현 완료 (Supabase Storage)
     - ✅ 이미지 압축 기능 (클라이언트 리사이즈/압축)
     - Lazy loading
     - WebP 형식 지원
     - 썸네일 생성
   - **코드 스플리팅**: SvelteKit의 자동 코드 스플리팅 활용
   - **DB 최적화**: 인덱스 추가, 쿼리 최적화, 연결 풀링 (Supabase에서 자동 관리)

### 이미지 삽입 기능 (완료 ✅)
**목표**: TipTap 리치 텍스트 에디터에 이미지 삽입 기능 추가

1. ✅ **TipTap Image Extension 통합**
   - `ResizableImage` 커스텀 확장 사용 (`@tiptap/extension-image` 기반)
   - `ResizableImage.configure({ inline: true, allowBase64: false })` 설정 (width/height 속성 지원)
   - 에디터 툴바에 "이미지" 버튼 추가

2. ✅ **클라이언트 이미지 처리**
   - 파일 형식 제한: JPG, PNG, WebP, GIF (클라이언트/서버 양쪽에서 검증)
   - `URL.createObjectURL(file)`로 Blob URL 생성하여 에디터에 즉시 삽입
   - `Map<string, File>`로 Blob URL과 File 객체 매핑 저장
   - `onImageAdd` 콜백으로 부모 컴포넌트에 이미지 정보 전달

3. ✅ **Supabase Storage 업로드**
   - Storage 버킷: `post-images` (공개 버킷)
   - RLS 정책: 읽기(모든 사용자), 쓰기(인증된 사용자), 삭제(업로드한 사용자)
   - 파일 경로: `posts/{userId}/{postId}/image_{index}.{extension}` (리소스 타입 기반 구조)
   - 쿼리 함수: `src/lib/server/supabase/queries/storage.ts`의 `uploadImage()` 사용
   - Blob URL 변환: `src/lib/server/supabase/queries/images.ts`의 `convertBlobUrlsToStorageUrls()` 사용
   - 게시글 삭제 시 이미지 자동 삭제: `deletePostImages()` 함수로 폴더 전체 삭제
   - 게시글 수정 시 이미지 관리: 삭제된 이미지 자동 삭제, 새 이미지 업로드

4. ✅ **FormData + File 업로드 규칙**
   - **`use:enhance` 사용 금지**: File 객체가 문자열 `"[object File]"`로 변환되는 문제 발생
   - **수동 FormData 생성**: `new FormData()`로 완전 수동 생성
   - **File append 시 `file.name` 명시**: `formData.append(name, file, file.name)` (매우 중요!)
   - **action 이름 명시적 지정**: `default` 대신 `create`, `update` 등 명시적 이름 사용
   - **onsubmit 핸들링**: `preventDefault` 후 수동 FormData 생성 + `fetch` 사용
   - **이미지 파일 추적**: HTML에서 Blob URL 추출 후 해당 File 객체를 FormData에 추가

5. ✅ **HTML Sanitization**
   - `sanitizePostHtml` 함수에 `img` 태그 및 속성(`src`, `alt`, `title`, `width`, `height`, `class`) 허용
   - 서버에서 HTML 검증 및 정리

### MVP 7단계: Supabase Anonymous Auth + RLS 설정 (완료 ✅)
**목표**: 익명 사용자도 세션을 가지도록 하고, RLS 정책으로 보안 강화

1. ✅ **Supabase Anonymous Auth 구현**
   - 익명 사용자도 세션을 가지도록 `createAnonymousSession()` 함수 구현
   - `getUserOrCreateAnonymous()` 함수로 세션이 없으면 자동으로 익명 세션 생성
   - 익명 사용자는 `isAnonymous: true`로 식별
   - 익명 사용자는 헤더에서 "내 글" 메뉴가 보이지 않도록 처리

2. ✅ **RLS (Row Level Security) 정책 설정**
   - `posts`, `comments`, `likes` 테이블에 RLS 활성화
   - 읽기 정책: 모든 사용자 읽기 가능
   - 쓰기 정책: 인증된 사용자(익명 포함)만 작성 가능
   - 수정/삭제 정책: 작성자만 수정/삭제 가능 (`auth.uid() = user_id`)
   - 익명 글은 `is_anonymous` 컬럼으로 식별
   - RLS 정책: `is_anonymous = true`인 경우 업데이트/삭제 허용

3. ✅ **세션 토큰 기반 클라이언트 생성**
   - `createSupabaseClientWithSession()` 함수 구현
   - RLS 정책에서 `auth.uid()`를 사용할 수 있도록 세션 토큰 전달
   - `SessionTokens` 객체를 받아서 Authorization 헤더에 추가

4. ✅ **익명 글 관리 개선**
   - `is_anonymous` 컬럼 추가하여 익명 글 명확히 식별
   - 익명 글 작성 시 `is_anonymous: true` 설정
   - 익명 글 수정/삭제 시 비밀번호 검증 로직 개선
   - 로그인 상태에서는 익명 글 수정/삭제 불가 정책 적용

5. ✅ **익명 사용자 회원가입 시 글 전환 기능**
   - `convertAnonymousPostsToUserPosts()` 함수 구현
   - 익명 사용자 회원가입 시 기존 익명 글을 회원 글로 자동 전환
   - `updateUser()`로 익명 사용자 ID 유지 시도 (실패 시 `signUp()`으로 폴백)
   - 세션 만료 감지 로직 추가
   - 회원가입 완료 후 로그인 페이지에 익명 글 전환 정보 표시

6. ✅ **버그 수정**
   - `toast.ts`의 `remove` 함수 클로저 문제 해결
   - `use:enhance`의 `result` null 체크 추가
   - `verifyEditPassword` 함수 타입 안전성 개선
   - `createSupabaseClientWithSession` 함수 시그니처 수정

### 향후 추가 예정
- ✅ 이미지 업로드 (Supabase Storage) - 기본 기능 구현 완료
- ✅ 이미지 압축 기능 (클라이언트 리사이즈/압축)
- ✅ 사용자 프로필 페이지 (프로필 편집)
- ✅ 북마크 기능 (북마크 테이블 + 목록/토글)
- ✅ 태그 시스템 (태그 입력/검색/필터)
- ✅ 위스키 정보 데이터베이스 (위스키 종류, 브랜드, 리뷰 등)
- 소셜 공유 기능

---

## Supabase 설정 및 사용 가이드

### Supabase 프로젝트 설정

1. **Supabase 프로젝트 생성**
   - [Supabase 대시보드](https://app.supabase.com)에서 새 프로젝트 생성
   - 프로젝트 URL과 Anon Key 확인

2. **환경 변수 설정**
   - `.env` 파일에 다음 변수 추가:
   ```env
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
   - **주의**: `PUBLIC_` 접두사가 붙은 변수는 클라이언트에 노출되지만, ANON_KEY는 RLS로 보호됩니다.

3. **데이터베이스 스키마 생성**
   - Supabase 대시보드 → SQL Editor 열기
   - `supabase-schema.sql` 파일의 내용 실행 (또는 직접 SQL 작성)
   - 테이블 생성 및 인덱스 생성 확인

### Supabase 클라이언트 사용

#### 서버 전용 클라이언트 및 쿼리 계층
- **클라이언트 위치**: `src/lib/server/supabase/client.ts`
- **쿼리 계층**: `src/lib/server/supabase/queries/posts.ts`
- **용도**: 서버 사이드에서만 사용 (SvelteKit의 `+page.server.ts`, `+layout.server.ts` 등)
- **권장 사용 방법** (쿼리 계층 사용):
  ```typescript
  // ✅ 권장: 쿼리 계층 함수 사용
  import { createPost, listPosts, getPostById } from '$lib/server/supabase/queries/posts';
  
  // 게시글 생성
  const post = await createPost({ title, content, author_name: '작성자' });
  
  // 게시글 목록 조회
  const posts = await listPosts();
  
  // 게시글 상세 조회
  const post = await getPostById(id);
  ```
- **직접 클라이언트 사용** (특수한 경우만):
  ```typescript
  // ⚠️ 특수한 경우만 직접 사용 (일반적으로는 쿼리 계층 사용)
  import { createSupabaseClient } from '$lib/server/supabase/client';
  
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.from('posts').select('*');
  ```

#### 보안 규칙
- ✅ **사용 가능**: `PUBLIC_SUPABASE_ANON_KEY` (RLS로 보호됨)
- ❌ **절대 사용 금지**: `SUPABASE_SERVICE_ROLE_KEY` (클라이언트 노출 시 위험)
- ✅ **서버 전용**: `src/lib/server/supabase/` 디렉토리에서만 클라이언트 생성
- ✅ **쿼리 계층 사용**: 모든 DB 접근은 `queries/posts.ts`의 함수들을 통해서만 수행

### RLS (Row Level Security) 설정

#### 프로덕션 단계 (완료 ✅)
- ✅ **RLS 활성화**: 보안 정책 설정 완료
- ✅ **읽기 정책**: 모든 사용자(익명 포함) 읽기 가능
- ✅ **쓰기 정책**: 모든 사용자(익명 포함) 작성 가능
- ✅ **수정/삭제 정책**: 
  - 로그인 글(`is_anonymous = false`): 작성자(`user_id`)만 수정/삭제 가능
  - 익명 글(`is_anonymous = true`): RLS에서 허용하되 서버에서 비밀번호 검증으로 보안 보장
  - 익명 글은 user_id와 무관하게 비밀번호로만 수정/삭제 가능 (토큰 만료 시 user_id가 바뀔 수 있음)
- ✅ **Anonymous Auth**: 익명 사용자도 세션을 가지도록 구현
- ✅ **세션 토큰 기반 클라이언트**: `createSupabaseClientWithSession()` 함수로 RLS 정책 적용
- ✅ **익명 글 관리**: `is_anonymous` 컬럼으로 익명 글 명확히 식별
  - 익명 글도 익명 세션의 `user_id`를 가지지만, 토큰 만료 시 `user_id`가 바뀔 수 있으므로 비밀번호로만 관리
  - 익명 글도 익명 세션의 `user_id`를 가지지만, 토큰 만료 시 `user_id`가 바뀔 수 있으므로 비밀번호로만 관리
  - 익명 글은 user_id와 무관하게 비밀번호로만 수정/삭제 가능

### Supabase 스키마 구조

#### posts 테이블
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 주요 차이점 (PostgreSQL vs Supabase)
- **ID 타입**: PostgreSQL은 `SERIAL` (정수), Supabase는 `UUID` (문자열)
- **타임스탬프**: Supabase는 `TIMESTAMPTZ` 사용 (타임존 포함)
- **기본값**: `gen_random_uuid()`로 UUID 자동 생성

### 마이그레이션 가이드

#### 기존 PostgreSQL 데이터를 Supabase로 이전
1. PostgreSQL에서 데이터 export
2. Supabase SQL Editor에서 스키마 생성
3. 데이터 import (필요시 형식 변환)

#### 향후 마이그레이션
- Supabase 대시보드의 Migration 기능 활용
- 또는 SQL Editor에서 직접 실행

### 문제 해결

#### 환경 변수 오류
- **증상**: "Missing Supabase environment variables" 오류
- **해결**: `.env` 파일에 `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` 확인

#### RLS 오류
- **증상**: Insert/Update/Delete 실패 (권한 오류)
- **해결**: 
  - 세션 토큰이 제대로 전달되는지 확인 (`createSupabaseClientWithSession()` 사용)
  - 익명 사용자의 경우 익명 세션이 생성되었는지 확인 (`getUserOrCreateAnonymous()` 사용)
  - RLS 정책이 올바르게 설정되었는지 Supabase 대시보드에서 확인

#### 타입 오류
- **증상**: ID가 number가 아닌 string
- **해결**: Supabase는 UUID를 사용하므로 string으로 처리

---

## 개발 프로세스 및 문서 업데이트 규칙

### 개발 프로세스
1. **구현**: 기능 개발
2. **테스트**: 구현 완료 후 반드시 테스트 수행 (동작 확인)
3. **문서 업데이트**: 테스트 완료 후 문서 업데이트

### 코드 리뷰 규칙
- **순서**: `.cursorrules` 위반 → 런타임/빌드 오류 → 로직/보안 → 비표준/비일관 패턴 → 테스트 갭
- **제시 방식**: 각 이슈마다 관련 규칙 인용, 문제 설명, 개선 코드, 변경 이유 포함
- **판단 기준**: 프로덕션 기준으로 위험도(치명/높음/중간/낮음) 표시
- **불확실성**: 규칙이 모호하면 해석 기준을 명시
- **범위**: 파일 구조 → 서버 로직 → 클라이언트 로직 → 상태/비동기 → 스타일 순으로 검토

### 문서 업데이트 필수 항목
**중요**: 모든 개발 작업 완료 후 이 문서의 다음 섹션들을 반드시 업데이트해야 합니다:
- **현재 단계**: 완료된 작업을 ✅로 표시
- **다음 단계**: 진행 상황에 맞게 우선순위 조정
- **컴포넌트 구조**: 새로 생성된 컴포넌트 추가

---

**마지막 업데이트**: 2026-01-26 (검색 필터, 알림, 대표 이미지 선택)
