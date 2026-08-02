import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type AudienceType = "all_active_members" | "membership_plans" | "groups" | "segments" | "individual_members";

function valuesOf(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [String(value ?? "")];
}

async function evaluateSegment(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  segmentId: string,
  candidates: Array<{ user_id: string; created_at: string }>
) {
  const [{ data: segment }, { data: rules }] = await Promise.all([
    admin
      .from("audience_segments")
      .select("id,match_type,status")
      .eq("tenant_id", tenantId)
      .eq("id", segmentId)
      .eq("status", "active")
      .maybeSingle(),
    admin
      .from("audience_segment_rules")
      .select("rule_type,operator,rule_value")
      .eq("tenant_id", tenantId)
      .eq("segment_id", segmentId)
      .order("created_at")
  ]);
  if (!segment || !rules?.length) return new Set<string>();
  const candidateIds = candidates.map((item) => item.user_id);
  const resultSets: Set<string>[] = [];

  for (const rule of rules) {
    const values = valuesOf(rule.rule_value);
    let matching = new Set<string>();
    if (rule.rule_type === "membership_plan" || rule.rule_type === "membership_status") {
      const { data } = await admin
        .from("member_subscriptions")
        .select("user_id,plan_id,status")
        .eq("tenant_id", tenantId)
        .in("user_id", candidateIds);
      matching = new Set(
        (data ?? [])
          .filter((item) =>
            values.includes(
              String(
                rule.rule_type === "membership_plan"
                  ? item.plan_id
                  : item.status
              )
            )
          )
          .map((item) => item.user_id)
      );
    } else if (rule.rule_type === "group_membership") {
      const { data } = await admin
        .from("group_members")
        .select("user_id,group_id")
        .eq("tenant_id", tenantId)
        .in("user_id", candidateIds)
        .in("group_id", values);
      matching = new Set((data ?? []).map((item) => item.user_id));
    } else if (rule.rule_type === "course_enrollment") {
      const { data } = await admin
        .from("course_enrollments")
        .select("user_id,course_id")
        .eq("tenant_id", tenantId)
        .in("user_id", candidateIds)
        .in("course_id", values);
      matching = new Set((data ?? []).map((item) => item.user_id));
    } else if (rule.rule_type === "event_registration") {
      const { data } = await admin
        .from("event_registrations")
        .select("user_id,event_id")
        .eq("tenant_id", tenantId)
        .in("user_id", candidateIds)
        .in("event_id", values);
      matching = new Set((data ?? []).map((item) => item.user_id));
    } else if (
      rule.rule_type === "joined_before" ||
      rule.rule_type === "joined_after"
    ) {
      const boundary = new Date(values[0]).getTime();
      matching = new Set(
        candidates
          .filter((item) => {
            const joined = new Date(item.created_at).getTime();
            return rule.rule_type === "joined_before"
              ? joined < boundary
              : joined > boundary;
          })
          .map((item) => item.user_id)
      );
    } else if (rule.rule_type === "email_opt_in") {
      const shouldBeEnabled = values[0] !== "false";
      const { data } = await admin
        .from("member_communication_preferences")
        .select("user_id,email_enabled")
        .eq("tenant_id", tenantId)
        .eq("category", "all_marketing")
        .in("user_id", candidateIds);
      const disabled = new Set(
        (data ?? [])
          .filter((item) => !item.email_enabled)
          .map((item) => item.user_id)
      );
      matching = new Set(
        candidateIds.filter((id) =>
          shouldBeEnabled ? !disabled.has(id) : disabled.has(id)
        )
      );
    } else if (rule.rule_type === "last_login") {
      const boundary = new Date(values[0]).getTime();
      for (const id of candidateIds) {
        const { data } = await admin.auth.admin.getUserById(id);
        const lastLogin = data.user?.last_sign_in_at
          ? new Date(data.user.last_sign_in_at).getTime()
          : 0;
        const matches =
          rule.operator === "before"
            ? lastLogin > 0 && lastLogin < boundary
            : lastLogin > boundary;
        if (matches) matching.add(id);
      }
    }
    if (rule.operator === "not_equals") {
      matching = new Set(candidateIds.filter((id) => !matching.has(id)));
    }
    resultSets.push(matching);
  }

  if (segment.match_type === "or") {
    return new Set(resultSets.flatMap((set) => [...set]));
  }
  return new Set(
    candidateIds.filter((id) => resultSets.every((set) => set.has(id)))
  );
}

export async function resolveEligibleRecipients(input: {
  tenantId: string;
  audienceType: AudienceType;
  audienceIds: string[];
  marketing: boolean;
  category?: string;
}) {
  const admin = createAdminClient();
  let query = admin
    .from("tenant_memberships")
    .select("user_id,role,status,created_at")
    .eq("tenant_id", input.tenantId)
    .eq("status", "active")
    .in("role", ["member", "guest"]);
  if (input.audienceType === "individual_members") query = query.in("user_id", input.audienceIds);
  const { data: memberships } = await query;
  let userIds = (memberships ?? []).map((item: { user_id: string }) => item.user_id);

  if (input.audienceType === "membership_plans") {
    const { data: subscriptions } = await admin
      .from("member_subscriptions")
      .select("user_id")
      .eq("tenant_id", input.tenantId)
      .in("plan_id", input.audienceIds)
      .in("status", ["active", "trialing"]);
    const subscribed = new Set((subscriptions ?? []).map((item: { user_id: string }) => item.user_id));
    userIds = userIds.filter((id) => subscribed.has(id));
  }

  if (input.audienceType === "groups") {
    const { data: groupMembers } = await admin
      .from("group_members")
      .select("user_id")
      .eq("tenant_id", input.tenantId)
      .in("group_id", input.audienceIds);
    const grouped = new Set((groupMembers ?? []).map((item: { user_id: string }) => item.user_id));
    userIds = userIds.filter((id) => grouped.has(id));
  }

  if (input.audienceType === "segments") {
    const segmentSets = await Promise.all(
      input.audienceIds.map((segmentId) =>
        evaluateSegment(
          admin,
          input.tenantId,
          segmentId,
          memberships ?? []
        )
      )
    );
    const eligible = new Set(segmentSets.flatMap((set) => [...set]));
    userIds = userIds.filter((id) => eligible.has(id));
  }

  const memberRecipients = (await Promise.all(userIds.map(async (userId) => {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email ? { userId, email: data.user.email.toLowerCase() } : null;
  }))).filter((item): item is { userId: string; email: string } => Boolean(item));
  let contactQuery = admin.from("communication_contacts").select("id,email").eq("tenant_id", input.tenantId).eq("status", "active");
  if (input.audienceType === "individual_members") contactQuery = contactQuery.in("id", input.audienceIds);
  const { data: contacts } = input.marketing && ["all_active_members", "individual_members"].includes(input.audienceType)
    ? await contactQuery
    : { data: [] };
  const seen = new Set(memberRecipients.map((recipient) => recipient.email));
  const contactRecipients = (contacts ?? [])
    .map((contact: { email: string }) => ({ userId: null, email: contact.email.toLowerCase() }))
    .filter((contact) => !seen.has(contact.email));
  const recipients: Array<{ userId: string | null; email: string }> = [...memberRecipients, ...contactRecipients];

  if (!input.marketing || !recipients.length) return recipients;
  const emails = recipients.map((recipient) => recipient.email);
  const [{ data: suppressions }, { data: preferences }] = await Promise.all([
    admin.from("communication_suppressions").select("email").eq("tenant_id", input.tenantId).in("email", emails),
    admin.from("member_communication_preferences").select("user_id,email_enabled").eq("tenant_id", input.tenantId).in("category", ["all_marketing", input.category ?? "all_marketing"]).in("user_id", userIds)
  ]);
  const suppressed = new Set((suppressions ?? []).map((item: { email: string }) => item.email.toLowerCase()));
  const optedOut = new Set((preferences ?? []).filter((item: { email_enabled: boolean }) => !item.email_enabled).map((item: { user_id: string }) => item.user_id));
  return recipients.filter((recipient) => !suppressed.has(recipient.email) && (!recipient.userId || !optedOut.has(recipient.userId)));
}
