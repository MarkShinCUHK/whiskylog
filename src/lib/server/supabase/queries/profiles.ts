import { createSupabaseClientForSession } from '../client.js';
import type { Profile, ProfileRow } from '../types.js';
import type { SessionTokens } from '../auth.js';

const PROFILE_COLUMNS = 'user_id,nickname,bio,avatar_url,updated_at';

function mapRowToProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    nickname: row.nickname ?? null,
    bio: row.bio ?? null,
    avatarUrl: row.avatar_url ?? null,
    updatedAt: row.updated_at
  };
}

export async function getProfile(userId: string, sessionTokens?: SessionTokens): Promise<Profile | null> {
  try {
    const supabase = createSupabaseClientForSession(sessionTokens);

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('프로필 조회 오류:', error);
      return null;
    }
    if (!data) return null;
    return mapRowToProfile(data);
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    return null;
  }
}

export async function upsertProfile(
  userId: string,
  input: { nickname?: string; bio?: string; avatarUrl?: string },
  sessionTokens: SessionTokens
): Promise<Profile | null> {
  try {
    const supabase = createSupabaseClientForSession(sessionTokens);
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          nickname: input.nickname ?? null,
          bio: input.bio ?? null,
          avatar_url: input.avatarUrl ?? null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
      .select(PROFILE_COLUMNS)
      .single();

    if (error) {
      console.error('프로필 저장 오류:', error);
      return null;
    }
    if (!data) return null;
    return mapRowToProfile(data);
  } catch (error) {
    console.error('프로필 저장 오류:', error);
    return null;
  }
}
