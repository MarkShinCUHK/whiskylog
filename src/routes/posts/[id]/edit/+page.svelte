<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { showToast } from '$lib/stores/toast';
  
  let { data, form } = $props();
  
  let title = $state('');
  let content = $state('');
  let author = $state('');
  let error = $state('');
  let fieldErrors = $state<Record<string, string>>({});
  let editPassword = $state('');

  // 클라이언트 사이드 실시간 유효성 검사
  let clientFieldErrors = $state<Record<string, string>>({});
  let touchedFields = $state<Record<string, boolean>>({}); // blur된 필드만 추적

  // 초기값 설정 및 form 업데이트 시 동기화
  $effect(() => {
    if (form?.values?.title !== undefined) title = form.values.title;
    else if (data.post?.title !== undefined) title = data.post.title;
    
    if (form?.values?.content !== undefined) content = form.values.content;
    else if (data.post?.content !== undefined) content = data.post.content;
    
    if (form?.values?.author !== undefined) author = form.values.author;
    else if (data.post?.author !== undefined) author = data.post.author;
    
    if (form?.error !== undefined) error = form.error;
    if (form?.fieldErrors !== undefined) fieldErrors = form.fieldErrors || {};
  });

  function validateTitle() {
    if (touchedFields.title) {
      if (title.trim().length === 0) {
        clientFieldErrors = { ...clientFieldErrors, title: '제목을 입력해주세요.' };
      } else {
        clientFieldErrors = { ...clientFieldErrors };
        delete clientFieldErrors.title;
      }
    }
  }

  function validateContent() {
    if (touchedFields.content) {
      if (content.trim().length === 0) {
        clientFieldErrors = { ...clientFieldErrors, content: '내용을 입력해주세요.' };
      } else {
        clientFieldErrors = { ...clientFieldErrors };
        delete clientFieldErrors.content;
      }
    }
  }

  function validatePassword() {
    if (data.post?.isAnonymous) {
      if (touchedFields.editPassword || editPassword.length > 0) {
        if (editPassword.length === 0) {
          clientFieldErrors = { ...clientFieldErrors };
          delete clientFieldErrors.editPassword;
        } else {
          clientFieldErrors = { ...clientFieldErrors };
          delete clientFieldErrors.editPassword;
        }
      }
    }
  }

  // 실시간 검사는 oninput/onblur 핸들러에서 직접 처리
  // $effect는 무한 루프를 방지하기 위해 제거

  // 서버 에러와 클라이언트 에러 병합
  let allFieldErrors = $derived({ ...fieldErrors, ...clientFieldErrors });

  let isLoggedIn = $derived(!!$page.data?.user);
  $effect(() => {
    if (isLoggedIn && $page.data.user) {
      author = $page.data.user.nickname || $page.data.user.email || author;
    }
  });
</script>

<svelte:head>
  <title>글 수정 - {data.post?.title || 'DramLog'}</title>
</svelte:head>

<div class="max-w-4xl xl:max-w-5xl mx-auto px-4 xl:px-8 py-12">
  <h1 class="text-3xl sm:text-4xl font-bold text-whiskey-900 mb-10 tracking-tight">글 수정</h1>

  <form
    method="POST"
    use:enhance={() => {
      return async ({ result, update }) => {
        try {
          // 기본 업데이트 먼저 수행 (redirect 포함)
          await update();
          
          // result가 있을 때만 토스트 표시
          if (result) {
            if (result.type === 'success' || result.type === 'redirect') {
              showToast('게시글이 수정되었습니다.', 'success');
            } else if (result.type === 'failure' && result.data?.error) {
              showToast(result.data.error, 'error');
            }
          }
        } catch (error) {
          console.error('폼 제출 오류:', error);
          showToast('게시글 수정 중 오류가 발생했습니다.', 'error');
        }
      };
    }}
    class="rounded-2xl bg-white/80 backdrop-blur-sm p-8 sm:p-10 ring-1 ring-black/5 shadow-sm"
  >
    <!-- 에러 메시지 -->
    {#if error}
      <div class="mb-8 p-4 bg-red-50/80 border border-red-200/50 rounded-lg text-red-700 text-sm">
        {error}
      </div>
    {/if}

    <!-- 작성자 -->
    <div class="mb-6">
      <label for="author" class="block text-sm font-medium text-gray-700 mb-2">
        작성자
      </label>
      <input
        type="text"
        id="author"
        name="author"
        bind:value={author}
        placeholder="미입력 시: 익명의 위스키 러버"
        class="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
        disabled={isLoggedIn}
      />
      {#if isLoggedIn}
        <p class="mt-2 text-sm text-gray-500">로그인 상태에서는 닉네임(또는 이메일)로 작성자명이 자동 설정됩니다.</p>
      {/if}
    </div>

    <!-- 제목 -->
    <div class="mb-6">
      <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
        제목
      </label>
      <input
        type="text"
        id="title"
        name="title"
        bind:value={title}
        placeholder="게시글 제목을 입력하세요"
        class="w-full px-4 py-3 sm:py-2.5 border {allFieldErrors.title ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none transition-colors"
        required
        oninput={() => {
          if (!touchedFields.title) {
            touchedFields.title = true;
          }
          validateTitle();
        }}
        onblur={() => {
          touchedFields.title = true;
          validateTitle();
        }}
      />
      {#if allFieldErrors.title}
        <p class="mt-2 text-sm text-red-600">{allFieldErrors.title}</p>
      {/if}
    </div>

    <!-- 내용 -->
    <div class="mb-6">
      <label for="content" class="block text-sm font-medium text-gray-700 mb-2">
        내용
      </label>
      <textarea
        id="content"
        name="content"
        bind:value={content}
        rows="15"
        placeholder="게시글 내용을 입력하세요"
        class="w-full px-4 py-3 sm:py-2 border {allFieldErrors.content ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none resize-none"
        required
        oninput={() => {
          if (!touchedFields.content) {
            touchedFields.content = true;
          }
          validateContent();
        }}
        onblur={() => {
          touchedFields.content = true;
          validateContent();
        }}
      ></textarea>
      {#if allFieldErrors.content}
        <p class="mt-2 text-sm text-red-600">{allFieldErrors.content}</p>
      {/if}
    </div>

    {#if data.post?.isAnonymous}
      <!-- 비밀번호 -->
      <div class="mb-8">
        <label for="editPassword" class="block text-sm font-medium text-gray-700 mb-2">
          비밀번호 (수정용)
        </label>
        <input
          type="password"
          id="editPassword"
          name="editPassword"
          bind:value={editPassword}
          placeholder="작성 시 설정한 비밀번호"
          autocomplete="current-password"
          class="w-full px-4 py-3 sm:py-2.5 border {allFieldErrors.editPassword ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none transition-colors"
          required
          oninput={() => {
            if (!touchedFields.editPassword) {
              touchedFields.editPassword = true;
            }
            validatePassword();
          }}
          onblur={() => {
            touchedFields.editPassword = true;
            validatePassword();
          }}
        />
        {#if allFieldErrors.editPassword}
          <p class="mt-2 text-sm text-red-600">{allFieldErrors.editPassword}</p>
        {/if}
      </div>
    {/if}

    <!-- 버튼 -->
    <div class="flex flex-col sm:flex-row gap-3 sm:justify-end pt-6 border-t border-gray-200">
      <a
        href="/posts/{data.post?.id}"
        class="inline-flex items-center justify-center px-6 py-3 min-h-[44px] bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium ring-1 ring-black/10 shadow-sm hover:shadow"
      >
        취소
      </a>
      <button
        type="submit"
        class="inline-flex items-center justify-center px-6 py-3 min-h-[44px] bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium shadow-sm hover:shadow-md"
      >
        수정하기
      </button>
    </div>
  </form>
</div>
