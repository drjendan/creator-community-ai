import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantIdentifier } from "@/lib/tenant";

const tenantPublicPaths = new Set([
  "/", "/welcome", "/membership", "/episodes", "/community", "/courses",
  "/events", "/resources", "/messages", "/settings/communications", "/settings/data"
]);

export async function middleware(request: NextRequest) {
  const suppliedCorrelationId = request.headers.get("x-correlation-id");
  const correlationId = suppliedCorrelationId && /^[a-zA-Z0-9-]{8,128}$/.test(suppliedCorrelationId)
    ? suppliedCorrelationId
    : crypto.randomUUID();
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  let tenant = resolveTenantIdentifier({
    host,
    pathname: request.nextUrl.pathname,
    rootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "upnexx.net"
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-upnexx-tenant-slug");
  requestHeaders.delete("x-upnexx-tenant-host");
  requestHeaders.set("x-correlation-id", correlationId);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (tenant?.source === "custom-domain") {
    tenant = null;
    if (url && key) {
      const resolver = createSupabaseClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data } = await resolver.rpc("resolve_active_tenant_domain", {
        target_hostname: host
      });
      const slug = typeof data === "string" ? data : null;
      if (typeof slug === "string" && slug) tenant = { slug, source: "custom-domain" };
    }
  }
  if (tenant?.source === "subdomain" || tenant?.source === "custom-domain") {
    requestHeaders.set("x-upnexx-tenant-slug", tenant.slug);
    requestHeaders.set("x-upnexx-tenant-host", host);
  }

  let destination: URL | null = null;
  let canonicalDestination: URL | null = null;
  if ((tenant?.source === "subdomain" || tenant?.source === "custom-domain") && (
    tenantPublicPaths.has(request.nextUrl.pathname) ||
    ["/episodes/", "/courses/", "/events/", "/resources/"].some((prefix) => request.nextUrl.pathname.startsWith(prefix))
  )) {
    destination = request.nextUrl.clone();
    destination.pathname = `/demo/${tenant.slug}${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`;
    if (tenant.source === "subdomain" && url && key) {
      const resolver = createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data } = await resolver.rpc("resolve_tenant_canonical_domain", { target_slug: tenant.slug });
      const canonicalHost = typeof data === "string" ? data : null;
      if (canonicalHost) {
        canonicalDestination = request.nextUrl.clone();
        canonicalDestination.protocol = "https:";
        canonicalDestination.host = canonicalHost;
      }
    }
  }

  const responseForRequest = () => {
    const nextResponse = canonicalDestination
      ? NextResponse.redirect(canonicalDestination, 308)
      : destination
        ? NextResponse.rewrite(destination, { request: { headers: requestHeaders } })
        : NextResponse.next({ request: { headers: requestHeaders } });
    nextResponse.headers.set("x-correlation-id", correlationId);
    return nextResponse;
  };
  if (!url || !key) return responseForRequest();

  let response = responseForRequest();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies: Array<{ name: string; value: string; options?: CookieOptions }>) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = responseForRequest();
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });
  const protectedPath = request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/platform-admin");
  if (!protectedPath) return response;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", request.nextUrl.pathname);
    const redirectResponse = NextResponse.redirect(login);
    redirectResponse.headers.set("x-correlation-id", correlationId);
    return redirectResponse;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"]
};
