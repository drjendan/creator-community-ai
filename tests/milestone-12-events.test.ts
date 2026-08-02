import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0028_event_experience.sql");
const managerApi = read("app/api/events/[eventId]/details/route.ts");
const registrationApi = read("app/api/events/registration/route.ts");
const managerUi = read("components/dashboard/EventExperienceManager.tsx");
const memberUi = read("components/tenant/MemberEventsExperience.tsx");

describe("Milestone 12 events", () => {
  it("adds complete schedules, capacity, venues, and replay metadata", () => {
    for (const field of ["ends_at", "timezone", "event_format", "venue_name", "capacity", "registration_deadline", "waitlist_enabled", "member_instructions", "allow_download"]) expect(migration).toContain(field);
    expect(migration).toContain("tenant.events.manage");
  });

  it("serializes registration capacity and supports safe cancellation", () => {
    expect(migration).toContain("register_for_event");
    expect(migration).toContain("for update");
    expect(migration).toContain("waitlisted");
    expect(migration).toContain("cancel_event_registration");
    expect(migration).toContain("user_id=auth.uid()");
  });

  it("scopes creator and member operations to the active tenant", () => {
    expect(managerApi).toContain('getActiveTenantWithPermission("tenant.events.manage")');
    expect(managerApi).toContain('.eq("tenant_id", context.tenant.id)');
    expect(registrationApi).toContain("getTenantMemberContext(input.tenantSlug)");
    expect(registrationApi).toContain('.eq("tenant_id", context.tenant.id)');
  });

  it("ships registration, attendance, replay, and discovery interfaces", () => {
    for (const text of ["Event experience", "Attendees", "Replays", "Registration closes"]) expect(managerUi).toContain(text);
    for (const text of ["Register or join waitlist", "Cancel registration", "upcoming", "past"]) expect(memberUi).toContain(text);
  });
});
