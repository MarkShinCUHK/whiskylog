<script lang="ts">
  import Pagination from '$lib/components/Pagination.svelte';
  import { page } from '$app/stores';

  let { data } = $props();

  function hrefForPage(p: number): string {
    const url = new URL($page.url);
    url.searchParams.set('page', p.toString());
    return url.pathname + url.search;
  }

  function getMessage(notification: any) {
    const actor = notification.actorName || '누군가';
    if (notification.type === 'comment') {
      return `${actor}님이 댓글을 남겼습니다.`;
    }
    if (notification.type === 'like') {
      return `${actor}님이 좋아요를 눌렀습니다.`;
    }
    return '새 알림이 있습니다.';
  }
</script>

<svelte:head>
  <title>알림 - whiskylog</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 xl:px-8 py-12">
  <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 class="text-3xl sm:text-4xl font-bold text-whiskey-900 mb-2 tracking-tight">알림</h1>
      <p class="text-gray-600">읽지 않은 알림 {data.unreadCount ?? 0}개</p>
    </div>
    <form method="POST" action="?/markAllRead">
      <button
        type="submit"
        class="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        모두 읽음 처리
      </button>
    </form>
  </div>

  {#if data.notifications && data.notifications.length > 0}
    <div class="space-y-4">
      {#each data.notifications as notification}
        <div class="rounded-2xl border {notification.readAt ? 'border-gray-200 bg-white' : 'border-whiskey-200 bg-whiskey-50/70'} p-5 shadow-sm">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900">{getMessage(notification)}</p>
              <p class="mt-1 text-xs text-gray-500">{notification.createdAt}</p>
              <p class="mt-2 text-sm text-gray-700">
                <a href="/posts/{notification.postId}" class="font-semibold text-whiskey-700 hover:text-whiskey-900">
                  {notification.postTitle || '게시글 보기'}
                </a>
              </p>
            </div>
            <div class="flex items-center gap-2">
              {#if !notification.readAt}
                <form method="POST" action="?/markRead">
                  <input type="hidden" name="notificationId" value={notification.id} />
                  <button
                    type="submit"
                    class="inline-flex items-center justify-center rounded-lg bg-whiskey-600 px-3 py-2 text-xs font-semibold text-white hover:bg-whiskey-700"
                  >
                    읽음
                  </button>
                </form>
              {/if}
              <a
                href="/posts/{notification.postId}"
                class="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                이동
              </a>
            </div>
          </div>
        </div>
      {/each}
    </div>

    {#if data.totalPages > 1}
      <div class="mt-8">
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          {hrefForPage}
        />
      </div>
    {/if}
  {:else}
    <div class="rounded-2xl bg-white/70 backdrop-blur-sm p-12 text-center ring-1 ring-black/5 shadow-sm">
      <p class="text-lg text-gray-700 mb-6">새로운 알림이 없습니다.</p>
      <a href="/posts" class="inline-flex items-center gap-2 px-6 py-3 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium shadow-sm hover:shadow-md">
        게시글 보러가기
      </a>
    </div>
  {/if}
</div>
