import { uploadImage } from './storage.js';
import type { SessionTokens } from '../auth.js';

/**
 * HTML에서 Blob URL을 찾아서 Supabase Storage URL로 변환
 * 
 * @param html HTML 문자열 (Blob URL 포함)
 * @param images 이미지 파일 배열
 * @param blobUrls Blob URL 배열 (images와 순서 일치)
 * @param userId 사용자 ID
 * @param postId 게시글 ID
 * @param sessionTokens 세션 토큰
 * @param startIndex 시작 인덱스 (기본값: 1, 수정 페이지에서는 기존 이미지 개수 + 1)
 * @returns 변환된 HTML (Blob URL이 Storage URL로 치환됨)
 */
export async function convertBlobUrlsToStorageUrls(
  html: string,
  images: File[],
  blobUrls: string[],
  userId: string,
  postId: string,
  sessionTokens?: SessionTokens,
  startIndex: number = 1
): Promise<string> {
  const { html: converted } = await convertBlobUrlsToStorageUrlsWithMap(
    html,
    images,
    blobUrls,
    userId,
    postId,
    sessionTokens,
    startIndex
  );
  return converted;
}

export async function convertBlobUrlsToStorageUrlsWithMap(
  html: string,
  images: File[],
  blobUrls: string[],
  userId: string,
  postId: string,
  sessionTokens?: SessionTokens,
  startIndex: number = 1
): Promise<{ html: string; urlMap: Map<string, string> }> {
  if (!html || images.length === 0 || blobUrls.length === 0) {
    return { html, urlMap: new Map() };
  }

  if (images.length !== blobUrls.length) {
    throw new Error('이미지 파일과 Blob URL의 개수가 일치하지 않습니다.');
  }

  // 각 이미지를 업로드하고 Blob URL과 Storage URL 매핑 생성
  const urlMap = new Map<string, string>();
  const uploadPromises = images.map(async (file, index) => {
    try {
      const blobUrl = blobUrls[index];
      const imageIndex = startIndex + index; // 시작 인덱스부터 순차적으로 증가
      const storageUrl = await uploadImage(file, userId, postId, imageIndex, sessionTokens);
      urlMap.set(blobUrl, storageUrl);
      return { blobUrl, storageUrl };
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      throw error;
    }
  });

  await Promise.all(uploadPromises);

  // HTML에서 Blob URL을 Storage URL로 치환
  let convertedHtml = html;
  blobUrls.forEach((blobUrl) => {
    const storageUrl = urlMap.get(blobUrl);
    if (storageUrl) {
      // 정확한 매칭을 위해 전체 src 속성을 치환
      convertedHtml = convertedHtml.replace(
        new RegExp(`src=["']${blobUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi'),
        `src="${storageUrl}"`
      );
    }
  });

  return { html: convertedHtml, urlMap };
}
