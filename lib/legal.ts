import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultLegalContent, defaultLegalVersion, legalDocumentLabels, type LegalDocumentType } from "@/lib/legal-content";

export type ResolvedLegalDocument = {
  type: LegalDocumentType;
  title: string;
  content: string;
  version: string;
  effectiveAt: string;
  source: "platform" | "tenant" | "default";
};

async function publishedDocument(type: LegalDocumentType, tenantId?: string | null) {
  const admin = createAdminClient();
  let query = admin.from("legal_documents").select("id,title,current_version_id,scope").eq("document_type", type);
  query = tenantId ? query.eq("tenant_id", tenantId).eq("scope", "tenant") : query.is("tenant_id", null).eq("scope", "platform");
  const { data: document } = await query.maybeSingle();
  if (!document?.current_version_id) return null;
  const { data: version } = await admin.from("legal_versions").select("version,content,effective_at,status").eq("id", document.current_version_id).eq("status", "published").maybeSingle();
  if (!version) return null;
  return {
    type,
    title: document.title,
    content: version.content,
    version: version.version,
    effectiveAt: version.effective_at ?? new Date().toISOString(),
    source: document.scope as "platform" | "tenant"
  };
}

export async function resolveLegalDocument(type: LegalDocumentType, tenantSlug?: string) {
  if (tenantSlug && ["terms", "privacy", "refund"].includes(type)) {
    const admin = createAdminClient();
    const { data: tenant } = await admin.from("tenants").select("id").eq("slug", tenantSlug).eq("status", "active").maybeSingle();
    if (tenant) {
      const tenantDocument = await publishedDocument(type, tenant.id);
      if (tenantDocument) return tenantDocument;
    }
  }
  const platformDocument = type === "refund" ? null : await publishedDocument(type);
  return platformDocument ?? {
    type,
    title: legalDocumentLabels[type],
    content: defaultLegalContent[type],
    version: defaultLegalVersion,
    effectiveAt: "2026-07-30T00:00:00.000Z",
    source: "default" as const
  };
}

export async function currentAcceptanceVersions() {
  const [terms, privacy] = await Promise.all([resolveLegalDocument("terms"), resolveLegalDocument("privacy")]);
  return { terms: terms.version, privacy: privacy.version };
}

export async function hasCurrentLegalAcceptance(userId: string) {
  const versions = await currentAcceptanceVersions();
  const { data } = await createAdminClient().from("user_legal_acceptance")
    .select("id")
    .eq("user_id", userId)
    .eq("accepted_terms_version", versions.terms)
    .eq("accepted_privacy_version", versions.privacy)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}
