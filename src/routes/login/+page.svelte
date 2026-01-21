<script>
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  
  export let form;

  let email = '';
  let password = '';
  let error = '';
  
  // URL 쿼리 파라미터에서 성공 메시지 확인
  $: successMessage = $page.url.searchParams.get('success');

  // 서버 액션 응답(form)이 바뀔 때마다 입력값/에러를 갱신
  $: email = form?.values?.email || email;
  $: error = form?.error || '';
</script>

<svelte:head>
  <title>로그인 - DramLog</title>
</svelte:head>

<div class="max-w-md mx-auto px-4 py-10">
  <h1 class="text-3xl font-bold text-whiskey-900 mb-6">로그인</h1>

  <form method="POST" use:enhance class="bg-white rounded-lg shadow-md p-8 border border-gray-100">
    {#if successMessage}
      <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
        {successMessage}
      </div>
    {/if}
    
    {#if error}
      <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    {/if}

    <div class="mb-5">
      <label for="email" class="block text-sm font-medium text-gray-700 mb-2">이메일</label>
      <input
        id="email"
        name="email"
        type="email"
        bind:value={email}
        required
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none"
        placeholder="you@example.com"
      />
    </div>

    <div class="mb-8">
      <label for="password" class="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
      <input
        id="password"
        name="password"
        type="password"
        bind:value={password}
        required
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none"
        placeholder="비밀번호"
      />
    </div>

    <button
      type="submit"
      class="w-full px-6 py-3 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium"
    >
      로그인
    </button>

    <p class="mt-6 text-sm text-gray-600 text-center">
      계정이 없나요?
      <a href="/signup" class="text-whiskey-700 hover:text-whiskey-800 font-medium">회원가입</a>
    </p>
  </form>
</div>

