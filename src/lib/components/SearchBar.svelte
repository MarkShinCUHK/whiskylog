<script lang="ts">
  let { initialQuery = '' }: { initialQuery?: string } = $props();

  let q = $state('');
  
  // initialQuery가 변경되면 q도 업데이트
  $effect(() => {
    q = initialQuery ?? '';
  });
</script>

<form action="/search" method="GET" class="w-full">
  <label class="sr-only" for="q">검색</label>
  <div class="relative">
    <input
      id="q"
      name="q"
      type="search"
      bind:value={q}
      placeholder="검색 (제목/내용)"
      class="w-full rounded-full bg-white/80 px-4 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 ring-1 ring-black/10 shadow-sm shadow-black/5 outline-none transition focus:bg-white focus:ring-2 focus:ring-whiskey-400"
    />
    <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
          stroke="currentColor"
          stroke-width="2"
        />
        <path
          d="M16.5 16.5 21 21"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </div>
  </div>
</form>
