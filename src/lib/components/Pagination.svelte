<script lang="ts">
  let { 
    page = 1, 
    totalPages = 1,
    hrefForPage 
  }: {
    page?: number;
    totalPages?: number;
    hrefForPage: (p: number) => string;
  } = $props();

  let safeTotalPages = $derived(Math.max(1, totalPages || 1));
  let safePage = $derived(Math.min(Math.max(1, page || 1), safeTotalPages));

  let pages = $derived((() => {
    const maxButtons = 7;
    if (safeTotalPages <= maxButtons) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
    }
    const out: (number | string)[] = [];
    out.push(1);

    const start = Math.max(2, safePage - 1);
    const end = Math.min(safeTotalPages - 1, safePage + 1);

    if (start > 2) out.push('ellipsis-left');
    for (let p = start; p <= end; p++) out.push(p);
    if (end < safeTotalPages - 1) out.push('ellipsis-right');

    out.push(safeTotalPages);
    return out;
  })());
</script>

<nav class="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
  <a
    href={safePage > 1 ? hrefForPage(safePage - 1) : undefined}
    aria-disabled={safePage <= 1}
    class="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-black/10 transition
      {safePage <= 1
        ? 'pointer-events-none bg-gray-50 text-gray-400'
        : 'bg-white text-gray-700 hover:bg-gray-50'}"
  >
    이전
  </a>

  <div class="flex items-center gap-1">
    {#each pages as p}
      {#if typeof p === 'number'}
        <a
          href={hrefForPage(p)}
          aria-current={p === safePage ? 'page' : undefined}
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-black/10 transition
            {p === safePage
              ? 'bg-whiskey-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'}"
        >
          {p}
        </a>
      {:else}
        <span class="px-2 text-gray-400">…</span>
      {/if}
    {/each}
  </div>

  <a
    href={safePage < safeTotalPages ? hrefForPage(safePage + 1) : undefined}
    aria-disabled={safePage >= safeTotalPages}
    class="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-black/10 transition
      {safePage >= safeTotalPages
        ? 'pointer-events-none bg-gray-50 text-gray-400'
        : 'bg-white text-gray-700 hover:bg-gray-50'}"
  >
    다음
  </a>
</nav>

