<script lang="ts">
  import type { Post } from '$lib/server/supabase/types';

  let { post }: { post: Post } = $props();

  const gradients = [
    'from-whiskey-700 via-whiskey-600 to-whiskey-500',
    'from-whiskey-900 via-whiskey-800 to-whiskey-600',
    'from-whiskey-800 via-whiskey-700 to-whiskey-500',
    'from-whiskey-700 via-whiskey-500 to-whiskey-300'
  ];

  function pickGradient(id: string | undefined): string {
    const str = String(id ?? '');
    const code = str.length ? str.charCodeAt(str.length - 1) : 0;
    return gradients[code % gradients.length];
  }

  let gradientClass = $derived(pickGradient(post?.id));
  let excerptText = $derived(post?.content || '');
</script>

<article class="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg">
  <a href="/posts/{post.id}" class="block">
    <!-- 썸네일 (사진 업로드 전: 그라데이션 + 아이콘) -->
    <div class="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br {gradientClass}">
      <div class="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_20%_20%,white,transparent_45%),radial-gradient(circle_at_80%_70%,white,transparent_50%)]"></div>
      <div class="absolute inset-0 flex items-center justify-center">
        <!-- 위스키 병 아이콘 -->
        <div class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm transition group-hover:bg-white/15">
          <svg class="h-10 w-10 text-white/90" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M9 2h6v2a1 1 0 0 1-1 1h-1v2.2l1.8 2.4c.13.17.2.38.2.6V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V10.2c0-.22.07-.43.2-.6L11 7.2V5h-1a1 1 0 0 1-1-1V2Z"
              fill="currentColor"
              opacity="0.95"
            />
            <path
              d="M9.5 13.5h5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              opacity="0.85"
            />
          </svg>
        </div>
      </div>

      <!-- 메타 배지 -->
      <div class="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/10 backdrop-blur">
        <span class="h-1.5 w-1.5 rounded-full bg-white/80"></span>
        <span>{post.createdAt}</span>
      </div>
    </div>

    <!-- 내용 -->
    <div class="p-5">
      <h2 class="text-lg font-bold text-gray-900 leading-snug tracking-tight line-clamp-2 group-hover:text-whiskey-700">
        {post.title}
      </h2>

      {#if excerptText}
        <p class="mt-2 text-sm leading-relaxed text-gray-600 line-clamp-3">
          {excerptText}
        </p>
      {/if}

      <div class="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div class="flex items-center gap-2">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-whiskey-50 text-whiskey-800 ring-1 ring-whiskey-100 font-bold">
            {post.author?.slice(0, 1) || '익'}
          </span>
          <span class="font-medium text-gray-700">{post.author}</span>
        </div>

        <div class="flex items-center gap-3">
          {#if post.views !== undefined}
            <span class="inline-flex items-center gap-1">
              <span class="text-gray-400">조회</span> {post.views}
            </span>
          {/if}
          {#if post.likes !== undefined}
            <span class="inline-flex items-center gap-1">
              <span class="text-gray-400">좋아요</span> {post.likes}
            </span>
          {/if}
        </div>
      </div>
    </div>
  </a>
</article>
