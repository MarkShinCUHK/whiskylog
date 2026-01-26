<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Underline from '@tiptap/extension-underline';
  import Link from '@tiptap/extension-link';
  import TextAlign from '@tiptap/extension-text-align';
  import Placeholder from '@tiptap/extension-placeholder';
  import { Table } from '@tiptap/extension-table';
  import { TableRow } from '@tiptap/extension-table-row';
  import { TableHeader } from '@tiptap/extension-table-header';
  import { TableCell } from '@tiptap/extension-table-cell';
  import { ResizableImage } from '$lib/client/tiptap/resizableImage';

  let {
    value = '',
    placeholder = '내용을 입력하세요…',
    onChange,
    onImageAdd
  }: {
    value?: string;
    placeholder?: string;
    onChange?: (html: string, text: string) => void;
    onImageAdd?: (blobUrl: string, file: File) => void;
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

  // 이미지 파일 형식 검증 (JPG, PNG, WebP, GIF)
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_IMAGE_WIDTH = 1600;
  const MAX_IMAGE_HEIGHT = 1600;
  const IMAGE_QUALITY = 0.82;
  
  function isValidImageType(file: File): boolean {
    return ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase());
  }

  function getMimeType(fileType: string): string {
    const lowerType = fileType.toLowerCase();
    if (lowerType === 'image/png') return 'image/png';
    if (lowerType === 'image/webp') return 'image/webp';
    return 'image/jpeg';
  }

  async function compressImage(file: File): Promise<File> {
    if (file.type.toLowerCase() === 'image/gif') {
      return file;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();

      const scale = Math.min(
        1,
        MAX_IMAGE_WIDTH / image.width,
        MAX_IMAGE_HEIGHT / image.height
      );

      const targetWidth = Math.max(1, Math.round(image.width * scale));
      const targetHeight = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

      const mimeType = getMimeType(file.type);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, mimeType, IMAGE_QUALITY);
      });
      if (!blob) return file;

      const extension = mimeType.split('/')[1] || 'jpg';
      const fileName = file.name ? file.name.replace(/\.[^/.]+$/, `.${extension}`) : `image.${extension}`;
      return new File([blob], fileName, { type: mimeType });
    } catch (error) {
      return file;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  let fileInputRef: HTMLInputElement | null = null;

  function handleImageSelect() {
    if (!editorState.editor) return;
    fileInputRef?.click();
  }

  async function handleFileChange(event: Event) {
    if (!editorState.editor) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    // 파일 형식 검증
    if (!isValidImageType(file)) {
      alert('지원하는 이미지 형식은 JPG, PNG, WebP, GIF입니다.');
      input.value = '';
      return;
    }

    // 이미지 압축/리사이즈 후 Blob URL 생성
    const optimizedFile = await compressImage(file);
    const blobUrl = URL.createObjectURL(optimizedFile);
    // 이미지 삽입 시 원본 크기를 width/height로 설정
    const img = new Image();
    img.onload = () => {
      if (editorState.editor) {
        editorState.editor.chain().focus().setImage({ 
          src: blobUrl,
          width: img.naturalWidth,
          height: img.naturalHeight
        }).run();
      }
    };
    img.onerror = () => {
      // 이미지 로드 실패 시에도 기본 삽입
      if (editorState.editor) {
        editorState.editor.chain().focus().setImage({ src: blobUrl }).run();
      }
    };
    img.src = blobUrl;

    // 부모 컴포넌트에 이미지 파일 정보 전달 (Blob URL과 File 객체 매핑)
    onImageAdd?.(blobUrl, optimizedFile);

    // input 초기화 (같은 파일을 다시 선택할 수 있도록)
    input.value = '';
  }

  // 외부에서 value가 바뀌면 에디터에 반영 (무한 루프 방지용)
  let lastExternalValue = $state('');
  let isInitialized = $state(false);
  $effect(() => {
    if (!editorState.editor) return;
    const next = value ?? '';
    const current = editorState.editor.getHTML();

    // 초기화 직후에는 lastExternalValue 체크를 무시하고 무조건 업데이트
    if (!isInitialized) {
      // 초기화 시에는 무조건 업데이트 (이미지 포함)
      // next가 비어있지 않거나, current와 다를 때 업데이트
      if (next || next !== current) {
        lastExternalValue = next;
        editorState.editor.commands.setContent(next, { emitUpdate: false });
        isInitialized = true;
      }
    } else if (next !== current && next !== lastExternalValue) {
      lastExternalValue = next;
      editorState.editor.commands.setContent(next, { emitUpdate: false });
    }
  });

  onMount(() => {
    if (!editorRoot) return;

    // 초기 content는 value가 있으면 사용, 없으면 빈 문자열
    // 나중에 $effect에서 value가 변경되면 업데이트됨
    editorState.editor = new Editor({
      element: editorRoot,
      content: value ?? '',
      extensions: [
        StarterKit.configure({ 
          link: false, 
          underline: false
          // codeBlock은 기본적으로 활성화됨
        } as any),
        Underline,
        Link.configure({
          openOnClick: true,
          autolink: true,
          linkOnPaste: true
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph']
        }),
        Placeholder.configure({
          placeholder
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: 'border-collapse border border-gray-300 my-4'
          }
        }),
        TableRow.configure({
          HTMLAttributes: {
            class: 'border border-gray-300'
          }
        }),
        TableHeader.configure({
          HTMLAttributes: {
            class: 'border border-gray-300 bg-gray-50 px-4 py-2 font-semibold'
          }
        }),
        TableCell.configure({
          HTMLAttributes: {
            class: 'border border-gray-300 px-4 py-2'
          }
        }),
        ResizableImage.configure({
          inline: true,
          allowBase64: false,
          HTMLAttributes: {
            class: 'max-w-full h-auto rounded-lg my-2'
          }
        })
      ],
      editorProps: {
        attributes: {
          class:
            'min-h-[260px] w-full rounded-lg px-4 py-3 sm:py-2.5 outline-none focus:outline-none prose prose-sm sm:prose-base max-w-none ' +
            'prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-pre:bg-gray-900/90 prose-pre:text-gray-100 ' +
            'prose-a:text-whiskey-700 hover:prose-a:text-whiskey-800 prose-table:w-full prose-table:border-collapse ' +
            'prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:px-4 prose-th:py-2 ' +
            'prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-2 ' +
            'prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg prose-img:my-2'
        }
      },
      onTransaction: ({ editor }) => {
        // 공식 문서 패턴: editorState 재할당으로 리렌더링 강제
        editorState = { editor };
        // 외부 value sync 루프 방지를 위해 최신 HTML을 기록
        const html = editor.getHTML();
        lastExternalValue = html;
        isInitialized = true;
        onChange?.(html, editor.getText());
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
          class={toggleBtnClass(editorState.editor.isActive('codeBlock'))}
          aria-pressed={editorState.editor.isActive('codeBlock')}
          title="코드 블록"
          onclick={() => editorState.editor?.chain().focus().toggleCodeBlock().run()}
          disabled={!editorState.editor}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
        <button
          type="button"
          class={actionBtnClass()}
          title="이미지 삽입"
          onclick={() => handleImageSelect()}
          disabled={!editorState.editor}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      <div class="h-6 w-px bg-black/10 mx-1"></div>

      <!-- Table -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class={actionBtnClass()}
          title="표 추가"
          onclick={() => editorState.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          disabled={!editorState.editor}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        {#if editorState.editor?.isActive('table')}
          <button
            type="button"
            class={actionBtnClass()}
            title="행 추가 (위)"
            onclick={() => editorState.editor?.chain().focus().addRowBefore().run()}
            disabled={!editorState.editor || !editorState.editor.can().addRowBefore()}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            class={actionBtnClass()}
            title="행 추가 (아래)"
            onclick={() => editorState.editor?.chain().focus().addRowAfter().run()}
            disabled={!editorState.editor || !editorState.editor.can().addRowAfter()}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            type="button"
            class={actionBtnClass()}
            title="행 삭제"
            onclick={() => editorState.editor?.chain().focus().deleteRow().run()}
            disabled={!editorState.editor || !editorState.editor.can().deleteRow()}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            type="button"
            class={actionBtnClass()}
            title="열 추가 (왼쪽)"
            onclick={() => editorState.editor?.chain().focus().addColumnBefore().run()}
            disabled={!editorState.editor || !editorState.editor.can().addColumnBefore()}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            class={actionBtnClass()}
            title="열 추가 (오른쪽)"
            onclick={() => editorState.editor?.chain().focus().addColumnAfter().run()}
            disabled={!editorState.editor || !editorState.editor.can().addColumnAfter()}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            class={actionBtnClass()}
            title="열 삭제"
            onclick={() => editorState.editor?.chain().focus().deleteColumn().run()}
            disabled={!editorState.editor || !editorState.editor.can().deleteColumn()}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            type="button"
            class={actionBtnClass()}
            title="표 삭제"
            onclick={() => editorState.editor?.chain().focus().deleteTable().run()}
            disabled={!editorState.editor || !editorState.editor.can().deleteTable()}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        {/if}
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
    <!-- 숨겨진 파일 입력 -->
    <input
      type="file"
      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
      bind:this={fileInputRef}
      onchange={handleFileChange}
      class="hidden"
    />
    <p class="mt-2 text-xs text-gray-500">
      팁: 링크는 URL을 입력하면 되고, 표는 ‘표 추가’로 삽입 후 셀을 클릭해 편집할 수 있어요.
    </p>
  </div>
</div>
