<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { showToast } from '$lib/stores/toast';
  
  let { 
    postId,
    likeCount: initialLikeCount = 0,
    isLiked: initialIsLiked = false
  }: {
    postId: string;
    likeCount?: number;
    isLiked?: boolean;
  } = $props();
  
  let pending = $state(false);
  let isLoggedIn = $derived(!!$page.data?.user);
  let likeCount = $state(0);
  let isLiked = $state(false);

  $effect(() => {
    likeCount = initialLikeCount;
    isLiked = initialIsLiked;
  });

  function enhanceToggleLike({ cancel }: { cancel: () => void }) {
    if (!isLoggedIn) {
      cancel();
      showToast('좋아요를 누르려면 로그인이 필요합니다.', 'error');
      return async () => {};
    }

    const prevLiked = isLiked;
    const prevCount = likeCount;

    // 즉시 반응(낙관적 업데이트)
    pending = true;
    isLiked = !prevLiked;
    likeCount = Math.max(0, prevCount + (isLiked ? 1 : -1));

    return async ({ result }: { result: any }) => {
      pending = false;

      if (result.type === 'success') {
        // 서버가 돌려준 값으로 정합성 맞추기
        likeCount = typeof result.data?.likeCount === 'number' ? result.data.likeCount : likeCount;
        isLiked = typeof result.data?.isLiked === 'boolean' ? result.data.isLiked : isLiked;
        return;
      }

      // 실패 시 롤백
      likeCount = prevCount;
      isLiked = prevLiked;

      if (result.type === 'failure' && result.data?.error) {
        showToast(result.data.error, 'error');
      } else {
        showToast('좋아요 처리 중 오류가 발생했습니다.', 'error');
      }
    };
  }
</script>

<div class="flex items-center gap-2">
  <form method="POST" action="?/toggleLike" use:enhance={enhanceToggleLike}>
    <input type="hidden" name="postId" value={postId} />
    <button
      type="submit"
      disabled={pending || !isLoggedIn}
      class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium shadow-sm hover:shadow
        {isLoggedIn
          ? isLiked
            ? 'bg-red-100 text-red-700 hover:bg-red-200 ring-1 ring-red-200'
            : 'bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-black/10'
          : 'bg-gray-50 text-gray-400 cursor-not-allowed ring-1 ring-black/5'}"
      title={isLoggedIn ? (isLiked ? '좋아요 취소' : '좋아요') : '로그인이 필요합니다'}
    >
      <svg
        class="w-5 h-5 {isLiked ? 'fill-current' : ''} {pending ? 'opacity-70' : ''}"
        fill={isLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span>{likeCount}</span>
    </button>
  </form>
</div>
