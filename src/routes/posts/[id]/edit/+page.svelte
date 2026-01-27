<script lang="ts">
  import { page } from '$app/stores';
  import { showToast } from '$lib/stores/toast';
  import RichTextEditor from '$lib/components/RichTextEditor.svelte';
  
  type FormState = {
    error?: string;
    fieldErrors?: Record<string, string>;
    values?: {
      title?: string;
      content?: string;
      author?: string;
      tags?: string;
      whiskyId?: string;
      thumbnailUrl?: string;
    };
  };

  let { data, form }: { data: any; form?: FormState } = $props();
  
  let title = $state('');
  let content = $state('');
  let contentText = $state('');
  let author = $state('');
  let tags = $state('');
  let whiskyId = $state('');
  let thumbnailUrl = $state('');
  let error = $state('');
  let fieldErrors = $state<Record<string, string>>({});
  let editPassword = $state('');

  // 클라이언트 사이드 실시간 유효성 검사 (blur 이벤트 후에만 표시)
  let clientFieldErrors = $state<Record<string, string>>({});
  let touchedFields = $state<Record<string, boolean>>({}); // blur된 필드만 추적

  // 이미지 파일 추적 (Blob URL -> File 객체 매핑)
  let imageFiles = $state<Map<string, File>>(new Map());

  // 초기값 설정: data.post가 로드되면 즉시 설정
  $effect(() => {
    if (data?.post) {
      if (data.post.title !== undefined) title = data.post.title;
      if (data.post.content !== undefined) {
        content = data.post.content;
        contentText = plainTextFromHtml(data.post.content);
      }
      if (data.post.author !== undefined) author = data.post.author;
      if (Array.isArray(data.post.tags)) tags = data.post.tags.join(', ');
      if (data.post.whiskyId) whiskyId = data.post.whiskyId;
      if (data.post.thumbnailUrl) thumbnailUrl = data.post.thumbnailUrl;
    }
  });

  // form이 업데이트되면 상태 동기화
  $effect(() => {
    if (form?.values?.title !== undefined) title = form.values.title;
    if (form?.values?.content !== undefined) content = form.values.content;
    if (form?.values?.author !== undefined) author = form.values.author;
    if (form?.values?.tags !== undefined) tags = form.values.tags;
    if (form?.values?.whiskyId !== undefined) whiskyId = form.values.whiskyId;
    if (form?.values?.thumbnailUrl !== undefined) thumbnailUrl = form.values.thumbnailUrl;
    if (form?.error !== undefined) error = form.error;
    if (form?.fieldErrors !== undefined) fieldErrors = form.fieldErrors || {};
    if (form?.values?.content !== undefined) {
      contentText = plainTextFromHtml(form.values.content || '');
    }
    
    // 서버에서 에러가 없으면 클라이언트 에러도 초기화
    if (!form?.fieldErrors || Object.keys(form.fieldErrors).length === 0) {
      clientFieldErrors = {};
    }
  });

  function plainTextFromHtml(html: string) {
    return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function extractImageUrls(html: string) {
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    return Array.from((html || '').matchAll(imgRegex))
      .map((match) => match[1])
      .filter((src): src is string => typeof src === 'string' && src.length > 0);
  }

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
      if (contentText.trim().length === 0) {
        clientFieldErrors = { ...clientFieldErrors, content: '내용을 입력해주세요.' };
      } else {
        clientFieldErrors = { ...clientFieldErrors };
        delete clientFieldErrors.content;
      }
    }
  }

  function validatePassword() {
    if (data?.post?.isAnonymous && !isLoggedIn) {
      // 입력 중이거나 blur된 경우에만 검사
      if (touchedFields.editPassword || editPassword.length > 0) {
        // 빈 값이면 에러 표시 안 함
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

  // 서버 에러와 클라이언트 에러 병합 (서버 에러가 우선)
  let allFieldErrors = $derived({ ...clientFieldErrors, ...fieldErrors });

  let isLoggedIn = $derived(!!$page.data?.user);
  let imageCandidates = $derived(extractImageUrls(content));
  $effect(() => {
    if (isLoggedIn) {
      // 로그인 사용자는 닉네임을 작성자명으로 고정 (서버에서도 강제함)
      author = $page.data.user.nickname || $page.data.user.email || author;
    }
  });
  $effect(() => {
    if (imageCandidates.length === 0) {
      if (thumbnailUrl) thumbnailUrl = '';
      return;
    }
    if (!thumbnailUrl || !imageCandidates.includes(thumbnailUrl)) {
      thumbnailUrl = imageCandidates[0] || '';
    }
  });

  // ⭐ 핵심: use:enhance 대신 수동 submit 핸들링
  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    const formData = new FormData();

    // 텍스트 필드
    formData.append('title', title);
    formData.append('content', content);
    if (author) {
      formData.append('author', author);
    }
    if (tags) {
      formData.append('tags', tags);
    }
    if (whiskyId) {
      formData.append('whiskyId', whiskyId);
    }
    formData.append('thumbnailUrl', thumbnailUrl);

    if (data?.post?.isAnonymous && !isLoggedIn) {
      if (editPassword) {
        formData.append('editPassword', editPassword);
      }
    }

    // 이미지 파일 추가
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const matches = Array.from(content.matchAll(imgRegex));
    const blobUrls = matches
      .map((m: RegExpMatchArray) => m[1])
      .filter((src: string) => src.startsWith('blob:'));

    blobUrls.forEach((blobUrl, index) => {
      const file = imageFiles.get(blobUrl);
      if (file instanceof File) {
        formData.append(`image_${index}`, file, file.name);
        formData.append(`image_url_${index}`, blobUrl);
      }
    });

    try {
      const res = await fetch('?/update', {
        method: 'POST',
        body: formData
      });

      // 응답 상태 확인
      if (!res.ok) {
        // console.error('서버 응답 오류:', res.status, res.statusText);
        const errorData = await res.json().catch(() => ({}));
        const message =
          (typeof errorData?.data?.error === 'string' && errorData.data.error) ||
          (typeof errorData?.error === 'string' && errorData.error) ||
          `서버 오류 (${res.status})`;
        showToast(message, 'error');
        return;
      }

      const result = await res.json();
      // console.log('클라이언트: 서버 응답:', result);

      // SvelteKit action 응답 타입: 'success' | 'failure' | 'redirect'
      if (result.type === 'success' || result.type === 'redirect') {
        showToast('게시글이 수정되었습니다.', 'success');
        imageFiles.clear();
        // redirect인 경우 location으로 이동
        if (result.location) {
          window.location.href = result.location;
        } else if (result.type === 'redirect') {
          // redirect 타입이지만 location이 없는 경우
          // console.warn('Redirect 응답이지만 location이 없습니다:', result);
        }
      } else if (result.type === 'failure') {
        // 실패 응답 처리
        if (result.data?.fieldErrors) {
          fieldErrors = result.data.fieldErrors || {};
          error = result.data?.error ?? '';
          return;
        }
        if (typeof result.data?.error === 'string' && result.data.error.length > 0) {
          showToast(result.data.error, 'error');
          return;
        }
        // 익명 글에서 400 실패면 비밀번호 오류로 간주해 명확한 메시지 표시
        if (data?.post?.isAnonymous && result.status === 400) {
          showToast('비밀번호가 일치하지 않습니다.', 'error');
          return;
        }
        showToast('게시글 수정에 실패했습니다.', 'error');
      } else {
        // 알 수 없는 응답 타입
        // console.error('알 수 없는 응답 타입:', result);
        showToast('예상치 못한 응답을 받았습니다.', 'error');
      }
    } catch (error) {
      // console.error('폼 제출 오류:', error);
      showToast('게시글 수정 중 오류가 발생했습니다.', 'error');
    }
  }
</script>

<svelte:head>
  <title>글 수정 - {data?.post?.title || 'whiskylog'}</title>
</svelte:head>

<div class="max-w-4xl xl:max-w-5xl mx-auto px-4 xl:px-8 py-12">
  <h1 class="text-3xl sm:text-4xl font-bold text-whiskey-900 mb-10 tracking-tight">글 수정</h1>

  <form
    method="POST"
    onsubmit={handleSubmit}
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
          touchedFields.title = true;
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

    <!-- 태그 -->
    <div class="mb-6">
      <label for="tags" class="block text-sm font-medium text-gray-700 mb-2">
        태그 (쉼표로 구분)
      </label>
      <input
        type="text"
        id="tags"
        name="tags"
        bind:value={tags}
        placeholder="예: 버번, 셰리, 데일리"
        class="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none transition-colors"
      />
      <p class="mt-2 text-sm text-gray-500">태그는 쉼표로 구분되며 최대 10개까지 저장됩니다.</p>
    </div>

    <!-- 위스키 -->
    <div class="mb-6">
      <label for="whiskyId" class="block text-sm font-medium text-gray-700 mb-2">
        위스키 선택
      </label>
      <select
        id="whiskyId"
        name="whiskyId"
        bind:value={whiskyId}
        class="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none transition-colors"
      >
        <option value="">선택 안 함</option>
        {#each data.whiskies || [] as whisky}
          <option value={whisky.id}>
            {whisky.brand ? `${whisky.brand} - ${whisky.name}` : whisky.name}
          </option>
        {/each}
      </select>
    </div>

    <!-- 내용 -->
    <div class="mb-6">
      <label for="content" class="block text-sm font-medium text-gray-700 mb-2">
        내용
      </label>
      <!-- hidden input 제거 (수동 FormData 사용) -->
      <div class="{allFieldErrors.content ? 'ring-2 ring-red-300 rounded-2xl' : ''}">
        <RichTextEditor
          value={content}
          placeholder="게시글 내용을 입력하세요"
          onChange={(html, text) => {
            content = html;
            contentText = text;
            touchedFields.content = true;
            validateContent();
          }}
          onImageAdd={(blobUrl, file) => {
            // Blob URL과 File 객체를 매핑하여 저장
            imageFiles.set(blobUrl, file);
            showToast('이미지가 추가되었습니다. 대표 이미지를 선택할 수 있습니다.', 'success');
          }}
        />
      </div>
      {#if allFieldErrors.content}
        <p class="mt-2 text-sm text-red-600">{allFieldErrors.content}</p>
      {/if}
    </div>

    {#if imageCandidates.length > 0}
      <fieldset class="mb-6">
        <legend class="block text-sm font-medium text-gray-700 mb-2">
          대표 이미지 선택
        </legend>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {#each imageCandidates as imageUrl}
            <button
              type="button"
              class="group relative overflow-hidden rounded-xl border {thumbnailUrl === imageUrl ? 'border-whiskey-500 ring-2 ring-whiskey-300' : 'border-gray-200'}"
              aria-pressed={thumbnailUrl === imageUrl}
              onclick={() => {
                thumbnailUrl = imageUrl;
              }}
            >
              <img
                src={imageUrl}
                alt="대표 이미지 후보"
                class="h-28 w-full object-cover transition group-hover:scale-105"
                loading="lazy"
              />
              {#if thumbnailUrl === imageUrl}
                <div class="absolute inset-0 bg-black/30"></div>
                <div class="absolute bottom-2 right-2 rounded-full bg-whiskey-600 text-white text-xs px-2 py-1">
                  선택됨
                </div>
              {/if}
            </button>
          {/each}
        </div>
        <p class="mt-2 text-sm text-gray-500">게시글 목록 카드 썸네일로 사용됩니다.</p>
      </fieldset>
    {/if}

    {#if data?.post?.isAnonymous && !isLoggedIn}
      <!-- 익명 글 관리 비밀번호 -->
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
            // 입력 중에도 검사 (빈 값이면 에러 표시 안 함)
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
        href="/posts/{data?.post?.id}"
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
