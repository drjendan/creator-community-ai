import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { decryptApiKey } from "@/lib/security/api-key-encryption";
import { getActiveTenantManager } from "@/lib/tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({
  sourceType: z.enum(["podcast_transcript","course","lesson","document","event","community_discussion","manual"]),
  sourceId: z.string().uuid().optional().or(z.literal("")),
  sourceText: z.string().trim().min(20).max(50000),
  outputType: z.enum(["episode_summary","show_notes","blog_post","linkedin_post","facebook_post","instagram_caption","x_post","email_newsletter","episode_topic_ideas","quiz_questions","discussion_questions","event_description","promotional_copy"]),
  audience: z.string().trim().min(2).max(200),
  tone: z.string().trim().min(2).max(100),
  length: z.enum(["short","medium","long"]),
  callToAction: z.string().trim().max(500).default(""),
  variations: z.number().int().min(1).max(5)
});

async function callProvider(provider: string, model: string, apiKey: string, prompt: string) {
  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages: [{ role: "system", content: "You are a careful creator-content editor. Never invent source facts." }, { role: "user", content: prompt }] }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? "OpenAI generation failed.");
    return { text: String(result.choices?.[0]?.message?.content ?? ""), input: result.usage?.prompt_tokens ?? 0, output: result.usage?.completion_tokens ?? 0 };
  }
  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 3000, messages: [{ role: "user", content: prompt }] }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? "Anthropic generation failed.");
    return { text: String(result.content?.[0]?.text ?? ""), input: result.usage?.input_tokens ?? 0, output: result.usage?.output_tokens ?? 0 };
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? "Google generation failed.");
  const usage = result.usageMetadata ?? {};
  return { text: String(result.candidates?.[0]?.content?.parts?.[0]?.text ?? ""), input: usage.promptTokenCount ?? 0, output: usage.candidatesTokenCount ?? 0 };
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the source and generation controls." }, { status: 400 });
  const context = await getActiveTenantManager();
  if (!context) return NextResponse.json({ error: "No manageable tenant is assigned to this account." }, { status: 403 });
  const input = parsed.data;
  const admin = createAdminClient();

  const [{ data: subscription }, { data: providerSettings }, { data: entitlement }] = await Promise.all([
    admin.from("tenant_subscriptions").select("ai_credit_allowance,current_ai_usage").eq("tenant_id", context.tenant.id).maybeSingle(),
    admin.from("ai_provider_settings").select("provider,model,encrypted_api_key,enabled").eq("tenant_id", context.tenant.id).maybeSingle(),
    admin.from("tenant_feature_entitlements").select("enabled").eq("tenant_id", context.tenant.id).eq("feature_key", "creator_ai_studio").maybeSingle()
  ]);
  if (entitlement && !entitlement.enabled) return NextResponse.json({ error: "Creator AI Studio is not enabled for this tenant." }, { status: 403 });
  if (!providerSettings?.enabled) return NextResponse.json({ error: "Connect and enable an AI provider before generating." }, { status: 409 });
  const allowance = subscription?.ai_credit_allowance ?? 0;
  const used = subscription?.current_ai_usage ?? 0;
  const reservedCredits = input.variations * 5;
  if (used + reservedCredits > allowance) return NextResponse.json({ error: `AI allowance exhausted. ${Math.max(0, allowance - used)} credits remain.` }, { status: 402 });

  const prompt = `Create ${input.variations} distinct ${input.outputType.replaceAll("_"," ")} variation(s).
Audience: ${input.audience}
Tone: ${input.tone}
Length: ${input.length}
Call to action: ${input.callToAction || "None"}
Use only the source below. Separate variations with a line containing exactly ---.

SOURCE:
${input.sourceText}`;
  const started = Date.now();
  try {
    const generated = await callProvider(providerSettings.provider, providerSettings.model, decryptApiKey(providerSettings.encrypted_api_key), prompt);
    const variations = generated.text.split(/\n---\n/g).map((value) => value.trim()).filter(Boolean).slice(0, input.variations);
    const credits = Math.max(reservedCredits, Math.ceil(generated.input / 1000) + Math.ceil(generated.output / 500));
    const { data: generation, error: generationError } = await admin.from("ai_generations").insert({
      tenant_id: context.tenant.id, user_id: context.user.id, source_type: input.sourceType,
      source_id: input.sourceId || null, source_text: input.sourceText, output_type: input.outputType,
      audience: input.audience, tone: input.tone, length: input.length, call_to_action: input.callToAction,
      variation_count: input.variations, output: variations, status: "saved"
    }).select("id").single();
    if (generationError) throw generationError;
    await Promise.all([
      admin.from("tenant_subscriptions").update({ current_ai_usage: used + credits, updated_at: new Date().toISOString() }).eq("tenant_id", context.tenant.id),
      admin.from("ai_usage").insert({ tenant_id: context.tenant.id, user_id: context.user.id, feature: "creator_studio", model_provider: providerSettings.provider, model: providerSettings.model, model_name: providerSettings.model, input_tokens: generated.input, output_tokens: generated.output, cost: 0, estimated_provider_cost: 0, credits_charged: credits, request_status: "completed" }),
      admin.from("tenant_ai_credit_transactions").insert({ tenant_id: context.tenant.id, user_id: context.user.id, feature: "creator_studio", transaction_type: "usage", credits: -credits, balance_after: Math.max(0, allowance - used - credits), reference_id: generation.id, metadata: { duration_ms: Date.now() - started } }),
      admin.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: "tenant.ai_generation.created", entity_type: "ai_generation", entity_id: generation.id, metadata: { output_type: input.outputType, credits } })
    ]);
    return NextResponse.json({ id: generation.id, variations, credits, remaining: Math.max(0, allowance - used - credits) });
  } catch (error) {
    await admin.from("ai_usage").insert({ tenant_id: context.tenant.id, user_id: context.user.id, feature: "creator_studio", model_provider: providerSettings.provider, model: providerSettings.model, model_name: providerSettings.model, request_status: "failed" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generation failed." }, { status: 502 });
  }
}
