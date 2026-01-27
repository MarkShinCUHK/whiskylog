import { fail } from '@sveltejs/kit';
import { requireAuth, getSession } from '$lib/server/supabase/auth';
import {
  listNotifications,
  getNotificationCount,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead
} from '$lib/server/supabase/queries/notifications';

const PER_PAGE = 20;

export async function load({ cookies, url }) {
  const user = await requireAuth(cookies);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const offset = (page - 1) * PER_PAGE;
  const sessionTokens = getSession(cookies);

  const [notifications, totalCount, unreadCount] = await Promise.all([
    listNotifications(user.id, sessionTokens || undefined, { limit: PER_PAGE, offset }),
    getNotificationCount(user.id, sessionTokens || undefined),
    getUnreadNotificationCount(user.id, sessionTokens || undefined)
  ]);

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / PER_PAGE));

  return {
    user,
    page,
    perPage: PER_PAGE,
    totalCount,
    totalPages,
    unreadCount,
    notifications
  };
}

export const actions = {
  markRead: async ({ request, cookies }) => {
    const user = await requireAuth(cookies);
    const sessionTokens = getSession(cookies);
    if (!sessionTokens) {
      return fail(401, { error: '로그인 세션이 없습니다.' });
    }

    const formData = await request.formData();
    const notificationId = formData.get('notificationId')?.toString();

    if (!notificationId) {
      return fail(400, { error: '알림 ID가 없습니다.' });
    }

    await markNotificationRead(notificationId, user.id, sessionTokens);
    const unreadCount = await getUnreadNotificationCount(user.id, sessionTokens);
    return { unreadCount };
  },
  markAllRead: async ({ cookies }) => {
    const user = await requireAuth(cookies);
    const sessionTokens = getSession(cookies);
    if (!sessionTokens) {
      return fail(401, { error: '로그인 세션이 없습니다.' });
    }

    const count = await markAllNotificationsRead(user.id, sessionTokens);
    return { readCount: count };
  }
};
