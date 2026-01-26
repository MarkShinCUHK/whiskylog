<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { showToast } from '$lib/stores/toast';
  
  let {
    postId,
    isBookmarked: initialIsBookmarked = false
  }: {
    postId: string;
    isBookmarked?: boolean;
  } = $props();

  let pending = $state(false);
  let isLoggedIn = $derived(!!$page.data?.user);
  let isBookmarked = $state(false);

  $effect(() => {
    isBookmarked = initialIsBookmarked;
  });

  function enhanceToggleBookmark({ cancel }: { cancel: () => void }) {
    if (!isLoggedIn) {
      cancel();
      showToast('북마크를 사용하려면 로그인이 필요합니다.', 'error');
      return async () => {};
    }

    const prev = isBookmarked;
    pending = true;
    isBookmarked = !prev;

    return async ({ result }: { result: any }) => {
      pending = false;

      if (result.type === 'success') {
        isBookmarked = typeof result.data?.isBookmarked === 'boolean' ? result.data.isBookmarked : isBookmarked;
        return;
      }

      isBookmarked = prev;
      if (result.type === 'failure' && result.data?.error) {
        showToast(result.data.error, 'error');
      } else {
        showToast('북마크 처리 중 오류가 발생했습니다.', 'error');
      }
    };
  }
</script>

<form method="POST" action="?/toggleBookmark" use:enhance={enhanceToggleBookmark}>
  <input type="hidden" name="postId" value={postId} />
  <button
    type="submit"
    disabled={pending || !isLoggedIn}
    class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium shadow-sm hover:shadow
      {isLoggedIn
        ? isBookmarked
          ? 'bg-whiskey-100 text-whiskey-800 hover:bg-whiskey-200 ring-1 ring-whiskey-200'
          : 'bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-black/10'
        : 'bg-gray-50 text-gray-400 cursor-not-allowed ring-1 ring-black/5'}"
    title={isLoggedIn ? (isBookmarked ? '북마크 해제' : '북마크') : '로그인이 필요합니다'}
  >
    <svg
      class="w-5 h-5 {pending ? 'opacity-70' : ''}"
      fill={isBookmarked ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-4-7 4V5z"
      />
    </svg>
    <span>{isBookmarked ? '북마크됨' : '북마크'}</span>
  </button>
</form>
