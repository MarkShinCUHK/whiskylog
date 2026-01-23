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
  <title>검색 - DramLog</title>
</svelte:head>

<div class="max-w-6xl xl:max-w-7xl mx-auto px-4 xl:px-8 py-12">
  <div class="mb-12">
    <h1 class="text-3xl sm:text-4xl font-bold text-whiskey-900 mb-3 tracking-tight">검색</h1>
    {#if data.q?.trim()}
      <p class="text-lg text-gray-600">
        <span class="font-semibold text-gray-900">"{data.q}"</span> 검색 결과 ({data.totalCount}개)
      </p>
    {:else}
      <p class="text-lg text-gray-600">검색어를 입력해주세요.</p>
    {/if}
  </div>

  {#if $navigating}
    <!-- 네비게이션 중 스켈레톤 표시 -->
    <div class="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
      {#each Array(6) as _}
        <Skeleton />
      {/each}
    </div>
  {:else if data.q?.trim() && data.posts && data.posts.length > 0}
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
  {:else if data.q?.trim()}
    <div class="rounded-2xl bg-white/60 backdrop-blur-sm p-12 text-center ring-1 ring-black/5 shadow-sm">
      <p class="text-lg text-gray-700 mb-6">검색 결과가 없습니다.</p>
      <a href="/posts" class="inline-flex items-center gap-2 px-6 py-3 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium shadow-sm hover:shadow-md">
        전체 게시글 보기
      </a>
    </div>
  {/if}
</div>

