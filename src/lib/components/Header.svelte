<script lang="ts">
  import { page } from '$app/stores';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import { onMount } from 'svelte';

  let mobileMenuOpen = $state(false);
  let userMenuOpen = $state(false);
  let userMenuRoot: HTMLDivElement | null = $state(null);
  let mobileMenuRoot: HTMLDivElement | null = $state(null);

  const avatarUrl = $derived($page.data?.profile?.avatarUrl || '');
  const avatarFallback = $derived(($page.data?.user?.nickname || $page.data?.user?.email || 'U').slice(0, 1).toUpperCase());

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function toggleUserMenu() {
    userMenuOpen = !userMenuOpen;
  }

  function closeUserMenu() {
    userMenuOpen = false;
  }

  onMount(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        userMenuOpen = false;
        mobileMenuOpen = false;
        return;
      }
      if (!userMenuRoot?.contains(target)) {
        userMenuOpen = false;
      }
      if (!mobileMenuRoot?.contains(target)) {
        mobileMenuOpen = false;
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  });
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
          <div class="relative" bind:this={userMenuRoot}>
            <button
              type="button"
              class="h-10 w-10 rounded-full overflow-hidden ring-1 ring-black/10 bg-whiskey-100 hover:ring-whiskey-300 transition-colors"
              aria-label="사용자 메뉴"
              aria-expanded={userMenuOpen}
              onclick={toggleUserMenu}
            >
              {#if avatarUrl}
                <img src={avatarUrl} alt="프로필" class="h-full w-full object-cover" />
              {:else}
                <span class="flex h-full w-full items-center justify-center text-sm font-semibold text-whiskey-800">
                  {avatarFallback}
                </span>
              {/if}
            </button>
            {#if userMenuOpen}
              <div class="absolute right-0 mt-2 w-56 rounded-xl border border-black/5 bg-white/95 backdrop-blur p-2 shadow-lg ring-1 ring-black/5">
                <a href="/notifications" class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-800" onclick={closeUserMenu}>
                  <span>알림</span>
                  {#if $page.data?.notifications?.unreadCount > 0}
                    <span class="inline-flex items-center justify-center rounded-full bg-whiskey-600 text-white text-[10px] font-semibold px-2 py-0.5">
                      {$page.data.notifications.unreadCount}
                    </span>
                  {/if}
                </a>
                <a href="/my-posts" class="block px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-800" onclick={closeUserMenu}>
                  내 글
                </a>
                <a href="/profile" class="block px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-800" onclick={closeUserMenu}>
                  마이페이지
                </a>
                <a href="/bookmarks" class="block px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-800" onclick={closeUserMenu}>
                  북마크
                </a>
                <div class="my-1 h-px bg-black/5"></div>
                <a href="/logout" class="block px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-800" onclick={closeUserMenu}>
                  로그아웃
                </a>
              </div>
            {/if}
          </div>
        {:else}
          <a href="/login" class="text-gray-700 hover:text-gray-900 transition-colors font-medium">로그인</a>
          <a href="/signup" class="px-4 py-2 rounded-xl bg-gray-900/5 hover:bg-gray-900/10 ring-1 ring-black/10 transition-colors font-medium">
            회원가입
          </a>
        {/if}
      </div>

      <!-- Mobile Menu Button / Avatar -->
      <div class="relative md:hidden" bind:this={mobileMenuRoot}>
        {#if $page.data?.user}
          <div class="flex items-center gap-2">
            <a
              href="/posts"
              class="px-3 py-2 rounded-xl bg-gray-900/5 hover:bg-gray-900/10 ring-1 ring-black/10 transition-colors text-sm font-medium text-gray-800"
            >
              게시글
            </a>
            <a
              href="/write"
              class="px-3 py-2 rounded-xl bg-whiskey-500 text-white hover:bg-whiskey-600 transition-colors text-sm font-semibold shadow-sm shadow-black/10"
            >
              작성하기
            </a>
          <button
            type="button"
            class="relative h-11 w-11 rounded-full overflow-hidden ring-1 ring-black/10 bg-whiskey-100 hover:ring-whiskey-300 transition-colors"
            aria-label="모바일 메뉴"
            aria-expanded={mobileMenuOpen}
            onclick={toggleMobileMenu}
          >
            {#if avatarUrl}
              <img src={avatarUrl} alt="프로필" class="h-full w-full object-cover" />
            {:else}
              <span class="flex h-full w-full items-center justify-center text-sm font-semibold text-whiskey-800">
                {avatarFallback}
              </span>
            {/if}
            {#if $page.data?.notifications?.unreadCount > 0}
              <span class="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-whiskey-600 px-1.5 py-0.5 text-[10px] font-semibold text-white ring-2 ring-white">
                {$page.data.notifications.unreadCount}
              </span>
            {/if}
          </button>
          </div>
        {:else}
          <button
            type="button"
            class="p-3 min-h-[44px] min-w-[44px] rounded-xl hover:bg-gray-900/5 transition-colors ring-1 ring-black/10"
            onclick={toggleMobileMenu}
            aria-label="메뉴"
            aria-expanded={mobileMenuOpen}
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {#if mobileMenuOpen}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              {:else}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              {/if}
            </svg>
          </button>
        {/if}
      </div>
    </div>

    <!-- Mobile Menu -->
    {#if mobileMenuOpen}
      <div class="md:hidden mt-3">
        {#if $page.data?.user}
          <!-- 공용 메뉴는 카드 밖에 유지 -->
          <div class="mb-3 space-y-2 border-t border-black/5 pt-3">
            <div class="mb-2">
              <SearchBar initialQuery={$page.url.searchParams.get('q') || ''} />
            </div>
            <a
              href="/posts"
              class="block py-3 min-h-[44px] px-4 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              onclick={() => (mobileMenuOpen = false)}
            >
              게시글
            </a>
            <a
              href="/write"
              class="block py-3 min-h-[44px] px-4 rounded-xl bg-whiskey-500 text-white hover:bg-whiskey-600 transition-colors font-semibold shadow-sm shadow-black/10"
              onclick={() => (mobileMenuOpen = false)}
            >
              작성하기
            </a>
          </div>
          <!-- 사용자 메뉴는 카드형 -->
          <div class="rounded-2xl border border-black/5 bg-white/95 p-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
            <div class="space-y-2">
              <a
                href="/notifications"
                class="flex items-center justify-between py-3 min-h-[44px] px-4 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                onclick={() => (mobileMenuOpen = false)}
              >
                <span>알림</span>
                {#if $page.data?.notifications?.unreadCount > 0}
                  <span class="inline-flex items-center justify-center rounded-full bg-whiskey-600 text-white text-[10px] font-semibold px-2 py-0.5">
                    {$page.data.notifications.unreadCount}
                  </span>
                {/if}
              </a>
              <a
                href="/my-posts"
                class="block py-3 min-h-[44px] px-4 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                onclick={() => (mobileMenuOpen = false)}
              >
                내 글
              </a>
              <a
                href="/profile"
                class="block py-3 min-h-[44px] px-4 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                onclick={() => (mobileMenuOpen = false)}
              >
                마이페이지
              </a>
              <a
                href="/bookmarks"
                class="block py-3 min-h-[44px] px-4 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                onclick={() => (mobileMenuOpen = false)}
              >
                북마크
              </a>
              <div class="my-1 h-px bg-black/5"></div>
              <a
                href="/logout"
                class="block py-3 min-h-[44px] px-4 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                onclick={() => (mobileMenuOpen = false)}
              >
                로그아웃
              </a>
            </div>
          </div>
        {:else}
          <div class="rounded-2xl border border-black/5 bg-white/95 p-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
            <div class="mb-3">
              <SearchBar initialQuery={$page.url.searchParams.get('q') || ''} />
            </div>
            <div class="space-y-2">
              <a
                href="/posts"
                class="block py-3 min-h-[44px] px-4 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                onclick={() => (mobileMenuOpen = false)}
              >
                게시글
              </a>
              <a
                href="/write"
                class="block py-3 min-h-[44px] px-4 rounded-xl bg-whiskey-500 text-white hover:bg-whiskey-600 transition-colors font-semibold shadow-sm shadow-black/10"
                onclick={() => (mobileMenuOpen = false)}
              >
                작성하기
              </a>
              <a
                href="/login"
                class="block py-3 min-h-[44px] px-4 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                onclick={() => (mobileMenuOpen = false)}
              >
                로그인
              </a>
              <a
                href="/signup"
                class="block py-3 min-h-[44px] px-4 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                onclick={() => (mobileMenuOpen = false)}
              >
                회원가입
              </a>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</nav>
