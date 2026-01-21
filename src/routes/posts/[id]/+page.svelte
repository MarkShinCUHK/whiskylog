<script>
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  
  export let data;
</script>

<svelte:head>
  <title>{data.post?.title || '게시글'} - DramLog</title>
</svelte:head>

{#if data.post}
  <article class="max-w-4xl mx-auto px-4 py-8">
    <!-- 헤더 -->
    <header class="mb-8">
      <h1 class="text-4xl font-bold text-whiskey-900 mb-4">{data.post.title}</h1>
      <div class="flex items-center justify-between text-gray-600">
        <div class="flex items-center gap-4">
          <span class="font-medium">{data.post.author}</span>
          <span>{data.post.createdAt}</span>
        </div>
        <div class="flex items-center gap-4 text-sm">
          {#if data.post.views !== undefined}
            <span>조회 {data.post.views}</span>
          {/if}
          {#if data.post.likes !== undefined}
            <span>좋아요 {data.post.likes}</span>
          {/if}
        </div>
      </div>
    </header>

    <!-- 본문 -->
    <div class="prose prose-lg max-w-none">
      <div class="bg-white rounded-lg shadow-md p-8 border border-gray-100">
        <div class="text-gray-700 whitespace-pre-line leading-relaxed">
          {data.post.content}
        </div>
      </div>
    </div>

    <!-- 하단 버튼 -->
    <div class="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
      <a 
        href="/posts" 
        class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
      >
        목록으로
      </a>
      <a
        href="/posts/{data.post.id}/edit"
        class="px-6 py-3 bg-whiskey-500 text-white rounded-lg hover:bg-whiskey-600 transition-colors font-medium"
      >
        수정하기
      </a>
      <form method="POST" action="?/delete" use:enhance class="flex flex-col gap-3 sm:flex-row sm:items-center">
        {#if !$page.data?.user}
          <input
            type="password"
            name="editPassword"
            placeholder="비밀번호 (삭제용)"
            class="w-full sm:w-56 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            required
          />
        {/if}
        <button
          type="submit"
          class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          onclick="return confirm('정말로 이 게시글을 삭제하시겠습니까?')"
        >
          삭제하기
        </button>
      </form>
    </div>
  </article>
{:else}
  <div class="max-w-4xl mx-auto px-4 py-12 text-center">
    <h1 class="text-2xl font-bold text-gray-900 mb-4">게시글을 찾을 수 없습니다</h1>
    <p class="text-gray-600 mb-6">요청하신 게시글이 존재하지 않습니다.</p>
    <a 
      href="/posts" 
      class="inline-block px-6 py-3 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium"
    >
      목록으로 돌아가기
    </a>
  </div>
{/if}
