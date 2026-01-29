<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { resolve } from '$app/paths';

  // 로그아웃 후 리다이렉트 시 데이터 갱신 (브라우저에서만 실행)
  $effect(() => {
    if (browser && $page.url.searchParams.get('logout') === '1') {
      invalidateAll();
      // URL에서 쿼리 파라미터 제거 (히스토리 정리)
      window.history.replaceState({}, '', '/');
    }
  });
</script>

<svelte:head>
  <title>whiskylog - 위스키 리뷰 커뮤니티</title>
  <meta name="description" content="위스키 리뷰와 정보를 공유하는 커뮤니티입니다." />
</svelte:head>

<div class="max-w-6xl xl:max-w-7xl mx-auto px-4 xl:px-8 py-12">
  <!-- 메인 타이틀 -->
  <section class="mb-16 text-center">
    <div class="mb-6 flex justify-center">
      <img src="/logo.svg" alt="whiskylog" class="h-24 w-24 sm:h-32 sm:w-32" />
    </div>
    <div class="mb-4">
      <!-- 좁은 화면: 2줄 -->
      <div class="md:hidden overflow-x-auto">
        <div class="flex flex-col items-center gap-2">
          <pre class="inline-block w-max text-[9px] xs:text-[10px] sm:text-xs font-mono leading-tight text-whiskey-900 text-left whitespace-pre">██╗    ██╗██╗  ██╗██╗███████╗██╗  ██╗██╗   ██╗
██║    ██║██║  ██║██║██╔════╝██║ ██╔╝╚██╗ ██╔╝
██║ █╗ ██║███████║██║███████╗█████╔╝  ╚████╔╝
██║███╗██║██╔══██║██║╚════██║██╔═██╗   ╚██╔╝
╚███╔███╔╝██║  ██║██║███████║██║  ██╗   ██║
 ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝
</pre>
          <pre class="inline-block w-max text-[9px] xs:text-[10px] sm:text-xs font-mono leading-tight text-whiskey-900 text-left whitespace-pre">██╗      ██████╗  ██████╗ 
██║     ██╔═══██╗██╔════╝ 
██║     ██║   ██║██║  ███╗
██║     ██║   ██║██║   ██║
███████╗╚██████╔╝╚██████╔╝
╚══════╝ ╚═════╝  ╚═════╝</pre>
        </div>
      </div>

      <!-- 넓은 화면: 1줄 -->
      <div class="hidden md:block overflow-x-auto">
        <pre class="inline-block w-max text-[10px] md:text-sm lg:text-base font-mono leading-tight text-whiskey-900 text-left whitespace-pre mx-auto">██╗    ██╗██╗  ██╗██╗███████╗██╗  ██╗██╗   ██╗██╗      ██████╗  ██████╗ 
██║    ██║██║  ██║██║██╔════╝██║ ██╔╝╚██╗ ██╔╝██║     ██╔═══██╗██╔════╝ 
██║ █╗ ██║███████║██║███████╗█████╔╝  ╚████╔╝ ██║     ██║   ██║██║  ███╗
██║███╗██║██╔══██║██║╚════██║██╔═██╗   ╚██╔╝  ██║     ██║   ██║██║   ██║
╚███╔███╔╝██║  ██║██║███████║██║  ██╗   ██║   ███████╗╚██████╔╝╚██████╔╝
 ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝  ╚═════╝</pre>
      </div>
    </div>
    <p class="text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto">
      위스키를 사랑하는 사람들이 모여 리뷰와 정보를 공유하는 공간입니다.
    </p>
  </section>

  <!-- 주요 기능 카드 -->
  <section class="mb-16">
    <div class="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
      <!-- 게시글 목록 -->
      <a
        href={resolve('/posts')}
        class="group bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg hover:border-whiskey-300 transition-all"
      >
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 rounded-lg bg-whiskey-100 flex items-center justify-center group-hover:bg-whiskey-200 transition-colors">
            <svg class="w-6 h-6 text-whiskey-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-900 group-hover:text-whiskey-600 transition-colors">
            게시글 목록
          </h2>
        </div>
        <p class="text-gray-600 text-sm">
          위스키에 대한 다양한 리뷰와 정보를 확인하세요.
        </p>
      </a>

      <!-- 글 작성 -->
      <a
        href={resolve('/write')}
        class="group bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg hover:border-whiskey-300 transition-all"
      >
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 rounded-lg bg-whiskey-100 flex items-center justify-center group-hover:bg-whiskey-200 transition-colors">
            <svg class="w-6 h-6 text-whiskey-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-900 group-hover:text-whiskey-600 transition-colors">
            글 작성
          </h2>
        </div>
        <p class="text-gray-600 text-sm">
          나만의 위스키 경험과 리뷰를 공유해보세요.
        </p>
      </a>

      <!-- DB 보기 -->
      <a
        href={resolve('/whiskies')}
        class="group bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg hover:border-whiskey-300 transition-all"
      >
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 rounded-lg bg-whiskey-100 flex items-center justify-center group-hover:bg-whiskey-200 transition-colors">
            <svg class="w-6 h-6 text-whiskey-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6c0-1.1 3.58-2 8-2s8 .9 8 2-3.58 2-8 2-8-.9-8-2Zm0 6c0 1.1 3.58 2 8 2s8-.9 8-2m-16 6c0 1.1 3.58 2 8 2s8-.9 8-2" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-900 group-hover:text-whiskey-600 transition-colors">
            DB 보기
          </h2>
        </div>
        <p class="text-gray-600 text-sm">
          위스키 DB를 둘러보고 상세 정보를 확인하세요.
        </p>
      </a>

      <!-- 문의 -->
      <a
        href={resolve('/contact')}
        class="group bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg hover:border-whiskey-300 transition-all"
      >
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 rounded-lg bg-whiskey-100 flex items-center justify-center group-hover:bg-whiskey-200 transition-colors">
            <svg class="w-6 h-6 text-whiskey-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-900 group-hover:text-whiskey-600 transition-colors">
            문의
          </h2>
        </div>
        <p class="text-gray-600 text-sm">
          제안/버그 제보/협업 문의를 남겨주세요.
        </p>
      </a>

      <!-- WBTI 테스트 -->
      <a
        href={resolve('/wbti')}
        class="group bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg hover:border-whiskey-300 transition-all"
      >
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 rounded-lg bg-whiskey-100 flex items-center justify-center group-hover:bg-whiskey-200 transition-colors">
            <svg class="w-6 h-6 text-whiskey-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m6-6H6" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-900 group-hover:text-whiskey-600 transition-colors">
            WBTI 테스트
          </h2>
        </div>
        <p class="text-gray-600 text-sm">
          2분만에 나의 위스키 성향을 확인해보세요.
        </p>
      </a>

      <!-- 맵 조회 -->
      <a
        href={resolve('/map')}
        class="group bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg hover:border-whiskey-300 transition-all"
      >
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 rounded-lg bg-whiskey-100 flex items-center justify-center group-hover:bg-whiskey-200 transition-colors">
            <svg class="w-6 h-6 text-whiskey-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5zm0 0v6m0 0l-3-3m3 3l3-3M5 20h14" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-900 group-hover:text-whiskey-600 transition-colors">
            맵 조회
          </h2>
        </div>
        <p class="text-gray-600 text-sm">
          콜키지 가능한 위스키 바를 지도로 확인하세요.
        </p>
      </a>
    </div>
  </section>
</div>
