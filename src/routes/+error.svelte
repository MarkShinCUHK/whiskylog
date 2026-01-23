<script lang="ts">
  import { page } from '$app/stores';
  
  let status = $derived($page.status || 500);
  let is404 = $derived(status === 404);
  let is403 = $derived(status === 403);
  let is500 = $derived(status === 500);
  
  const errorMessages: Record<number, string> = {
    404: '요청하신 페이지를 찾을 수 없습니다.',
    403: '이 페이지에 접근할 권한이 없습니다.',
    500: '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  };
  
  let errorMessage = $derived($page.error?.message || errorMessages[status] || '오류가 발생했습니다.');
  let title = $derived(is404 ? '페이지를 찾을 수 없습니다' : is403 ? '접근 권한 없음' : is500 ? '서버 오류' : '오류가 발생했습니다');
  
  // 에러 코드별 아이콘
  let iconPath = $derived(
    is404 
      ? 'M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
      : is403
      ? 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
      : 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  );
</script>

<div class="min-h-screen flex items-center justify-center px-4 py-20">
  <div class="max-w-md w-full text-center">
    <div class="rounded-2xl bg-white/80 backdrop-blur-sm p-12 ring-1 ring-black/5 shadow-sm">
      <div class="mb-6">
        <!-- 아이콘 -->
        <div class="mb-6 flex justify-center">
          <div class="rounded-full bg-whiskey-100 p-4">
            <svg class="h-12 w-12 text-whiskey-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPath} />
            </svg>
          </div>
        </div>
        
        <h1 class="text-6xl sm:text-7xl font-bold text-whiskey-900 mb-4 tracking-tight">
          {status}
        </h1>
        <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
          {title}
        </h2>
        <p class="text-lg text-gray-600">
          {errorMessage}
        </p>
      </div>
      
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/"
          class="inline-flex items-center justify-center px-6 py-3 min-h-[44px] bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          홈으로 돌아가기
        </a>
        <button
          type="button"
          onclick={() => window.history.back()}
          class="inline-flex items-center justify-center px-6 py-3 min-h-[44px] bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium ring-1 ring-black/10 shadow-sm hover:shadow"
        >
          이전 페이지
        </button>
      </div>
    </div>
  </div>
</div>
