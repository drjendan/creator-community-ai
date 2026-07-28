import "server-only";

import { getActiveTenantAdministrator } from "@/lib/tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";

const teamRoles = new Set([
  "tenant_owner",
  "tenant_admin",
  "content_manager",
  "community_moderator",
  "platform_owner",
  "platform_admin"
]);

export function isTeamRole(role: string) {
  return teamRoles.has(role);
}

export async function getCurrentTenantPeople() {
  const context = await getActiveTenantAdministrator();
  if (!context) return null;
  const admin = createAdminClient();
  const { data: memberships, error } = await admin
    .from("tenant_memberships")
    .select("id,user_id,role,status,created_at,updated_at")
    .eq("tenant_id", context.tenant.id)
    .order("created_at");
  if (error) throw new Error("Unable to load organization users.");

  const userIds = (memberships ?? []).map((membership) => membership.user_id);
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id,full_name,avatar_url").in("id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const authResults = await Promise.all(
    userIds.map((userId) => admin.auth.admin.getUserById(userId))
  );
  const authById = new Map(
    authResults
      .map((result) => result.data.user)
      .filter((user): user is NonNullable<typeof user> => Boolean(user))
      .map((user) => [user.id, user])
  );

  const people = (memberships ?? []).map((membership) => {
    const profile = profileById.get(membership.user_id);
    const authUser = authById.get(membership.user_id);
    const metadataName = authUser?.user_metadata?.full_name ?? authUser?.user_metadata?.name;
    const email = authUser?.email ?? null;
    return {
      id: membership.id,
      userId: membership.user_id,
      name: profile?.full_name || (typeof metadataName === "string" ? metadataName : null) || email?.split("@")[0] || "User",
      email,
      avatarUrl: profile?.avatar_url ?? null,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.created_at,
      category: isTeamRole(membership.role) ? "Team" as const : "Audience" as const
    };
  });

  return {
    tenant: context.tenant,
    people,
    activeCount: people.filter((person) => person.status === "active").length,
    teamCount: people.filter((person) => person.status === "active" && person.category === "Team").length,
    audienceCount: people.filter((person) => person.status === "active" && person.category === "Audience").length
  };
}
