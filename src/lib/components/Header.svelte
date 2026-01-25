<script>
  import { page } from '$app/stores';
  import SearchBar from '$lib/components/SearchBar.svelte';

  let mobileMenuOpen = false;

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
</script>

<nav class="sticky top-0 z-50 border-b border-black/5 bg-white/70 text-gray-900 backdrop-blur-md">
  <div class="max-w-6xl mx-auto px-4 py-3">
    <div class="flex items-center justify-between">
      <!-- Logo -->
      <a href="/" class="hover:opacity-80 transition-opacity flex items-center gap-2">
        <img src="/logo.svg" alt="whiskylog" class="h-8 w-8 sm:h-10 sm:w-10" />
        <span class="text-lg sm:text-xl font-semibold tracking-tight text-whiskey-900">whiskylog</span>
      </a>

      <!-- Desktop Menu -->
      <div class="hidden md:flex items-center gap-4">
        <div class="w-[360px]">
          <SearchBar initialQuery={$page.url.searchParams.get('q') || ''} />
        </div>
        <a href="/posts" class="text-gray-700 hover:text-gray-900 transition-colors font-medium">게시글</a>
        <a href="/write" class="px-4 py-2 rounded-xl bg-whiskey-500 text-white hover:bg-whiskey-600 transition-colors font-semibold shadow-sm shadow-black/10">
          작성하기
        </a>
        {#if $page.data?.user}
          <a href="/my-posts" class="text-gray-700 hover:text-gray-900 transition-colors font-medium">내 글</a>
          <a href="/logout" class="px-4 py-2 rounded-xl bg-gray-900/5 hover:bg-gray-900/10 ring-1 ring-black/10 transition-colors font-medium">
            로그아웃
          </a>
        {:else}
          <a href="/login" class="text-gray-700 hover:text-gray-900 transition-colors font-medium">로그인</a>
          <a href="/signup" class="px-4 py-2 rounded-xl bg-gray-900/5 hover:bg-gray-900/10 ring-1 ring-black/10 transition-colors font-medium">
            회원가입
          </a>
        {/if}
      </div>

      <!-- Mobile Menu Button -->
      <button
        type="button"
        class="md:hidden p-3 min-h-[44px] min-w-[44px] rounded-xl hover:bg-gray-900/5 transition-colors ring-1 ring-black/10"
        on:click={toggleMobileMenu}
        aria-label="메뉴"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {#if mobileMenuOpen}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          {/if}
        </svg>
      </button>
    </div>

    <!-- Mobile Menu -->
    {#if mobileMenuOpen}
      <div class="md:hidden mt-4 pb-4 space-y-3 border-t border-black/5 pt-4">
        <div class="mb-3">
          <SearchBar initialQuery={$page.url.searchParams.get('q') || ''} />
        </div>
        <a
          href="/posts"
          class="block py-3 min-h-[44px] px-4 rounded-xl hover:bg-gray-900/5 transition-colors font-medium ring-1 ring-black/10"
          on:click={() => (mobileMenuOpen = false)}
        >
          게시글
        </a>
        <a
          href="/write"
          class="block py-3 min-h-[44px] px-4 rounded-xl bg-whiskey-500 text-white hover:bg-whiskey-600 transition-colors font-semibold shadow-sm shadow-black/10"
          on:click={() => (mobileMenuOpen = false)}
        >
          작성하기
        </a>
        {#if $page.data?.user}
          <a
            href="/my-posts"
            class="block py-3 min-h-[44px] px-4 rounded-xl hover:bg-gray-900/5 transition-colors font-medium ring-1 ring-black/10"
            on:click={() => (mobileMenuOpen = false)}
          >
            내 글
          </a>
          <a
            href="/logout"
            class="block py-3 min-h-[44px] px-4 rounded-xl bg-gray-900/5 hover:bg-gray-900/10 ring-1 ring-black/10 transition-colors font-medium"
            on:click={() => (mobileMenuOpen = false)}
          >
            로그아웃
          </a>
        {:else}
          <a
            href="/login"
            class="block py-3 min-h-[44px] px-4 rounded-xl hover:bg-gray-900/5 transition-colors font-medium ring-1 ring-black/10"
            on:click={() => (mobileMenuOpen = false)}
          >
            로그인
          </a>
          <a
            href="/signup"
            class="block py-3 min-h-[44px] px-4 rounded-xl bg-gray-900/5 hover:bg-gray-900/10 ring-1 ring-black/10 transition-colors font-medium"
            on:click={() => (mobileMenuOpen = false)}
          >
            회원가입
          </a>
        {/if}
      </div>
    {/if}
  </div>
</nav>
