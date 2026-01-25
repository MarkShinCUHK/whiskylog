<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Underline from '@tiptap/extension-underline';
  import Link from '@tiptap/extension-link';
  import TextAlign from '@tiptap/extension-text-align';
  import Placeholder from '@tiptap/extension-placeholder';

  let {
    value = '',
    placeholder = '내용을 입력하세요…',
    onChange
  }: {
    value?: string;
    placeholder?: string;
    onChange?: (html: string, text: string) => void;
  } = $props();

  // 공식 문서 패턴: editorState 객체로 상태 관리
  let editorState = $state<{ editor: Editor | null }>({ editor: null });
  let editorRoot: HTMLDivElement | null = null;

  function toggleBtnClass(active: boolean) {
    return (
      'min-h-[36px] min-w-[36px] rounded-lg p-2 flex items-center justify-center transition-all duration-150 ' +
      (active 
        ? 'bg-whiskey-600 text-white ring-2 ring-whiskey-500 shadow-sm' 
        : 'bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-black/10 hover:ring-black/20')
    );
  }

  function actionBtnClass() {
    return 'min-h-[36px] min-w-[36px] rounded-lg p-2 flex items-center justify-center ring-1 ring-black/10 transition-colors bg-white text-gray-700 hover:bg-gray-50';
  }

  function setLink() {
    if (!editorState.editor) return;
    const previousUrl = editorState.editor.getAttributes('link')?.href as string | undefined;
    const url = window.prompt('링크 URL', previousUrl ?? '');

    if (url === null) return;
    if (url.trim().length === 0) {
      editorState.editor.chain().focus().unsetLink().run();
      return;
    }

    editorState.editor.chain().focus().setLink({ href: url.trim() }).run();
  }

  // 외부에서 value가 바뀌면 에디터에 반영 (무한 루프 방지용)
  let lastExternalValue = $state('');
  $effect(() => {
    if (!editorState.editor) return;
    const next = value ?? '';
    const current = editorState.editor.getHTML();

    if (next !== current && next !== lastExternalValue) {
      lastExternalValue = next;
      editorState.editor.commands.setContent(next, { emitUpdate: false });
    }
  });

  onMount(() => {
    if (!editorRoot) return;

    editorState.editor = new Editor({
      element: editorRoot,
      content: value || '',
      extensions: [
        StarterKit.configure({ 
          link: false, 
          underline: false,
          codeBlock: false // 공지사항에선 제거 권장
        } as any),
        Underline,
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph']
        }),
        Placeholder.configure({
          placeholder
        })
      ],
      editorProps: {
        attributes: {
          class:
            'min-h-[260px] w-full rounded-lg px-4 py-3 sm:py-2.5 outline-none focus:outline-none prose prose-sm sm:prose-base max-w-none ' +
            'prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-pre:bg-gray-900/90 prose-pre:text-gray-100 ' +
            'prose-a:text-whiskey-700 hover:prose-a:text-whiskey-800'
        }
      },
      onTransaction: ({ editor }) => {
        // 공식 문서 패턴: editorState 재할당으로 리렌더링 강제
        editorState = { editor };
      },
      onUpdate({ editor }) {
        // 외부 value sync 루프 방지를 위해 최신 HTML을 기록
        lastExternalValue = editor.getHTML();
        onChange?.(editor.getHTML(), editor.getText());
      }
    });

    // 초기 text sync (폼 검증용)
    if (editorState.editor) {
      onChange?.(editorState.editor.getHTML(), editorState.editor.getText());
    }

    return () => {
      if (editorState.editor) {
        editorState.editor.destroy();
        editorState = { editor: null };
      }
    };
  });

  onDestroy(() => {
    if (editorState.editor) {
      editorState.editor.destroy();
      editorState = { editor: null };
    }
  });
</script>

<div class="rounded-2xl bg-white/80 backdrop-blur-sm ring-1 ring-black/5 shadow-sm">
  {#if editorState.editor}
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-1 border-b border-black/5 px-3 py-2">
      <!-- Undo/Redo -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class={actionBtnClass()}
          title="실행 취소"
          onclick={() => editorState.editor?.chain().focus().undo().run()}
          disabled={!editorState.editor || !editorState.editor.can().undo()}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          type="button"
          class={actionBtnClass()}
          title="다시 실행"
          onclick={() => editorState.editor?.chain().focus().redo().run()}
          disabled={!editorState.editor || !editorState.editor.can().redo()}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      <div class="h-6 w-px bg-black/10 mx-1"></div>

      <!-- Text Formatting -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive('bold'))}
          aria-pressed={editorState.editor.isActive('bold')}
          title="굵게"
          onclick={() => editorState.editor?.chain().focus().toggleBold().run()}
          disabled={!editorState.editor}
        >
          <span class="text-sm font-bold">B</span>
        </button>
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive('italic'))}
          aria-pressed={editorState.editor.isActive('italic')}
          title="기울임"
          onclick={() => editorState.editor?.chain().focus().toggleItalic().run()}
          disabled={!editorState.editor}
        >
          <span class="text-sm italic">I</span>
        </button>
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive('underline'))}
          aria-pressed={editorState.editor.isActive('underline')}
          title="밑줄"
          onclick={() => editorState.editor?.chain().focus().toggleUnderline().run()}
          disabled={!editorState.editor}
        >
          <span class="text-sm underline">U</span>
        </button>
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive('strike'))}
          aria-pressed={editorState.editor.isActive('strike')}
          title="취소선"
          onclick={() => editorState.editor?.chain().focus().toggleStrike().run()}
          disabled={!editorState.editor}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14" />
          </svg>
        </button>
      </div>

      <div class="h-6 w-px bg-black/10 mx-1"></div>

      <!-- Headings -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive('heading', { level: 1 }))}
          aria-pressed={editorState.editor.isActive('heading', { level: 1 })}
          title="제목 1"
          onclick={() => editorState.editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={!editorState.editor}
        >
          <span class="text-xs font-bold">H1</span>
        </button>
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive('heading', { level: 2 }))}
          aria-pressed={editorState.editor.isActive('heading', { level: 2 })}
          title="제목 2"
          onclick={() => editorState.editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={!editorState.editor}
        >
          <span class="text-xs font-bold">H2</span>
        </button>
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive('heading', { level: 3 }))}
          aria-pressed={editorState.editor.isActive('heading', { level: 3 })}
          title="제목 3"
          onclick={() => editorState.editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={!editorState.editor}
        >
          <span class="text-xs font-bold">H3</span>
        </button>
      </div>

      <div class="h-6 w-px bg-black/10 mx-1"></div>

      <!-- Lists & Blockquote -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive('bulletList'))}
          aria-pressed={editorState.editor.isActive('bulletList')}
          title="목록"
          onclick={() => editorState.editor?.chain().focus().toggleBulletList().run()}
          disabled={!editorState.editor}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive('orderedList'))}
          aria-pressed={editorState.editor.isActive('orderedList')}
          title="번호 목록"
          onclick={() => editorState.editor?.chain().focus().toggleOrderedList().run()}
          disabled={!editorState.editor}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        </button>
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive('blockquote'))}
          aria-pressed={editorState.editor.isActive('blockquote')}
          title="인용구"
          onclick={() => editorState.editor?.chain().focus().toggleBlockquote().run()}
          disabled={!editorState.editor}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      </div>

      <div class="h-6 w-px bg-black/10 mx-1"></div>

      <!-- Code & Link -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive('code'))}
          aria-pressed={editorState.editor.isActive('code')}
          title="인라인 코드"
          onclick={() => editorState.editor?.chain().focus().toggleCode().run()}
          disabled={!editorState.editor}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive('link'))}
          aria-pressed={editorState.editor.isActive('link')}
          title="링크"
          onclick={() => setLink()}
          disabled={!editorState.editor}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
      </div>

      <div class="h-6 w-px bg-black/10 mx-1"></div>

      <!-- Text Align -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive({ textAlign: 'left' }))}
          aria-pressed={editorState.editor.isActive({ textAlign: 'left' })}
          title="왼쪽 정렬"
          onclick={() => editorState.editor?.chain().focus().setTextAlign('left').run()}
          disabled={!editorState.editor}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h8" />
          </svg>
        </button>
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive({ textAlign: 'center' }))}
          aria-pressed={editorState.editor.isActive({ textAlign: 'center' })}
          title="가운데 정렬"
          onclick={() => editorState.editor?.chain().focus().setTextAlign('center').run()}
          disabled={!editorState.editor}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M8 12h8M4 18h16" />
          </svg>
        </button>
        <button
          type="button"
          class={toggleBtnClass(editorState.editor.isActive({ textAlign: 'right' }))}
          aria-pressed={editorState.editor.isActive({ textAlign: 'right' })}
          title="오른쪽 정렬"
          onclick={() => editorState.editor?.chain().focus().setTextAlign('right').run()}
          disabled={!editorState.editor}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M8 12h12M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  {/if}

  <!-- Editor -->
  <div class="px-4 py-4">
    <div
      class="rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-whiskey-500 focus-within:border-whiskey-500 transition-colors bg-white"
    >
      <div bind:this={editorRoot}></div>
    </div>
    <p class="mt-2 text-xs text-gray-500">
      팁: 링크는 URL을 입력하면 되고, 표는 ‘표 추가’로 삽입 후 셀을 클릭해 편집할 수 있어요.
    </p>
  </div>
</div>
