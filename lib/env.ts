import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional().or(z.literal("")),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000")
});

const environmentNames = ["development", "preview", "staging", "production", "test"] as const;
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  APP_ENV: z.enum(environmentNames)
});
const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_CONNECT_CLIENT_ID: z.string().min(1),
  STRIPE_CONNECT_STATE_SECRET: z.string().min(32),
  STRIPE_PLATFORM_FEE_BPS: z.coerce.number().int().min(1).max(10000)
});

export type EnvironmentReport = {
  environment: (typeof environmentNames)[number];
  valid: boolean;
  missing: string[];
};

export function stripeBillingEnabled() {
  return process.env.STRIPE_BILLING_ENABLED === "true";
}

export function applicationEnvironment(): EnvironmentReport["environment"] {
  const candidate = process.env.APP_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  if (candidate === "production") return "production";
  if (candidate === "preview") return "preview";
  if (candidate === "staging") return "staging";
  if (candidate === "test") return "test";
  return "development";
}

export function getEnvironmentReport(): EnvironmentReport {
  const values = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    APP_ENV: applicationEnvironment(),
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_CONNECT_WEBHOOK_SECRET: process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    STRIPE_CONNECT_CLIENT_ID: process.env.STRIPE_CONNECT_CLIENT_ID,
    STRIPE_CONNECT_STATE_SECRET: process.env.STRIPE_CONNECT_STATE_SECRET,
    STRIPE_PLATFORM_FEE_BPS: process.env.STRIPE_PLATFORM_FEE_BPS
  };
  const baseResult = serverSchema.safeParse(values);
  const stripeResult = stripeBillingEnabled() ? stripeSchema.safeParse(values) : { success: true as const };
  const issues = [
    ...(baseResult.success ? [] : baseResult.error.issues),
    ...(stripeResult.success ? [] : stripeResult.error.issues)
  ];
  return {
    environment: values.APP_ENV,
    valid: issues.length === 0,
    missing: issues.map((issue) => issue.path.join(".")).filter(Boolean)
  };
}

export function validateServerEnvironment() {
  const report = getEnvironmentReport();
  if (!report.valid) {
    throw new Error(`Invalid server environment configuration: ${report.missing.join(", ")}`);
  }
  return report;
}

export function getPublicEnv() {
  return publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  });
}

export function hasSupabaseEnv() {
  const env = getPublicEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
