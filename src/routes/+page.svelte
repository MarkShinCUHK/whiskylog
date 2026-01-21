<script>
  import PostCard from '$lib/components/PostCard.svelte';
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  
  export let data;
  
  // 로그아웃 후 리다이렉트 시 데이터 갱신
  $: if ($page.url.searchParams.get('logout') === '1') {
    invalidateAll();
    // URL에서 쿼리 파라미터 제거 (히스토리 정리)
    window.history.replaceState({}, '', '/');
  }
</script>

<svelte:head>
  <title>DramLog</title>
  <meta name="description" content="위스키 리뷰와 정보를 공유하는 커뮤니티입니다." />
</svelte:head>

<div class="max-w-6xl mx-auto px-4 py-12">
  <!-- 커뮤니티 소개 섹션 -->
  <section class="mb-16">
    <div class="text-center mb-8">
      <h1 class="text-5xl font-bold text-whiskey-900 mb-4">
        DramLog에 오신 것을 환영합니다
      </h1>
      <p class="text-xl text-gray-700 max-w-2xl mx-auto">
        위스키를 사랑하는 사람들이 모여 리뷰와 정보를 공유하는 공간입니다.
        다양한 위스키에 대한 경험과 지식을 나눠보세요.
      </p>
    </div>
  </section>

  <!-- 최신 글 목록 -->
  <section>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-3xl font-bold text-whiskey-900">최신 글</h2>
      <a 
        href="/posts" 
        class="text-whiskey-600 hover:text-whiskey-700 font-medium transition-colors"
      >
        전체 보기 →
      </a>
    </div>
    
    {#if data.posts && data.posts.length > 0}
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.posts.slice(0, 6) as post}
          <PostCard {post} />
        {/each}
      </div>
    {:else}
      <div class="text-center py-12 text-gray-500">
        <p>아직 게시글이 없습니다.</p>
        <a href="/write" class="text-whiskey-600 hover:text-whiskey-700 font-medium mt-2 inline-block">
          첫 글을 작성해보세요!
        </a>
      </div>
    {/if}
  </section>
</div>
