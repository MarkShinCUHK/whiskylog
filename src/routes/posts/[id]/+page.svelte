<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { tick } from 'svelte';
  import LikeButton from '$lib/components/LikeButton.svelte';
  import BookmarkButton from '$lib/components/BookmarkButton.svelte';
  import CommentList from '$lib/components/CommentList.svelte';
  import CommentForm from '$lib/components/CommentForm.svelte';
  import { showToast } from '$lib/stores/toast';
  import type { Comment } from '$lib/server/supabase/types';
  
  let { data } = $props();

  // 댓글 기능 활성화 여부
  const ENABLE_COMMENTS = false;

  let comments = $state<Comment[]>([]);
  $effect(() => {
    if (data.comments) comments = data.comments;
  });

  // HTML의 width/height 속성을 CSS로 강제 적용
  $effect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === 'undefined' || !data.postHtml) return;
      await tick();
      requestAnimationFrame(() => {
        if (cancelled) return;
        const postContent = document.querySelector('.post-content');
        if (postContent) {
          // 모든 이미지 처리 (editor-image 클래스 유무와 관계없이)
          const allImages = postContent.querySelectorAll('img');
          
          allImages.forEach((img) => {
            // lazy loading 적용 (이미 적용되어 있지 않은 경우만)
            if (!img.hasAttribute('loading')) {
              img.setAttribute('loading', 'lazy');
            }
            
            const htmlWidth = img.getAttribute('width');
            const htmlHeight = img.getAttribute('height');
            
            // 컨테이너 너비 확인
            const containerWidth = postContent.clientWidth;
            
            if (htmlWidth && htmlHeight) {
              // resize된 이미지: 지정된 픽셀 크기로 표시하되, 컨테이너보다 크면 비율 유지하면서 축소
              const widthValue = parseInt(htmlWidth, 10);
              const heightValue = parseInt(htmlHeight, 10);
              
              if (widthValue > containerWidth) {
                // 컨테이너보다 크면 비율 유지하면서 축소
                const ratio = containerWidth / widthValue;
                const newHeight = Math.round(heightValue * ratio);
                img.style.setProperty('width', '100%', 'important');
                img.style.setProperty('max-width', '100%', 'important');
                img.style.setProperty('height', `${newHeight}px`, 'important');
                img.style.setProperty('object-fit', 'contain', 'important');
              } else {
                // 컨테이너보다 작거나 같으면 지정된 픽셀 크기로 표시
                img.style.setProperty('width', `${htmlWidth}px`, 'important');
                img.style.setProperty('max-width', '100%', 'important');
                img.style.setProperty('height', `${htmlHeight}px`, 'important');
                img.style.setProperty('object-fit', 'fill', 'important');
              }
            } else {
              // resize하지 않은 이미지: 100% (컨테이너 너비에 맞춤)
              img.style.setProperty('width', '100%', 'important');
              img.style.setProperty('max-width', '100%', 'important');
              img.style.setProperty('height', 'auto', 'important');
            }
          });
        }
      });
    })();

    return () => {
      cancelled = true;
    };
  });

  function confirmDelete(cancel: () => void) {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      cancel();
    }
  }
</script>

<svelte:head>
  <title>{data.post?.title || '게시글'} - whiskylog</title>
</svelte:head>

{#if data.post}
  <article class="max-w-4xl xl:max-w-5xl mx-auto px-4 xl:px-8 py-12">
    <!-- 헤더 -->
    <header class="mb-10">
      <h1 class="text-3xl sm:text-4xl font-bold text-whiskey-900 mb-6 leading-tight tracking-tight">{data.post.title}</h1>
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-gray-600">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-4">
            <span class="font-semibold text-gray-900">{data.post.author}</span>
            <span class="text-gray-500">{data.post.createdAt}</span>
          </div>
          {#if data.whisky}
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center rounded-full bg-whiskey-100 px-3 py-1 text-xs font-semibold text-whiskey-800 ring-1 ring-whiskey-200">
                {data.whisky.brand ? `${data.whisky.brand} · ${data.whisky.name}` : data.whisky.name}
              </span>
              {#if data.whisky.region}
                <span class="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-black/10">
                  {data.whisky.region}
                </span>
              {/if}
              {#if data.whisky.age}
                <span class="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-black/10">
                  {data.whisky.age}년
                </span>
              {/if}
            </div>
          {/if}
          {#if data.post.tags && data.post.tags.length > 0}
            <div class="flex flex-wrap gap-2">
              {#each data.post.tags as tag}
                <a
                  href={`/posts?tag=${encodeURIComponent(tag)}`}
                  class="inline-flex items-center rounded-full bg-whiskey-50 px-3 py-1 text-xs font-semibold text-whiskey-700 ring-1 ring-whiskey-100"
                >
                  #{tag}
                </a>
              {/each}
            </div>
          {/if}
        </div>
        <div class="flex items-center gap-4">
          {#if data.post.views !== undefined}
            <span class="text-gray-500">조회 {data.post.views}</span>
          {/if}
          <LikeButton
            postId={data.post.id}
            likeCount={data.likeCount || 0}
            isLiked={data.isLiked || false}
          />
          <BookmarkButton
            postId={data.post.id}
            isBookmarked={data.isBookmarked || false}
          />
        </div>
      </div>
    </header>

    <!-- 본문 -->
    <div class="mb-12">
      <div class="rounded-2xl bg-white/80 backdrop-blur-sm p-8 sm:p-10 ring-1 ring-black/5 shadow-sm">
        <div class="post-content prose prose-lg max-w-none
          prose-headings:text-whiskey-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900
          prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-1
          prose-h1:text-[2.25rem] prose-h1:leading-tight prose-h1:mt-8 prose-h1:mb-4
          prose-h2:text-[1.875rem] prose-h2:leading-snug prose-h2:mt-6 prose-h2:mb-3
          prose-h3:text-[1.5rem] prose-h3:leading-snug prose-h3:mt-4 prose-h3:mb-2
          prose-h4:text-[1.25rem] prose-h4:mt-3 prose-h4:mb-2
          prose-h5:text-[1.125rem] prose-h5:mt-2 prose-h5:mb-2
          prose-h6:text-[1rem] prose-h6:mt-2 prose-h6:mb-2
          prose-img:inline-block prose-img:my-2 prose-img:max-w-full">
          {@html data.postHtml}
        </div>
      </div>
    </div>

    <!-- 댓글 섹션 (ENABLE_COMMENTS = true로 설정하면 활성화) -->
    {#if ENABLE_COMMENTS}
      <section class="mb-12">
        <h2 class="text-2xl sm:text-3xl font-bold text-whiskey-900 mb-6 tracking-tight">댓글</h2>
        <div class="mb-6">
          {#if $page.data?.user}
            <CommentForm
              oncreated={(comment) => {
                if (comment) comments = [...comments, comment];
              }}
            />
          {:else}
            <p class="text-sm text-gray-600">댓글 작성은 로그인 후 가능합니다.</p>
          {/if}
        </div>
        <div>
          <CommentList
            comments={comments}
            ondeleted={(id) => {
              if (id) comments = comments.filter((c) => c.id !== id);
            }}
            onupdated={(updated) => {
              if (updated) {
                comments = comments.map((comment) => comment.id === updated.id ? updated : comment);
              }
            }}
          />
        </div>
      </section>
    {/if}

    <!-- 하단 버튼 -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center pt-6 border-t border-gray-200">
      <a 
        href="/posts" 
        class="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium ring-1 ring-black/10 shadow-sm hover:shadow"
      >
        목록으로
      </a>
      {#if data.canEditDelete}
        <a
          href="/posts/{data.post.id}/edit"
          class="inline-flex items-center justify-center px-6 py-3 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          수정하기
        </a>
        <form
          method="POST"
          action="?/delete"
          use:enhance={({ cancel }) => {
            confirmDelete(cancel);
            return async ({ result, update }) => {
              try {
                // 기본 업데이트 먼저 수행 (redirect 포함)
                await update();
                
                // result가 있을 때만 토스트 표시
                if (result) {
                  if (result.type === 'success' || result.type === 'redirect') {
                    showToast('게시글이 삭제되었습니다.', 'success');
                  } else if (result.type === 'failure' && result.data?.error) {
                    const errorMessage = typeof result.data.error === 'string' 
                      ? result.data.error 
                      : '게시글 삭제에 실패했습니다.';
                    showToast(errorMessage, 'error');
                  }
                }
              } catch (error) {
                console.error('폼 제출 오류:', error);
                showToast('게시글 삭제 중 오류가 발생했습니다.', 'error');
              }
            };
          }}
          class="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          {#if data.needsEditPassword}
            <input
              type="password"
              name="editPassword"
              placeholder="비밀번호 (삭제용)"
              class="w-full sm:w-56 px-4 py-3 sm:py-2.5 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors"
              required
            />
          {/if}
          <button
            type="submit"
            class="inline-flex items-center justify-center px-6 py-3 min-h-[44px] bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            삭제하기
          </button>
        </form>
      {/if}
    </div>
  </article>
{:else}
  <div class="max-w-4xl xl:max-w-5xl mx-auto px-4 xl:px-8 py-20 text-center">
    <div class="rounded-2xl bg-white/60 backdrop-blur-sm p-12 ring-1 ring-black/5 shadow-sm">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">게시글을 찾을 수 없습니다</h1>
      <p class="text-gray-600 mb-8">요청하신 게시글이 존재하지 않습니다.</p>
      <a 
        href="/posts" 
        class="inline-flex items-center justify-center px-6 py-3 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium shadow-sm hover:shadow-md"
      >
        목록으로 돌아가기
      </a>
    </div>
  </div>
{/if}
