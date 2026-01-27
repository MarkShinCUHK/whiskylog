import { fail } from '@sveltejs/kit';
import { requireAuth, getSession } from '$lib/server/supabase/auth';
import { getProfile, upsertProfile } from '$lib/server/supabase/queries/profiles';
import { createSupabaseClientForSession } from '$lib/server/supabase/client';
import { deleteStoragePublicUrl, uploadAvatar } from '$lib/server/supabase/queries/storage';

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

    const supabase = createSupabaseClientForSession(sessionTokens);
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
