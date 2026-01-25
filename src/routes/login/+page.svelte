<script lang="ts">
  import { page } from '$app/stores';
  
  // Svelte 5: form prop을 직접 사용 (SvelteKit form action 결과가 그대로 들어옴)
  let { form } = $props();

  let email = $state('');
  let password = $state('');
  
  // URL 쿼리 파라미터에서 성공 메시지 확인
  let successMessage = $derived($page.url.searchParams.get('success'));

  // 서버 액션 응답(form)이 바뀔 때마다 입력값/에러를 갱신
  $effect(() => {
    if (form?.values?.email !== undefined) email = form.values.email;
  });

  // 에러는 form을 그대로 사용 (enhance/비-enhance 모두 대응)
  let error = $derived((form as any)?.error || '');
</script>

<svelte:head>
  <title>로그인 - whiskylog</title>
</svelte:head>

<div class="max-w-md mx-auto px-4 py-12">
  <h1 class="text-3xl sm:text-4xl font-bold text-whiskey-900 mb-10 tracking-tight text-center">로그인</h1>

  <form
    method="POST"
    action="/login"
    data-sveltekit-reload
    class="rounded-2xl bg-white/80 backdrop-blur-sm p-8 sm:p-10 ring-1 ring-black/5 shadow-sm"
  >
    {#if successMessage}
      <div
        role="status"
        class="mb-6 p-4 bg-green-50/80 border border-green-200/50 rounded-lg text-green-700 text-sm"
      >
        {successMessage}
      </div>
    {/if}
    
    {#if error}
      <div
        role="alert"
        class="mb-6 p-4 bg-red-50/80 border border-red-200/50 rounded-lg text-red-700 text-sm"
      >
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
        class="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none transition-colors"
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
        class="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none transition-colors"
        placeholder="비밀번호"
      />
    </div>

    <button
      type="submit"
      class="w-full px-6 py-3 min-h-[44px] bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium shadow-sm hover:shadow-md"
    >
      로그인
    </button>

    <p class="mt-6 text-sm text-gray-600 text-center">
      계정이 없나요?
      <a href="/signup" class="text-whiskey-700 hover:text-whiskey-800 font-medium">회원가입</a>
    </p>
  </form>
</div>

