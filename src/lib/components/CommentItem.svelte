<script>
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { createEventDispatcher } from 'svelte';
  
  export let comment;
  
  $: isMyComment = $page.data?.user?.id === comment.userId;
  $: authorDisplay = comment.authorName || comment.authorEmail || 
    (isMyComment ? ($page.data?.user?.nickname || $page.data?.user?.email?.split('@')[0] || '나') : '사용자');

  const dispatch = createEventDispatcher();
  let pendingDelete = false;

  function enhanceDeleteComment() {
    pendingDelete = true;
    return async ({ result }) => {
      pendingDelete = false;
      if (result.type === 'success') {
        const id = result.data?.deletedId || comment.id;
        dispatch('deleted', id);
        return;
      }
    };
  }
</script>

<div class="rounded-xl bg-white/60 backdrop-blur-sm p-5 ring-1 ring-black/5 shadow-sm">
  <div class="flex items-start justify-between mb-3">
    <div class="flex items-center gap-3">
      <span class="font-semibold text-gray-900">
        {authorDisplay}
      </span>
      <span class="text-sm text-gray-500">{comment.createdAt}</span>
      {#if comment.updatedAt !== comment.createdAt}
        <span class="text-xs text-gray-400">(수정됨)</span>
      {/if}
    </div>
    {#if isMyComment}
      <form method="POST" action="?/deleteComment" use:enhance={enhanceDeleteComment}>
        <input type="hidden" name="commentId" value={comment.id} />
        <button
          type="submit"
          class="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          onclick="return confirm('댓글을 삭제하시겠습니까?')"
          disabled={pendingDelete}
        >
          삭제
        </button>
      </form>
    {/if}
  </div>
  <p class="text-gray-700 whitespace-pre-line leading-relaxed">{comment.content}</p>
</div>
