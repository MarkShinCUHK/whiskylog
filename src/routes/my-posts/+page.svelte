<script>
  import PostCard from '$lib/components/PostCard.svelte';
  export let data;
</script>

<svelte:head>
  <title>내 글 - DramLog</title>
</svelte:head>

<div class="max-w-6xl mx-auto px-4 py-8">
  <div class="flex items-end justify-between gap-4 mb-8">
    <div>
      <h1 class="text-3xl font-bold text-whiskey-900">내 글</h1>
      <p class="mt-2 text-sm text-gray-600">
        {#if data.user?.email}
          {data.user.email} 님이 작성한 게시글 목록입니다.
        {:else}
          내가 작성한 게시글 목록입니다.
        {/if}
      </p>
    </div>
    <a
      href="/write"
      class="px-4 py-2 bg-whiskey-600 hover:bg-whiskey-700 text-white rounded-lg transition-colors font-medium"
    >
      작성하기
    </a>
  </div>

  {#if !data.posts || data.posts.length === 0}
    <div class="bg-white rounded-lg shadow-md p-8 border border-gray-100 text-center">
      <p class="text-gray-700 mb-4">아직 작성한 게시글이 없습니다.</p>
      <a href="/write" class="text-whiskey-700 hover:text-whiskey-800 font-medium">첫 글 작성하러 가기</a>
    </div>
  {:else}
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.posts as post}
        <PostCard {post} />
      {/each}
    </div>
  {/if}
</div>

