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
  <title>검색 - whiskylog</title>
</svelte:head>

<div class="max-w-6xl xl:max-w-7xl mx-auto px-4 xl:px-8 py-12">
  <div class="mb-12">
    <h1 class="text-3xl sm:text-4xl font-bold text-whiskey-900 mb-3 tracking-tight">검색</h1>
    {#if data.q?.trim()}
      <p class="text-lg text-gray-600">
        {#if data.q.trim().startsWith('#')}
          <span class="font-semibold text-gray-900">#{data.q.trim().slice(1)}</span> 태그 검색 결과 ({data.totalCount}개)
        {:else}
          <span class="font-semibold text-gray-900">"{data.q}"</span> 검색 결과 ({data.totalCount}개)
        {/if}
      </p>
    {:else}
      <p class="text-lg text-gray-600">검색어를 입력해주세요.</p>
    {/if}
  </div>

  <form method="GET" action="/search" class="mb-10 grid gap-4 rounded-2xl bg-white/70 backdrop-blur-sm p-6 ring-1 ring-black/5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
    <div class="sm:col-span-2 lg:col-span-2">
      <label for="q" class="block text-sm font-medium text-gray-700 mb-2">검색어</label>
      <input
        id="q"
        name="q"
        type="text"
        value={data.q ?? ''}
        placeholder="제목/내용 또는 #태그"
        class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-whiskey-500 focus:ring-2 focus:ring-whiskey-500"
      />
    </div>
    <div>
      <label for="author" class="block text-sm font-medium text-gray-700 mb-2">작성자</label>
      <input
        id="author"
        name="author"
        type="text"
        value={data.filters?.author ?? ''}
        placeholder="닉네임 또는 이메일"
        class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-whiskey-500 focus:ring-2 focus:ring-whiskey-500"
      />
    </div>
    <div>
      <label for="sort" class="block text-sm font-medium text-gray-700 mb-2">정렬</label>
      <select
        id="sort"
        name="sort"
        value={data.filters?.sort ?? 'newest'}
        class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-whiskey-500 focus:ring-2 focus:ring-whiskey-500"
      >
        <option value="newest">최신순</option>
        <option value="oldest">오래된순</option>
        <option value="views">조회수순</option>
      </select>
    </div>
    <div>
      <label for="from" class="block text-sm font-medium text-gray-700 mb-2">시작 날짜</label>
      <input
        id="from"
        name="from"
        type="date"
        value={data.filters?.from ?? ''}
        class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-whiskey-500 focus:ring-2 focus:ring-whiskey-500"
      />
    </div>
    <div>
      <label for="to" class="block text-sm font-medium text-gray-700 mb-2">종료 날짜</label>
      <input
        id="to"
        name="to"
        type="date"
        value={data.filters?.to ?? ''}
        class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-whiskey-500 focus:ring-2 focus:ring-whiskey-500"
      />
    </div>
    <div class="sm:col-span-2 lg:col-span-4 flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
      <a
        href="/search"
        class="inline-flex items-center justify-center rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        필터 초기화
      </a>
      <button
        type="submit"
        class="inline-flex items-center justify-center rounded-lg bg-whiskey-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-whiskey-700"
      >
        검색 적용
      </button>
    </div>
  </form>

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
