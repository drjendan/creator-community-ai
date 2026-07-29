import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getPlatformAdministrator() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const role = user?.app_metadata?.platform_role;
  if (
    !user ||
    (role !== "platform_owner" && role !== "platform_admin")
  ) {
    return null;
  }
  return { user, role };
}
