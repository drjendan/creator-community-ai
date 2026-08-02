import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveTenantAdministrator } from "@/lib/tenant-context";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { legalDocumentLabels, type LegalDocumentType } from "@/lib/legal-content";

const documentTypes = ["terms", "privacy", "cookies", "acceptable_use", "refund"] as const;
const versionSchema = z.object({
  action: z.enum(["save", "publish"]),
  documentType: z.enum(documentTypes),
  version: z.string().trim().min(1).max(40),
  content: z.string().trim().min(100).max(200000),
  effectiveAt: z.string().datetime()
});
const profileSchema = z.object({
  action: z.literal("profile"),
  businessName: z.string().trim().min(2).max(160),
  businessAddress: z.string().trim().max(1000),
  supportEmail: z.string().trim().email()
});

async function authorize(scope: string) {
  if (scope === "tenant") {
    const context = await getActiveTenantAdministrator();
    return context ? { admin: createAdminClient(), userId: context.user.id, tenantId: context.tenant.id } : null;
  }
  if (scope === "platform") {
    const access = await getPlatformAdministrator("platform.content.manage");
    if (!access) return null;
    return { admin: createAdminClient(), userId: access.user.id, tenantId: null };
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ scope: string }> }
) {
  const { scope } = await params;
  const authorized = await authorize(scope);
  if (!authorized) return NextResponse.json({ error: "Legal administrator access is required." }, { status: 403 });
  const { admin, tenantId } = authorized;
  let documentsQuery = admin.from("legal_documents").select("*").eq("scope", scope);
  documentsQuery = tenantId ? documentsQuery.eq("tenant_id", tenantId) : documentsQuery.is("tenant_id", null);
  const { data: documents, error } = await documentsQuery.order("document_type");
  if (error) return NextResponse.json({ error: "Unable to load legal documents. Apply migration 0016 if it is not installed." }, { status: 500 });
  const ids = (documents ?? []).map((document) => document.id);
  const { data: versions } = ids.length
    ? await admin.from("legal_versions").select("*").in("document_id", ids).order("created_at", { ascending: false })
    : { data: [] };
  const { data: profile } = tenantId
    ? await admin.from("tenant_legal_profiles").select("*").eq("tenant_id", tenantId).maybeSingle()
    : { data: null };
  return NextResponse.json({ documents: documents ?? [], versions: versions ?? [], profile });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scope: string }> }
) {
  const { scope } = await params;
  const authorized = await authorize(scope);
  if (!authorized) return NextResponse.json({ error: "Legal administrator access is required." }, { status: 403 });
  const body = await request.json().catch(() => null);

  if (scope === "tenant" && body?.action === "profile") {
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Check the tenant legal profile fields." }, { status: 400 });
    const { data, error } = await authorized.admin.from("tenant_legal_profiles").upsert({
      tenant_id: authorized.tenantId,
      business_name: parsed.data.businessName,
      business_address: parsed.data.businessAddress,
      support_email: parsed.data.supportEmail,
      updated_at: new Date().toISOString()
    }, { onConflict: "tenant_id" }).select("*").single();
    if (error) return NextResponse.json({ error: "Unable to save the tenant legal profile." }, { status: 500 });
    return NextResponse.json({ profile: data });
  }

  const parsed = versionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Add a version, effective date, and complete policy text." }, { status: 400 });
  const allowed = scope === "platform"
    ? ["terms", "privacy", "cookies", "acceptable_use"]
    : ["terms", "privacy", "refund"];
  if (!allowed.includes(parsed.data.documentType)) return NextResponse.json({ error: "This document type is not available in this Legal Center." }, { status: 400 });
  const { admin, tenantId, userId } = authorized;
  let documentQuery = admin.from("legal_documents").select("*").eq("scope", scope).eq("document_type", parsed.data.documentType);
  documentQuery = tenantId ? documentQuery.eq("tenant_id", tenantId) : documentQuery.is("tenant_id", null);
  let { data: document } = await documentQuery.maybeSingle();
  if (!document) {
    const created = await admin.from("legal_documents").insert({
      tenant_id: tenantId,
      scope,
      document_type: parsed.data.documentType,
      title: legalDocumentLabels[parsed.data.documentType as LegalDocumentType]
    }).select("*").single();
    if (created.error) return NextResponse.json({ error: "Unable to create the legal document." }, { status: 500 });
    document = created.data;
  }
  const now = new Date().toISOString();
  const { data: version, error: versionError } = await admin.from("legal_versions").upsert({
    document_id: document.id,
    version: parsed.data.version,
    content: parsed.data.content,
    status: parsed.data.action === "publish" ? "published" : "draft",
    effective_at: parsed.data.effectiveAt,
    published_at: parsed.data.action === "publish" ? now : null,
    created_by: userId
  }, { onConflict: "document_id,version" }).select("*").single();
  if (versionError) return NextResponse.json({ error: "Unable to save the legal version." }, { status: 500 });
  if (parsed.data.action === "publish") {
    await admin.from("legal_versions").update({ status: "archived" }).eq("document_id", document.id).eq("status", "published").neq("id", version.id);
    const { error: publishError } = await admin.from("legal_documents").update({ current_version_id: version.id, updated_at: now }).eq("id", document.id);
    if (publishError) return NextResponse.json({ error: "The version was saved but could not be published." }, { status: 500 });
  }
  return NextResponse.json({ document, version });
}
