# DramLog 감사 보고서

작성 목적: 코드/문서/규칙의 정합성 및 유지보수 위험 점검  
대상 브랜치: cursor/project-audit-and-plan-86ab

---

## 1. 프로젝트 전체 구조 요약
- **SvelteKit SSR** 기반이며 `src/routes/`에 라우팅과 서버 액션이 집중되어 있음.
- **Supabase 접근은 queries 계층**(`src/lib/server/supabase/queries/`)에 존재하지만, 일부 서버 액션에서 인증/권한 로직이 분산됨.
- UI는 `src/lib/components/`에 분리되어 있으나 **폼 검증/피드백 로직이 페이지마다 중복**됨.
- 문서가 `.cursorrules`, `web-dev-guidelines.md`, `.cursor/plans/*`로 분산되어 **서술 불일치**가 발생함.

---

## 2. .cursorrules 준수 여부 평가
### 준수
- Supabase 클라이언트 생성이 `src/lib/server/supabase/client.ts`로 제한됨.
- 라우팅 규칙(+page/+layout) 준수.
- 컴포넌트 분리 기본 구조는 적정.

### 위반/불일치
1) **Tailwind-only 규칙 위반**
- `src/app.html`의 인라인 스타일(`style="display: contents"`).
- `src/lib/components/Toast.svelte`의 `<style>` 커스텀 키프레임.
- 규칙상 예외 근거가 문서에 없음 → 위반.

2) **댓글/좋아요 로그인 전용 정책 미강제**
- `src/routes/posts/[id]/+page.server.ts`에서 `getUser`만 확인, `isAnonymous` 차단 없음.
- 익명 세션도 댓글/좋아요 액션 통과 가능 → 규칙 위반.

3) **RLS 세션 토큰 사용 규칙 미준수**
- `src/lib/server/supabase/queries/comments.ts`, `likes.ts`가 `createSupabaseClient()`만 사용.
- RLS 활성화 환경에서 쓰기 실패 예정 → 규칙 위반.

4) **주석 언어 규칙 위반**
- `src/lib/server/supabase/client.ts` 등 영어 주석 존재.

5) **문서/규칙 불일치**
- `supabase-schema.sql` 주석에 “RLS 비활성화” 안내 존재.
- `web-dev-guidelines.md`는 MVP6 진행중, `.cursorrules`는 완료로 표시.

---

## 3. 심각한 문제점 및 리스크 목록
1) **RLS 정책이 보안을 무력화**
- 파일: `supabase-schema.sql`
- INSERT: `WITH CHECK (true)` → 미인증 사용자도 삽입 가능.
- UPDATE/DELETE: `is_anonymous = true`면 누구나 수정/삭제 가능.
- 결과: **익명 글은 전면적으로 조작 가능**. 치명적.

2) **댓글/좋아요 기능이 RLS 활성화 시 즉시 붕괴**
- 파일: `comments.ts`, `likes.ts`
- 세션 토큰 미전달 → `auth.role()` 조건 통과 불가.
- 로그인 전용 기능이 실제로 작동하지 않음.

3) **SSR 크래시 가능**
- 파일: `src/routes/+page.svelte`
- `window` 접근 및 `invalidateAll()` 호출이 SSR에서 실행될 수 있음.
- `/logout` 리다이렉트 경로에서 서버 렌더링 오류 가능.

4) **회원가입 페이지 런타임 에러**
- 파일: `src/routes/signup/+page.svelte`
- `showToast` 사용하지만 import 없음 → 즉시 에러.

5) **문서와 구현의 핵심 불일치**
- 문서: 익명 글 `user_id` 없음.
- 구현: 익명 글도 `user_id` 저장(`write/+page.server.ts`).
- 유지보수자가 오해할 확률 높음.

6) **익명/로그인 구분 로직 부정확**
- `user.email` 유무로 로그인 판단.
- 익명 세션도 user 존재 → 정책 오작동 가능.

7) **요약(excerpt) 입력이 저장되지 않음**
- 파일: `write/+page.svelte`, `write/+page.server.ts`
- 데이터 수집 후 DB 저장 없음 → 사용자 입력 소실.

8) **댓글 수정 기능 표기만 존재**
- `CommentItem.svelte`에 “수정” 버튼 있으나 서버 액션/쿼리 없음.
- 문서의 “댓글 CRUD”와 불일치.

---

## 4. 숨겨진 기술부채 분석
### ✅ MVP에서 허용 가능한 부채
- 자동화 테스트 부재(수동 TEST_CASES만 존재).
- Toast 애니메이션 커스텀 CSS(단, 규칙 위반이므로 정리 필요).

### ⚠️ 방치 시 위험한 부채
- **문서 정합성 붕괴**(README/.cursorrules/web-dev-guidelines/SQL 주석).
- **폼 검증 로직 중복**(write/edit에 분산).
- **검색 쿼리 문자열 조립**(`.or(...)`) 특수문자 입력 시 실패 위험.

### ⛔️ 미래 개발을 가로막는 부채
- **익명 비밀번호 수정/삭제 요구사항 vs RLS 보안**의 구조적 충돌.
- **세션/권한 정의 일관성 부재** → 기능 확장 불가능.
- **DB 스키마와 UI 불일치**(요약 필드 등).

---

## 5. 다음 단계에서 반드시 해야 할 작업 (우선순위 포함)
### P0 (즉시)
1) **RLS 정책 전면 수정**
   - 익명 글 비밀번호 수정 요구사항과 충돌 해결 필요.
   - 유지하려면 서버 전용 권한(서비스 롤) 설계가 필요하고, 현재 정책은 즉시 폐기해야 함.

2) **댓글/좋아요 세션 토큰 적용 + 익명 차단**
   - `createSupabaseClientWithSession()`로 전환.
   - `requireAuth()` 또는 익명 세션 차단 로직 추가.

3) **SSR 안전성 수정**
   - `+page.svelte`의 logout 처리 `onMount`/`browser` 체크로 이동.

4) **회원가입 페이지 런타임 오류 제거**
   - `showToast` import 또는 사용 제거.

### P1 (문서/정합성 회복)
5) **문서 전체 동기화**
   - 익명 글 `user_id` 정책, RLS 설명, MVP 상태 정리.
   - `supabase-schema.sql` 주석부터 바로잡기.

6) **레거시 의존성/스크립트 정리**
   - `pg`, `dotenv`, `migrate` 스크립트 제거 또는 실제 사용 근거 명시.

7) **요약(excerpt) 처리 결정**
   - DB 컬럼 추가 또는 UI 제거 중 하나 선택.

### P2 (구조 개선)
8) **검증 로직 공통화**(유효성 규칙 단일화)
9) **권한/세션 컨텍스트 단일화**
10) **쿼리 계층 정리**(DB 접근/도메인 로직 분리)

---

## 6. 당장 하면 안 되는 작업 및 그 이유
1) **이미지 업로드/프로필/북마크/태그 등 신규 기능**
   - 권한/보안 설계가 깨져 있어 기능 추가가 무의미함.

2) **클라이언트 Supabase 접근 확대**
   - RLS가 허술해 데이터 조작 위험이 즉시 상승.

3) **익명 글 “어디서나 비밀번호 수정/삭제” 유지한 채 배포**
   - 공개 운영 시 악용 가능성 높음. 설계부터 바꿔야 함.

