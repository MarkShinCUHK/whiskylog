<script>
  import PostCard from '$lib/components/PostCard.svelte';
  
  export let data;
</script>

<svelte:head>
  <title>게시글 목록 - DramLog</title>
</svelte:head>

<div class="max-w-6xl mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-4xl font-bold text-whiskey-900 mb-2">게시글 목록</h1>
    <p class="text-gray-600">위스키에 대한 다양한 리뷰와 정보를 확인하세요.</p>
  </div>

  {#if data.posts && data.posts.length > 0}
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.posts as post}
        <PostCard {post} />
      {/each}
    </div>
  {:else}
    <div class="text-center py-12 text-gray-500">
      <p class="mb-4">아직 게시글이 없습니다.</p>
      <a 
        href="/write" 
        class="inline-block px-6 py-3 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium"
      >
        첫 글 작성하기
      </a>
    </div>
  {/if}
</div>
