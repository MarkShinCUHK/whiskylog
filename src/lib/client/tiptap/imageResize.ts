/**
 * TipTap 이미지 리사이즈 유틸리티
 * 
 * 이미지에 리사이즈 핸들을 추가하고 드래그로 크기를 조정할 수 있도록 하는 함수들
 */

export interface ResizeHandle {
  element: HTMLElement;
  position: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';
}

export interface ResizeState {
  isResizing: boolean;
  handle: ResizeHandle | null;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  aspectRatio: number;
}

/**
 * 리사이즈 핸들 생성
 */
export function createResizeHandles(): ResizeHandle[] {
  const positions: Array<'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'> = [
    'n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'
  ];

  return positions.map((position) => {
    const handle = document.createElement('div');
    handle.className = `absolute bg-whiskey-600 border-2 border-white rounded-sm opacity-0 transition-opacity duration-150 pointer-events-auto z-10 hover:bg-whiskey-700 hover:scale-110`;
    
    // 핸들 크기 및 위치 설정
    const size = 8;
    handle.style.width = `${size}px`;
    handle.style.height = `${size}px`;
    
    // 커서 스타일 설정
    const cursorMap: Record<string, string> = {
      n: 'n-resize',
      s: 's-resize',
      e: 'e-resize',
      w: 'w-resize',
      nw: 'nw-resize',
      ne: 'ne-resize',
      sw: 'sw-resize',
      se: 'se-resize'
    };
    handle.style.cursor = cursorMap[position] || 'default';
    
    // 위치 설정
    updateHandlePosition(handle, position);
    
    return { element: handle, position };
  });
}

/**
 * 핸들 위치 업데이트
 */
function updateHandlePosition(handle: HTMLElement, position: string) {
  const offset = -4; // 핸들 크기의 절반
  
  switch (position) {
    case 'n':
      handle.style.top = `${offset}px`;
      handle.style.left = '50%';
      handle.style.transform = 'translateX(-50%)';
      break;
    case 's':
      handle.style.bottom = `${offset}px`;
      handle.style.left = '50%';
      handle.style.transform = 'translateX(-50%)';
      break;
    case 'e':
      handle.style.right = `${offset}px`;
      handle.style.top = '50%';
      handle.style.transform = 'translateY(-50%)';
      break;
    case 'w':
      handle.style.left = `${offset}px`;
      handle.style.top = '50%';
      handle.style.transform = 'translateY(-50%)';
      break;
    case 'nw':
      handle.style.top = `${offset}px`;
      handle.style.left = `${offset}px`;
      break;
    case 'ne':
      handle.style.top = `${offset}px`;
      handle.style.right = `${offset}px`;
      break;
    case 'sw':
      handle.style.bottom = `${offset}px`;
      handle.style.left = `${offset}px`;
      break;
    case 'se':
      handle.style.bottom = `${offset}px`;
      handle.style.right = `${offset}px`;
      break;
  }
}

/**
 * 리사이즈 핸들 표시/숨김
 */
export function showResizeHandles(container: HTMLElement, handles: ResizeHandle[]) {
  handles.forEach((handle) => {
    handle.element.style.opacity = '1';
    container.appendChild(handle.element);
  });
}

export function hideResizeHandles(handles: ResizeHandle[]) {
  handles.forEach((handle) => {
    handle.element.style.opacity = '0';
    if (handle.element.parentElement) {
      handle.element.parentElement.removeChild(handle.element);
    }
  });
}

/**
 * 이미지 크기 계산 (드래그 중)
 */
export function calculateNewSize(
  position: string,
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  startWidth: number,
  startHeight: number,
  aspectRatio: number,
  maintainAspectRatio: boolean
): { width: number; height: number } {
  let width = startWidth;
  let height = startHeight;
  
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;
  
  switch (position) {
    case 'n':
      height = Math.max(20, startHeight - deltaY);
      if (maintainAspectRatio) {
        width = height * aspectRatio;
      }
      break;
    case 's':
      height = Math.max(20, startHeight + deltaY);
      if (maintainAspectRatio) {
        width = height * aspectRatio;
      }
      break;
    case 'e':
      width = Math.max(20, startWidth + deltaX);
      if (maintainAspectRatio) {
        height = width / aspectRatio;
      }
      break;
    case 'w':
      width = Math.max(20, startWidth - deltaX);
      if (maintainAspectRatio) {
        height = width / aspectRatio;
      }
      break;
    case 'nw':
      width = Math.max(20, startWidth - deltaX);
      height = Math.max(20, startHeight - deltaY);
      if (maintainAspectRatio) {
        const newWidth = startHeight - deltaY > 0 ? (startHeight - deltaY) * aspectRatio : startWidth;
        const newHeight = startWidth - deltaX > 0 ? (startWidth - deltaX) / aspectRatio : startHeight;
        width = Math.min(width, newWidth);
        height = Math.min(height, newHeight);
      }
      break;
    case 'ne':
      width = Math.max(20, startWidth + deltaX);
      height = Math.max(20, startHeight - deltaY);
      if (maintainAspectRatio) {
        const newWidth = startHeight - deltaY > 0 ? (startHeight - deltaY) * aspectRatio : startWidth;
        const newHeight = startWidth + deltaX > 0 ? (startWidth + deltaX) / aspectRatio : startHeight;
        width = Math.min(width, newWidth);
        height = Math.min(height, newHeight);
      }
      break;
    case 'sw':
      width = Math.max(20, startWidth - deltaX);
      height = Math.max(20, startHeight + deltaY);
      if (maintainAspectRatio) {
        const newWidth = startHeight + deltaY > 0 ? (startHeight + deltaY) * aspectRatio : startWidth;
        const newHeight = startWidth - deltaX > 0 ? (startWidth - deltaX) / aspectRatio : startHeight;
        width = Math.min(width, newWidth);
        height = Math.min(height, newHeight);
      }
      break;
    case 'se':
      width = Math.max(20, startWidth + deltaX);
      height = Math.max(20, startHeight + deltaY);
      if (maintainAspectRatio) {
        const newWidth = startHeight + deltaY > 0 ? (startHeight + deltaY) * aspectRatio : startWidth;
        const newHeight = startWidth + deltaX > 0 ? (startWidth + deltaX) / aspectRatio : startHeight;
        width = Math.min(width, newWidth);
        height = Math.min(height, newHeight);
      }
      break;
  }
  
  return { width: Math.round(width), height: Math.round(height) };
}
