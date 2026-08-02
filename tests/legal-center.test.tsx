import { readFileSync } from "node:fs";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { defaultLegalContent, defaultLegalVersion } from "@/lib/legal-content";

describe("public Legal Center", () => {
  it("renders a versioned policy and searches its sections", async () => {
    const view = render(<LegalDocumentPage document={{
      type: "terms",
      title: "Terms of Service",
      content: defaultLegalContent.terms,
      version: defaultLegalVersion,
      effectiveAt: "2026-07-30T00:00:00.000Z",
      source: "default"
    }} />);
    const scoped = within(view.container);
    expect(scoped.getByRole("heading", { name: "Terms of Service" })).toBeInTheDocument();
    expect(scoped.getByText(/Version 2026\.07/)).toBeInTheDocument();
    await userEvent.type(scoped.getByLabelText("Search Terms of Service"), "subscriptions");
    expect(scoped.getByRole("heading", { name: "Subscriptions and payments" })).toBeInTheDocument();
    expect(scoped.queryByRole("heading", { name: "Accounts and organizations" })).not.toBeInTheDocument();
  });
});

describe("legal and communication migration safeguards", () => {
  const migration = readFileSync("supabase/migrations/0016_communication_legal_center.sql", "utf8");
  const signup = readFileSync("app/signup/actions.ts", "utf8");
  const legalApi = readFileSync("app/api/legal/[scope]/route.ts", "utf8");

  it("creates required version and acceptance records with RLS", () => {
    for (const table of ["legal_documents", "legal_versions", "user_legal_acceptance"]) {
      expect(migration).toContain(`public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain("accepted_terms_version");
    expect(migration).toContain("accepted_privacy_version");
    expect(migration).toContain("ip_address inet");
    expect(migration).toContain("user_agent text");
  });

  it("requires legal consent before signup and records the accepted versions", () => {
    expect(signup).toContain('acceptLegal: z.literal("on")');
    expect(signup).toContain('from("user_legal_acceptance").insert');
    expect(signup).toContain("accepted_terms_version");
    expect(signup).toContain("accepted_privacy_version");
  });

  it("keeps tenant legal mutations scoped to the authorized tenant", () => {
    expect(legalApi).toContain("getActiveTenantAdministrator");
    expect(legalApi).toContain("tenant_id: authorized.tenantId");
    expect(legalApi).toContain('.eq("tenant_id", tenantId)');
  });

  it("repairs the disabled Hub regression and creates isolated contacts", () => {
    expect(migration).toContain("'communication_hub'");
    expect(migration).toContain("set enabled=true, source='plan'");
    expect(migration).toContain("public.communication_contacts");
    expect(migration).toContain("public.can_manage_communications(tenant_id)");
    expect(migration).toContain("unique (tenant_id,email)");
  });
});
