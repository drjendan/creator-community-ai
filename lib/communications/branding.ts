import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function renderBrandedEmail(
  admin: SupabaseClient,
  tenantId: string,
  content: string
) {
  const [{ data: tenant }, { data: branding }] = await Promise.all([
    admin.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
    admin
      .from("tenant_branding")
      .select(
        "email_logo_url,email_header_text,email_footer_text,footer_text,primary_color,background_color,text_color"
      )
      .eq("tenant_id", tenantId)
      .maybeSingle()
  ]);
  const name = escapeHtml(tenant?.name || "Organization");
  const logo = branding?.email_logo_url
    ? `<img src="${escapeHtml(branding.email_logo_url)}" alt="${name}" style="max-height:56px;max-width:240px">`
    : `<strong style="font-size:22px">${name}</strong>`;
  const header = branding?.email_header_text
    ? `<p style="margin:8px 0 0">${escapeHtml(branding.email_header_text)}</p>`
    : "";
  const footer = escapeHtml(
    branding?.email_footer_text || branding?.footer_text || `Sent by ${tenant?.name || "this organization"}.`
  );
  return `<div style="background:${branding?.background_color || "#f8fafc"};padding:24px;color:${branding?.text_color || "#0f172a"}"><div style="max-width:680px;margin:auto;background:#fff;border-radius:12px;overflow:hidden"><header style="padding:20px;border-top:6px solid ${branding?.primary_color || "#102a56"}">${logo}${header}</header><main style="padding:20px">${content}</main><footer style="padding:16px 20px;background:#f1f5f9;font-size:12px;color:#64748b">${footer}</footer></div></div>`;
}
