<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>위스키 DB - whiskylog</title>
</svelte:head>

<div class="max-w-6xl xl:max-w-7xl mx-auto px-4 xl:px-8 py-12">
  <div class="mb-10">
    <h1 class="text-3xl sm:text-4xl font-bold text-whiskey-900 mb-3 tracking-tight">위스키 DB</h1>
    <p class="text-gray-600">등록된 위스키 목록을 확인하세요.</p>
  </div>

  {#if data?.whiskies?.length}
    <div class="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.whiskies as whisky}
        <div class="rounded-2xl bg-white/80 backdrop-blur-sm p-6 ring-1 ring-black/5 shadow-sm">
          <p class="text-sm text-gray-500 mb-2">{whisky.type || '기타'}</p>
          <h2 class="text-lg font-bold text-gray-900 mb-2">
            {whisky.brand ? `${whisky.brand} - ${whisky.name}` : whisky.name}
          </h2>
          <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            {#if whisky.region}
              <span class="rounded-full bg-whiskey-50 px-3 py-1">{whisky.region}</span>
            {/if}
            {#if whisky.age}
              <span class="rounded-full bg-whiskey-50 px-3 py-1">{whisky.age}년</span>
            {/if}
            {#if whisky.abv}
              <span class="rounded-full bg-whiskey-50 px-3 py-1">ABV {whisky.abv}%</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="rounded-2xl bg-white/70 backdrop-blur-sm p-12 text-center ring-1 ring-black/5 shadow-sm">
      <p class="text-lg text-gray-700 mb-6">등록된 위스키가 없습니다.</p>
      <a href="/write" class="inline-flex items-center gap-2 px-6 py-3 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium shadow-sm hover:shadow-md">
        게시글 작성하러 가기
      </a>
    </div>
  {/if}
</div>
