/**
 * TipTap Resizable Image Extension
 * 
 * Image extension을 확장하여 width/height 속성을 추가하고
 * 리사이즈 핸들을 표시할 수 있도록 함
 */

import Image from '@tiptap/extension-image';
import type { NodeViewRenderer } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { createResizeHandles, showResizeHandles, hideResizeHandles, calculateNewSize, type ResizeHandle } from './imageResize.js';

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute('width');
          return width ? parseInt(width, 10) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width
          };
        }
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const height = element.getAttribute('height');
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.height) {
            return {};
          }
          return {
            height: attributes.height
          };
        }
      }
    };
  },

  addNodeView(): NodeViewRenderer {
    return ({ node, view, getPos }) => {
      const container = document.createElement('div');
      container.className = 'relative inline-block max-w-full my-2';
      container.style.position = 'relative';
      container.style.display = 'inline-block';

      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || '';
      img.className = 'rounded-lg max-w-full h-auto cursor-pointer';
      img.style.cursor = 'pointer';
      
      // width/height 속성 적용
      if (node.attrs.width) {
        img.style.width = `${node.attrs.width}px`;
      }
      if (node.attrs.height) {
        img.style.height = `${node.attrs.height}px`;
      }

      container.appendChild(img);

      // 리사이즈 핸들 생성
      const handles = createResizeHandles();
      let isSelected = false;
      let resizeState: {
        isResizing: boolean;
        handle: ResizeHandle | null;
        startX: number;
        startY: number;
        startWidth: number;
        startHeight: number;
        aspectRatio: number;
      } | null = null;

      // 이미지 클릭 시 리사이즈 핸들 표시
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isSelected) {
          isSelected = true;
          container.style.outline = '2px solid rgb(139 92 46)'; // whiskey-600
          container.style.outlineOffset = '2px';
          showResizeHandles(container, handles);
        } else {
          isSelected = false;
          container.style.outline = '';
          hideResizeHandles(handles);
        }
      });

      // 에디터 외부 클릭 시 핸들 숨김
      const handleClickOutside = (e: MouseEvent) => {
        if (!container.contains(e.target as Node)) {
          isSelected = false;
          container.style.outline = '';
          hideResizeHandles(handles);
        }
      };
      document.addEventListener('click', handleClickOutside);

      // 리사이즈 핸들 드래그 이벤트
      handles.forEach((handle) => {
        handle.element.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const rect = img.getBoundingClientRect();
          const currentWidth = node.attrs.width || rect.width;
          const currentHeight = node.attrs.height || rect.height;
          const aspectRatio = currentWidth / currentHeight;

          resizeState = {
            isResizing: true,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: currentWidth,
            startHeight: currentHeight,
            aspectRatio
          };

          let lastWidth = currentWidth;
          let lastHeight = currentHeight;

          // 모서리 핸들은 항상 비율 유지, 변 핸들은 shift 키로 비율 유지
          const isCornerHandle = ['nw', 'ne', 'sw', 'se'].includes(handle.position);
          const alwaysMaintainAspectRatio = isCornerHandle;

          const handleMouseMove = (e: MouseEvent) => {
            if (!resizeState) return;

            const maintainAspectRatio = alwaysMaintainAspectRatio || e.shiftKey;
            const { width, height } = calculateNewSize(
              handle.position,
              resizeState.startX,
              resizeState.startY,
              e.clientX,
              e.clientY,
              resizeState.startWidth,
              resizeState.startHeight,
              resizeState.aspectRatio,
              maintainAspectRatio
            );

            // 이미지 크기 업데이트 (실시간 미리보기)
            img.style.width = `${width}px`;
            img.style.height = `${height}px`;
            lastWidth = width;
            lastHeight = height;
          };

          const handleMouseUp = () => {
            if (!resizeState) return;

            // 마지막 계산된 크기를 사용
            const width = lastWidth;
            const height = lastHeight;

            // TipTap 노드 업데이트
            const pos = getPos();
            if (typeof pos === 'number') {
              view.dispatch(
                view.state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  width,
                  height
                })
              );
            }

            resizeState = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        });
      });

      // 정리 함수
      const destroy = () => {
        document.removeEventListener('click', handleClickOutside);
        hideResizeHandles(handles);
      };

      return {
        dom: container,
        contentDOM: null,
        destroy
      };
    };
  }
});
