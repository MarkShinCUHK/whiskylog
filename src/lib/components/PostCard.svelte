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
  function stripHtml(html: string | undefined): string {
    return String(html ?? '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  let excerptText = $derived(stripHtml(post?.content));

  // 첫 번째 이미지 URL 추출
  function getFirstImageUrl(html: string | undefined): string | null {
    if (!html) return null;
    
    // img 태그에서 src 속성 추출
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
    
    return null;
  }

  // 썸네일용 이미지 URL 생성 (Supabase Storage 이미지 변환 사용)
  function getThumbnailUrl(originalUrl: string | null): string | null {
    if (!originalUrl) return null;
    
    // 이미 쿼리 파라미터가 있는 URL은 그대로 반환 (이미 변환된 것으로 간주)
    // 또는 Blob URL인 경우도 그대로 반환 (에디터에서 아직 업로드되지 않은 이미지)
    if (originalUrl.includes('?') || originalUrl.startsWith('blob:')) {
      return originalUrl;
    }
    
    // Supabase Storage URL인지 확인 (storage.googleapis.com 또는 supabase.co)
    const isSupabaseStorage = originalUrl.includes('storage.googleapis.com') || 
                              originalUrl.includes('supabase.co/storage');
    
    if (isSupabaseStorage) {
      // 썸네일용으로 너비 1000px로 리사이즈 (비율 유지, cover 모드로 크롭)
      // aspect-[16/10] 비율에 맞춰서 높이도 계산: 1000 * 10/16 = 625
      // 고해상도 디스플레이를 고려하여 해상도 상향 조정
      return `${originalUrl}?width=1000&height=625&resize=cover`;
    }
    
    // Supabase Storage가 아니면 원본 URL 반환 (외부 이미지 등)
    return originalUrl;
  }

  let firstImageUrl = $derived(getFirstImageUrl(post?.content));
  let thumbnailSource = $derived(post?.thumbnailUrl ?? firstImageUrl);
  let thumbnailUrl = $derived(getThumbnailUrl(thumbnailSource));
</script>

<article class="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg">
  <a href="/posts/{post.id}" class="block">
    <!-- 썸네일 (첫 번째 이미지 또는 그라데이션) -->
    <div class="relative aspect-[16/10] w-full overflow-hidden {thumbnailUrl ? 'bg-gray-100' : `bg-gradient-to-br ${gradientClass}`}">
      {#if thumbnailUrl}
        <!-- 첫 번째 이미지를 썸네일로 사용 (비율 유지하면서 crop) -->
        <img
          src={thumbnailUrl}
          alt={post.title || '게시글 썸네일'}
          class="h-full w-full object-cover"
          loading="lazy"
        />
      {:else}
        <!-- 이미지가 없을 때 그라데이션 + 아이콘 -->
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
      {/if}

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
