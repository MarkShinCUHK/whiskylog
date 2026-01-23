<script lang="ts">
  import CommentItem from './CommentItem.svelte';
  import type { Comment } from '$lib/server/supabase/types';
  
  let { 
    comments = [],
    ondeleted
  }: {
    comments?: Comment[];
    ondeleted?: (id: string) => void;
  } = $props();
</script>

<div class="space-y-4">
  {#if comments && comments.length > 0}
    {#each comments as comment}
      <CommentItem
        {comment}
        ondeleted={ondeleted}
      />
    {/each}
  {:else}
    <p class="text-center text-gray-500 py-8">아직 댓글이 없습니다.</p>
  {/if}
</div>
