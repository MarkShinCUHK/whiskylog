import { fail } from '@sveltejs/kit';
import { requireAuth, getSession } from '$lib/server/supabase/auth';
import { getProfile, upsertProfile } from '$lib/server/supabase/queries/profiles';
import { createSupabaseClientForSession } from '$lib/server/supabase/client';
import { deleteStoragePublicUrl, uploadAvatar } from '$lib/server/supabase/queries/storage';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function load({ cookies }) {
  const user = await requireAuth(cookies);
  const sessionTokens = getSession(cookies);
  const profile = await getProfile(user.id, sessionTokens || undefined);

  return {
    user,
    profile
  };
}

export const actions = {
  update: async ({ request, cookies }) => {
    const user = await requireAuth(cookies);
    const sessionTokens = getSession(cookies);
    if (!sessionTokens) {
      return fail(401, { error: '로그인 세션이 없습니다.' });
    }

    const formData = await request.formData();
    const nickname = formData.get('nickname')?.toString().trim() || '';
    const bio = formData.get('bio')?.toString().trim() || '';
    const avatarUrl = formData.get('avatarUrl')?.toString().trim() || '';
    const avatarFile = formData.get('avatarFile');

    if (nickname.length < 2 || nickname.length > 20) {
      return fail(400, {
        error: '닉네임은 2~20자로 입력해주세요.',
        values: { nickname, bio, avatarUrl }
      });
    }

    if (avatarUrl && !(avatarFile instanceof File && avatarFile.size > 0) && !isHttpUrl(avatarUrl)) {
      return fail(400, {
        error: '프로필 이미지 URL은 http/https 주소만 허용됩니다.',
        values: { nickname, bio, avatarUrl }
      });
    }

    if (avatarFile instanceof File && avatarFile.size > MAX_AVATAR_BYTES) {
      return fail(400, {
        error: '프로필 이미지는 5MB 이하만 업로드할 수 있습니다.',
        values: { nickname, bio, avatarUrl }
      });
    }

    const supabase = createSupabaseClientForSession(sessionTokens);
    // 서버 환경에서 auth.updateUser가 세션을 못 찾는 경우가 있어 명시적으로 세션을 설정
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: sessionTokens.accessToken,
      refresh_token: sessionTokens.refreshToken
    });
    if (sessionError) {
      return fail(401, {
        error: sessionError.message || '로그인 세션이 유효하지 않습니다.',
        values: { nickname, bio, avatarUrl }
      });
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        nickname
      }
    });
    if (authError) {
      return fail(400, {
        error: authError.message || '프로필 저장에 실패했습니다.',
        values: { nickname, bio, avatarUrl }
      });
    }

    const previousProfile = await getProfile(user.id, sessionTokens);
    let finalAvatarUrl = avatarUrl;

    // 파일 업로드가 있으면 URL 입력보다 우선 적용
    if (avatarFile instanceof File && avatarFile.size > 0) {
      try {
        finalAvatarUrl = await uploadAvatar(avatarFile, user.id, sessionTokens);
      } catch (err) {
        const message = err instanceof Error ? err.message : '아바타 업로드에 실패했습니다.';
        return fail(400, {
          error: message,
          values: { nickname, bio, avatarUrl }
        });
      }
    }

    // 이전 아바타가 Storage 버킷에 있고, 새 아바타와 다르면 삭제 시도
    if (
      previousProfile?.avatarUrl &&
      previousProfile.avatarUrl !== finalAvatarUrl
    ) {
      try {
        await deleteStoragePublicUrl(previousProfile.avatarUrl, sessionTokens);
      } catch (err) {
        console.warn('이전 아바타 삭제 실패:', err);
      }
    }

    const profile = await upsertProfile(
      user.id,
      {
        nickname,
        bio: bio || undefined,
        avatarUrl: finalAvatarUrl || undefined
      },
      sessionTokens
    );

    if (!profile) {
      return fail(500, {
        error: '프로필 저장 중 오류가 발생했습니다.',
        values: { nickname, bio, avatarUrl }
      });
    }

    return {
      success: true
    };
  }
};
