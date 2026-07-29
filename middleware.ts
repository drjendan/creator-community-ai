import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantIdentifier } from "@/lib/tenant";

const tenantPublicPaths = new Set([
  "/", "/welcome", "/membership", "/episodes", "/community", "/courses",
  "/events", "/resources", "/messages", "/settings/communications"
]);

export async function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const tenant = resolveTenantIdentifier({
    host,
    pathname: request.nextUrl.pathname,
    rootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "upnexx.net"
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-upnexx-tenant-slug");
  requestHeaders.delete("x-upnexx-tenant-host");
  if (tenant?.source === "subdomain") {
    requestHeaders.set("x-upnexx-tenant-slug", tenant.slug);
    requestHeaders.set("x-upnexx-tenant-host", host);
  }

  let destination: URL | null = null;
  if (tenant?.source === "subdomain" && (
    tenantPublicPaths.has(request.nextUrl.pathname) ||
    ["/episodes/", "/courses/", "/events/", "/resources/"].some((prefix) => request.nextUrl.pathname.startsWith(prefix))
  )) {
    destination = request.nextUrl.clone();
    destination.pathname = `/demo/${tenant.slug}${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const responseForRequest = () => destination
    ? NextResponse.rewrite(destination, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
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
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"]
};
