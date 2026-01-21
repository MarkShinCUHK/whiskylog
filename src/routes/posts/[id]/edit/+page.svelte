<script>
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  
  export let data;
  export let form;
  
  let title = form?.values?.title || data.post?.title || '';
  let content = form?.values?.content || data.post?.content || '';
  let author = form?.values?.author || data.post?.author || '';
  let error = form?.error || '';
  let editPassword = '';

  $: isLoggedIn = !!$page.data?.user;
  $: if (isLoggedIn) {
    author = $page.data.user.nickname || $page.data.user.email || author;
  }
</script>

<svelte:head>
  <title>글 수정 - {data.post?.title || 'DramLog'}</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-4xl font-bold text-whiskey-900 mb-8">글 수정</h1>

  <form method="POST" use:enhance class="bg-white rounded-lg shadow-md p-8 border border-gray-100">
    <!-- 에러 메시지 -->
    {#if error}
      <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
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
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none disabled:bg-gray-50 disabled:text-gray-600"
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
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none"
        required
      />
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
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none resize-none"
        required
      ></textarea>
    </div>

    {#if !isLoggedIn}
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
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none"
          required
        />
      </div>
    {/if}

    <!-- 버튼 -->
    <div class="flex gap-4 justify-end">
      <a
        href="/posts/{data.post?.id}"
        class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
      >
        취소
      </a>
      <button
        type="submit"
        class="px-6 py-3 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium"
      >
        수정하기
      </button>
    </div>
  </form>
</div>
