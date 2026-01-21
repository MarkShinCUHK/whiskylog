import type { LayoutServerLoad } from './$types';
import { getUser } from '$lib/server/supabase/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const user = await getUser(cookies);
  return { user };
};

