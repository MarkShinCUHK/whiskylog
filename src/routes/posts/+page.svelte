<script lang="ts">
  import PostCard from '$lib/components/PostCard.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import { page, navigating } from '$app/stores';
  
  let { data } = $props();

  function hrefForPage(p: number): string {
    const url = new URL($page.url);
    url.searchParams.set('page', p.toString());
    return url.pathname + url.search;
  }
</script>

<svelte:head>
  <title>게시글 목록 - whiskylog</title>
</svelte:head>

<div class="max-w-6xl xl:max-w-7xl mx-auto px-4 xl:px-8 py-12">
  <div class="mb-12">
    <h1 class="text-3xl sm:text-4xl font-bold text-whiskey-900 mb-3 tracking-tight">게시글 목록</h1>
    {#if data.tag}
      <p class="text-lg text-gray-600">
        <span class="font-semibold text-gray-900">#{data.tag}</span> 태그 게시글
      </p>
    {:else}
      <p class="text-lg text-gray-600">위스키에 대한 다양한 리뷰와 정보를 확인하세요.</p>
    {/if}
  </div>

  {#if $navigating}
    <!-- 네비게이션 중 스켈레톤 표시 -->
    <div class="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
      {#each Array(6) as _}
        <Skeleton />
      {/each}
    </div>
  {:else if data.posts && data.posts.length > 0}
    <div class="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
      {#each data.posts as post}
        <PostCard {post} />
      {/each}
    </div>

    {#if data.totalPages > 1}
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        {hrefForPage}
      />
    {/if}
  {:else}
    <div class="rounded-2xl bg-white/60 backdrop-blur-sm p-12 text-center ring-1 ring-black/5 shadow-sm">
      <p class="text-lg text-gray-700 mb-6">아직 게시글이 없습니다.</p>
      <a 
        href="/write" 
        class="inline-flex items-center gap-2 px-6 py-3 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium shadow-sm hover:shadow-md"
      >
        첫 글 작성하기
      </a>
    </div>
  {/if}
</div>
