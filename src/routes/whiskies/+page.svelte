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
    <div class="overflow-x-auto rounded-2xl bg-white/80 backdrop-blur-sm ring-1 ring-black/5 shadow-sm">
      <table class="min-w-full text-sm text-gray-800">
        <thead class="bg-whiskey-50/80 text-xs font-semibold uppercase tracking-wide text-whiskey-900">
          <tr>
            <th class="px-4 py-3 text-left">브랜드</th>
            <th class="px-4 py-3 text-left">이름</th>
            <th class="px-4 py-3 text-left">타입</th>
            <th class="px-4 py-3 text-left">지역</th>
            <th class="px-4 py-3 text-left">숙성</th>
            <th class="px-4 py-3 text-left">ABV</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-black/5">
          {#each data.whiskies as whisky}
            <tr class="hover:bg-whiskey-50/40 transition-colors">
              <td class="px-4 py-3 font-medium text-gray-900">{whisky.brand || '-'}</td>
              <td class="px-4 py-3">{whisky.name}</td>
              <td class="px-4 py-3">{whisky.type || '기타'}</td>
              <td class="px-4 py-3">{whisky.region || '-'}</td>
              <td class="px-4 py-3">{whisky.age ? `${whisky.age}년` : '-'}</td>
              <td class="px-4 py-3">{whisky.abv ? `${whisky.abv}%` : '-'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
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
