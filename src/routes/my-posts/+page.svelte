<script lang="ts">
  import PostCard from '$lib/components/PostCard.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { showToast } from '$lib/stores/toast';
  
  let { data } = $props();

  function hrefForPage(p: number): string {
    const url = new URL($page.url);
    url.searchParams.set('page', p.toString());
    return url.pathname + url.search;
  }

  // 회원가입 후 리다이렉트된 경우 토스트 메시지 표시
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const wasAnonymous = urlParams.get('wasAnonymous') === 'true';
    const convertedCount = parseInt(urlParams.get('convertedCount') || '0', 10);
    const sessionExpired = urlParams.get('sessionExpired') === 'true';

    if (wasAnonymous) {
      if (convertedCount > 0) {
        showToast(
          `회원가입이 완료되었습니다. 익명으로 작성한 ${convertedCount}개의 글이 본인 글로 옮겨졌습니다.${sessionExpired ? ' (오래된 세션으로 인해 일부 글은 업데이트되지 않았을 수 있습니다. 필요시 다시 로그인해주세요.)' : ''}`,
          'success'
        );
      } else if (sessionExpired) {
        showToast(
          '회원가입이 완료되었습니다. 다만 오래된 세션으로 인해 익명으로 작성한 일부 글은 업데이트되지 않았을 수 있습니다. 필요시 다시 로그인해주세요.',
          'success'
        );
      } else {
        showToast('회원가입이 완료되었습니다. 익명으로 작성한 글이 본인 글로 옮겨졌습니다.', 'success');
      }

      // 쿼리 파라미터 제거 (새로고침 시 토스트가 다시 표시되지 않도록)
      const url = new URL(window.location.href);
      url.searchParams.delete('wasAnonymous');
      url.searchParams.delete('convertedCount');
      url.searchParams.delete('sessionExpired');
      window.history.replaceState({}, '', url.toString());
    }
  });
</script>

<svelte:head>
  <title>내 글 - whiskylog</title>
</svelte:head>

<div class="max-w-6xl xl:max-w-7xl mx-auto px-4 xl:px-8 py-12">
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
    <div>
      <h1 class="text-3xl sm:text-4xl font-bold text-whiskey-900 mb-3 tracking-tight">내 글</h1>
      <p class="text-lg text-gray-600">
        {#if data.user?.email}
          {data.user.email} 님이 작성한 게시글 목록입니다.
        {:else}
          내가 작성한 게시글 목록입니다.
        {/if}
      </p>
    </div>
    <a
      href="/write"
      class="inline-flex items-center justify-center px-6 py-3 bg-whiskey-600 hover:bg-whiskey-700 text-white rounded-lg transition-colors font-medium shadow-sm hover:shadow-md"
    >
      작성하기
    </a>
  </div>

  {#if !data.posts || data.posts.length === 0}
    <div class="rounded-2xl bg-white/60 backdrop-blur-sm p-12 text-center ring-1 ring-black/5 shadow-sm">
      <p class="text-lg text-gray-700 mb-6">아직 작성한 게시글이 없습니다.</p>
      <a href="/write" class="inline-flex items-center justify-center px-6 py-3 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium shadow-sm hover:shadow-md">
        첫 글 작성하러 가기
      </a>
    </div>
  {:else}
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
  {/if}
</div>

