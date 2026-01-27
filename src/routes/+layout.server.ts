import type { LayoutServerLoad } from './$types';
import { getSession, getUser } from '$lib/server/supabase/auth';
import { getUnreadNotificationCount } from '$lib/server/supabase/queries/notifications';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const user = await getUser(cookies);
  const session = getSession(cookies);
  let unreadCount = 0;
  if (user && !user.isAnonymous && session?.accessToken) {
    unreadCount = await getUnreadNotificationCount(user.id, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken
    });
  }
  // 익명 사용자는 null로 반환 (헤더에서 "내 글" 등이 보이지 않도록)
  return {
    user: user && !user.isAnonymous ? user : null,
    notifications: {
      unreadCount
    }
  };
};
