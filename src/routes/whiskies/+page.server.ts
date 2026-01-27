import { listWhiskies } from '$lib/server/supabase/queries/whiskies';

export async function load() {
  const whiskies = await listWhiskies(200);
  return { whiskies };
}
