<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { showToast } from '$lib/stores/toast';
  import type { Comment } from '$lib/server/supabase/types';
  
  let { 
    form = {},
    oncreated
  }: {
    form?: any;
    oncreated?: (comment: Comment) => void;
  } = $props();
  
  let content = $state(form?.values?.content || '');
  let error = $state(form?.error || '');
  
  // 익명 사용자도 댓글 작성 가능

  let pending = $state(false);

  function enhanceCreateComment() {
    pending = true;
    const prev = content;

    return async ({ result }: { result: any }) => {
      pending = false;

      if (result.type === 'success') {
        const created = result.data?.comment;
        if (created) oncreated?.(created);
        content = '';
        error = '';
        showToast('댓글이 작성되었습니다.', 'success');
        return;
      }

      // 실패 시 내용 복구 (사용자 입력 보호)
      content = prev;
      const errorMessage = result.data?.error || '댓글 작성에 실패했습니다.';
      error = errorMessage;
      showToast(errorMessage, 'error');
    };
  }
</script>

<form method="POST" action="?/createComment" use:enhance={enhanceCreateComment} class="rounded-xl bg-white/60 backdrop-blur-sm p-6 ring-1 ring-black/5 shadow-sm">
  {#if error}
    <div class="mb-4 p-3 bg-red-50/80 border border-red-200/50 rounded-lg text-red-700 text-sm">
      {error}
    </div>
  {/if}
  
  <div class="mb-4">
    <label for="comment" class="block text-sm font-medium text-gray-700 mb-2">
      댓글 작성
    </label>
    <textarea
      id="comment"
      name="content"
      bind:value={content}
      rows="3"
      placeholder="댓글을 입력하세요..."
      class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500 outline-none resize-none transition-colors"
      disabled={pending}
      required
    ></textarea>
  </div>
  
  <div class="flex justify-end">
    <button
      type="submit"
      class="px-6 py-2.5 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
      disabled={pending}
    >
      댓글 작성
    </button>
  </div>
</form>
