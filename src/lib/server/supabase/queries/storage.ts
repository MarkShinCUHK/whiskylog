import { createSupabaseClientForSession } from '../client.js';
import type { SessionTokens } from '../auth.js';
import crypto from 'node:crypto';

const STORAGE_BUCKET = 'post-images';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const STORAGE_PUBLIC_PREFIX = `/storage/v1/object/public/${STORAGE_BUCKET}/`;

/**
 * 파일 형식 검증 (서버 사이드)
 * FormData의 File 객체는 type이나 name 속성이 없을 수 있으므로 안전하게 처리
 */
function validateImageType(file: File): boolean {
  // MIME 타입으로 검증 (있는 경우)
  if (file.type) {
    const mimeType = file.type.toLowerCase();
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      return true;
    }
  }

  // 파일명 확장자로 검증 (MIME 타입이 없거나 일치하지 않는 경우)
  if (file.name) {
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    
    if (extension && allowedExtensions.includes(extension)) {
      return true;
    }
  }

  // type과 name이 모두 없으면 기본적으로 허용 (서버에서 처리)
  // 실제로는 이런 경우가 없어야 하지만 안전성을 위해
  return false;
}

/**
 * 고유한 파일명 생성
 * 형식: {timestamp}-{random}-{originalName}
 */
function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const extension = originalName && originalName.includes('.') 
    ? originalName.split('.').pop()?.toLowerCase() || 'jpg'
    : 'jpg';
  return `${timestamp}-${random}.${extension}`;
}

/**
 * 이미지를 Supabase Storage에 업로드
 * @param file 업로드할 이미지 파일
 * @param userId 사용자 ID (파일 경로에 사용)
 * @param postId 게시글 ID (파일 경로에 사용)
 * @param imageIndex 이미지 인덱스 (파일명에 사용)
 * @param sessionTokens 세션 토큰 (RLS 정책 적용을 위해 필요)
 * @returns 공개 URL
 */
export async function uploadImage(
  file: File,
  userId: string,
  postId: string,
  imageIndex: number,
  sessionTokens?: SessionTokens
): Promise<string> {
  try {
    // 디버깅: File 객체 정보 확인
    // console.log('File 객체 정보:', {
    //   name: file.name,
    //   type: file.type,
    //   size: file.size,
    //   hasArrayBuffer: typeof file.arrayBuffer === 'function'
    // });

    // 파일 형식 검증
    if (!validateImageType(file)) {
      throw new Error('지원하는 이미지 형식은 JPG, PNG, WebP, GIF입니다.');
    }

    // Supabase 클라이언트 생성 (세션 토큰이 있으면 사용)
    const supabase = createSupabaseClientForSession(sessionTokens);

    // 파일명 안전하게 처리
    const originalFileName = file.name || 'image.jpg';
    
    // 확장자 추출 (원본 확장자 유지)
    const extension = originalFileName && originalFileName.includes('.') 
      ? originalFileName.split('.').pop()?.toLowerCase() || 'webp'
      : 'webp';
    
    // 파일 경로: posts/{userId}/{postId}/image_{index}.{extension}
    const filePath = `posts/${userId}/${postId}/image_${imageIndex}.${extension}`;

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    // MIME 타입 결정 (file.type이 없으면 확장자로 추론)
    let contentType = file.type;
    if (!contentType && originalFileName) {
      const extension = originalFileName.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif'
      };
      contentType = extension ? (mimeMap[extension] || 'image/jpeg') : 'image/jpeg';
    } else if (!contentType) {
      contentType = 'image/jpeg'; // 기본값
    }

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, fileData, {
        contentType: contentType,
        upsert: false // 기존 파일 덮어쓰기 방지
      });

    if (error) {
      console.error('이미지 업로드 오류:', error);
      throw new Error(`이미지 업로드에 실패했습니다: ${error.message}`);
    }

    if (!data) {
      throw new Error('이미지 업로드 후 데이터를 받아오지 못했습니다.');
    }

    // 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('공개 URL을 생성하지 못했습니다.');
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    throw error;
  }
}

/**
 * 이미지 삭제 (선택사항)
 * @param filePath Storage 내 파일 경로
 * @param sessionTokens 세션 토큰
 */
export async function deleteImage(
  filePath: string,
  sessionTokens?: SessionTokens
): Promise<void> {
  try {
    const supabase = createSupabaseClientForSession(sessionTokens);

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('이미지 삭제 오류:', error);
      throw new Error(`이미지 삭제에 실패했습니다: ${error.message}`);
    }
  } catch (error) {
    console.error('이미지 삭제 오류:', error);
    throw error;
  }
}

/**
 * 게시글의 모든 이미지 삭제
 * @param folderPath Storage 내 폴더 경로 (예: posts/{userId}/{postId})
 * @param sessionTokens 세션 토큰
 */
export async function deletePostImages(
  folderPath: string,
  sessionTokens?: SessionTokens
): Promise<void> {
  try {
    const supabase = createSupabaseClientForSession(sessionTokens);

    // 폴더 내 모든 파일 목록 조회
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folderPath);

    if (listError) {
      // 폴더가 없거나 비어있으면 에러 무시 (이미 삭제된 경우)
      if (listError.message.includes('not found') || listError.message.includes('does not exist')) {
        return;
      }
      console.error('이미지 목록 조회 오류:', listError);
      throw new Error(`이미지 목록 조회에 실패했습니다: ${listError.message}`);
    }

    if (!files || files.length === 0) {
      // 폴더가 비어있으면 성공으로 처리
      return;
    }

    // 모든 파일 경로 생성
    const filePaths = files.map((file) => `${folderPath}/${file.name}`);

    // 모든 파일 삭제
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(filePaths);

    if (deleteError) {
      console.error('이미지 삭제 오류:', deleteError);
      // 삭제 실패해도 게시글 삭제는 진행 (로그만 기록)
      console.warn(`게시글 이미지 삭제 실패 (폴더: ${folderPath}), 게시글은 삭제됩니다.`);
    }
  } catch (error) {
    console.error('게시글 이미지 삭제 오류:', error);
    // 에러가 발생해도 게시글 삭제는 진행 (로그만 기록)
    console.warn(`게시글 이미지 삭제 중 오류 발생 (폴더: ${folderPath}), 게시글은 삭제됩니다.`);
  }
}

/**
 * 공개 URL에서 Storage 경로 추출
 */
export function getStoragePathFromPublicUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const markerIndex = url.pathname.indexOf(STORAGE_PUBLIC_PREFIX);
    if (markerIndex === -1) return null;
    return url.pathname.slice(markerIndex + STORAGE_PUBLIC_PREFIX.length);
  } catch {
    return null;
  }
}

/**
 * 공개 URL에 해당하는 Storage 객체 삭제 (같은 버킷인 경우만)
 */
export async function deleteStoragePublicUrl(publicUrl: string, sessionTokens?: SessionTokens): Promise<void> {
  const path = getStoragePathFromPublicUrl(publicUrl);
  if (!path) return;
  await deleteImage(path, sessionTokens);
}

/**
 * 아바타 업로드 (프로필 이미지 전용)
 * - 경로: avatars/{userId}/avatar-{timestamp}.webp
 */
export async function uploadAvatar(
  file: File,
  userId: string,
  sessionTokens: SessionTokens
): Promise<string> {
  // 이미지 파일이 없거나 비어있으면 업로드하지 않음
  if (!file || file.size === 0) {
    throw new Error('업로드할 이미지가 없습니다.');
  }

  if (!validateImageType(file)) {
    throw new Error('지원하는 이미지 형식은 JPG, PNG, WebP, GIF입니다.');
  }

  const supabase = createSupabaseClientForSession(sessionTokens);
  const filePath = `avatars/${userId}/avatar-${Date.now()}.webp`;

  const arrayBuffer = await file.arrayBuffer();
  const fileData = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, fileData, {
    contentType: 'image/webp',
    upsert: false
  });

  if (uploadError) {
    console.error('아바타 업로드 오류:', uploadError);
    throw new Error(`아바타 업로드에 실패했습니다: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  if (!urlData?.publicUrl) {
    throw new Error('아바타 공개 URL을 생성하지 못했습니다.');
  }

  return urlData.publicUrl;
}
