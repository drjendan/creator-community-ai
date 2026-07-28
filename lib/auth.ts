import type { Role } from "@/lib/mock/podcastos";
import { canManageTenant, isPlatformAdmin } from "@/lib/access-control";

export function canAccessRoute(pathname: string, role: Role | null) {
  if (pathname.startsWith("/platform-admin")) return role ? isPlatformAdmin(role) : false;
  if (pathname.startsWith("/dashboard")) return role ? canManageTenant(role) : false;
  if (pathname.includes("/member")) return role !== null && role !== "guest";
  return true;
}

export function redirectForUnauthorized(pathname: string) {
  return `/login?next=${encodeURIComponent(pathname)}`;
}
