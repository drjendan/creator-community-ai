"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";

const priceId = z.union([z.literal(""), z.string().regex(/^price_[A-Za-z0-9]+$/, "Use a Stripe Price ID beginning with price_.")]);
const schema = z.object({ planId: z.string().uuid(), monthlyPriceId: priceId, annualPriceId: priceId });

export async function updatePlatformPlanStripePrices(formData: FormData) {
  const actor = await getPlatformAdministrator("platform.billing.manage");
  if (!actor) throw new Error("Platform billing management permission is required.");
  const input = schema.parse({
    planId: String(formData.get("planId") ?? ""),
    monthlyPriceId: String(formData.get("monthlyPriceId") ?? "").trim(),
    annualPriceId: String(formData.get("annualPriceId") ?? "").trim()
  });
  const admin = createAdminClient();
  const { error } = await admin.from("platform_plans").update({ stripe_monthly_price_id: input.monthlyPriceId || null, stripe_annual_price_id: input.annualPriceId || null, updated_at: new Date().toISOString() }).eq("id", input.planId);
  if (error) throw new Error("Unable to update Stripe prices.");
  await admin.from("platform_access_history").insert({ actor_id: actor.user.id, actor_role: actor.role, action: "platform.billing.price_ids_updated", after_state: { plan_id: input.planId, monthly_configured: Boolean(input.monthlyPriceId), annual_configured: Boolean(input.annualPriceId) } });
  revalidatePath("/platform-admin/billing");
  revalidatePath("/dashboard/billing");
}
