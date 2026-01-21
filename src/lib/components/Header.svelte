<script>
  import { page } from '$app/stores';
</script>

<nav class="bg-whiskey-900 text-white shadow-lg">
  <div class="max-w-6xl mx-auto px-4 py-4">
    <div class="flex items-center justify-between">
      <a href="/" class="text-2xl font-bold hover:text-whiskey-200 transition-colors">
        DramLog
      </a>
      <div class="flex items-center gap-3 sm:gap-6">
        <a href="/posts" class="hover:text-whiskey-300 transition-colors font-medium">
          게시글
        </a>
        <a href="/write" class="px-4 py-2 bg-whiskey-600 hover:bg-whiskey-700 rounded-lg transition-colors font-medium">
          작성하기
        </a>

        {#if $page.data?.user}
          <a href="/my-posts" class="hover:text-whiskey-300 transition-colors font-medium">
            내 글
          </a>
          <a href="/logout" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium">
            로그아웃
          </a>
        {:else}
          <a href="/login" class="hover:text-whiskey-300 transition-colors font-medium">
            로그인
          </a>
          <a href="/signup" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium">
            회원가입
          </a>
        {/if}
      </div>
    </div>
  </div>
</nav>
