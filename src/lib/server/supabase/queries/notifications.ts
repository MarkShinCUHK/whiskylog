import { createSupabaseClient, createSupabaseClientWithSession } from '../client.js';
import type { Notification, NotificationRow } from '../types.js';
import type { SessionTokens } from '../auth.js';

type NotificationSelectRow = NotificationRow & {
  posts?: { title?: string | null } | null;
};

function formatDateTime(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function mapRowToNotification(row: NotificationSelectRow): Notification {
  const createdAt = new Date(row.created_at);
  const readAt = row.read_at ? new Date(row.read_at) : null;

  return {
    id: row.id,
    userId: row.user_id,
    actorId: row.actor_id,
    actorName: row.actor_name ?? null,
    postId: row.post_id,
    commentId: row.comment_id ?? null,
    type: row.type,
    createdAt: formatDateTime(createdAt),
    readAt: readAt ? formatDateTime(readAt) : null,
    postTitle: row.posts?.title ?? null
  };
}

export async function listNotifications(
  userId: string,
  sessionTokens?: SessionTokens,
  input?: { limit?: number; offset?: number }
): Promise<Notification[]> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

    let query = supabase
      .from('notifications')
      .select('*, posts(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (input?.offset && input.offset > 0) {
      query = query.range(input.offset, input.offset + (input.limit ?? 20) - 1);
    } else if (input?.limit && input.limit > 0) {
      query = query.limit(input.limit);
    }

    const { data, error } = await query;
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('알림 목록 조회 경고:', error.message);
      }
      return [];
    }

    return (data || []).map((row) => mapRowToNotification(row as NotificationSelectRow));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('알림 목록 조회 예외:', error instanceof Error ? error.message : error);
    }
    return [];
  }
}

export async function getUnreadNotificationCount(
  userId: string,
  sessionTokens?: SessionTokens
): Promise<number> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('알림 개수 조회 경고:', error.message);
      }
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('알림 개수 조회 예외:', error instanceof Error ? error.message : error);
    }
    return 0;
  }
}

export async function getNotificationCount(
  userId: string,
  sessionTokens?: SessionTokens
): Promise<number> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('알림 전체 개수 조회 경고:', error.message);
      }
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('알림 전체 개수 조회 예외:', error instanceof Error ? error.message : error);
    }
    return 0;
  }
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
  sessionTokens?: SessionTokens
): Promise<void> {
  const supabase = sessionTokens
    ? createSupabaseClientWithSession(sessionTokens)
    : createSupabaseClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    console.error('알림 읽음 처리 오류:', error);
    throw error;
  }
}

export async function markAllNotificationsRead(
  userId: string,
  sessionTokens?: SessionTokens
): Promise<number> {
  const supabase = sessionTokens
    ? createSupabaseClientWithSession(sessionTokens)
    : createSupabaseClient();

  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
    .select('id');

  if (error) {
    console.error('알림 전체 읽음 처리 오류:', error);
    throw error;
  }

  return data?.length ?? 0;
}

export async function createNotification(
  input: {
    userId: string;
    actorId: string;
    actorName?: string | null;
    postId: string;
    commentId?: string | null;
    type: 'comment' | 'like';
  },
  sessionTokens?: SessionTokens
): Promise<void> {
  try {
    const supabase = sessionTokens
      ? createSupabaseClientWithSession(sessionTokens)
      : createSupabaseClient();

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.userId,
        actor_id: input.actorId,
        actor_name: input.actorName ?? null,
        post_id: input.postId,
        comment_id: input.commentId ?? null,
        type: input.type
      });

    if (error) {
      console.error('알림 생성 오류:', error);
      throw error;
    }
  } catch (error) {
    console.error('알림 생성 오류:', error);
    throw error;
  }
}
