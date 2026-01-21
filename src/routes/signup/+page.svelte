<script>
  import { enhance } from '$app/forms';
  export let form;

  let email = form?.values?.email || '';
  let nickname = form?.values?.nickname || '';
  let error = form?.error || '';
</script>

<svelte:head>
  <title>회원가입 - DramLog</title>
</svelte:head>

<div class="max-w-md mx-auto px-4 py-10">
  <h1 class="text-3xl font-bold text-whiskey-900 mb-6">회원가입</h1>

  <form method="POST" use:enhance class="bg-white rounded-lg shadow-md p-8 border border-gray-100">
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

    <div class="mb-5">
      <label for="nickname" class="block text-sm font-medium text-gray-700 mb-2">닉네임</label>
      <input
        id="nickname"
        name="nickname"
        type="text"
        bind:value={nickname}
        required
        minlength="2"
        maxlength="20"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none"
        placeholder="닉네임을 입력하세요"
      />
      <p class="mt-2 text-sm text-gray-500">닉네임은 나중에 프로필로 확장할 수 있어요.</p>
    </div>

    <div class="mb-5">
      <label for="password" class="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
      <input
        id="password"
        name="password"
        type="password"
        required
        minlength="8"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none"
        placeholder="8자 이상"
      />
    </div>

    <div class="mb-8">
      <label for="passwordConfirm" class="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인</label>
      <input
        id="passwordConfirm"
        name="passwordConfirm"
        type="password"
        required
        minlength="8"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none"
        placeholder="비밀번호를 다시 입력"
      />
    </div>

    <button
      type="submit"
      class="w-full px-6 py-3 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium"
    >
      회원가입
    </button>

    <p class="mt-6 text-sm text-gray-600 text-center">
      이미 계정이 있나요?
      <a href="/login" class="text-whiskey-700 hover:text-whiskey-800 font-medium">로그인</a>
    </p>
  </form>
</div>

