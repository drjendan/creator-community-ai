import Link from "next/link";
import { Container } from "@/components/ui";
import { cn } from "@/lib/cn";
import { copyrightText } from "@/lib/terminology";

export function AppFooter({
  tenantName,
  tenantTagline,
  tenantSlug,
  variant = "light"
}: {
  tenantName?: string;
  tenantTagline?: string;
  tenantSlug?: string;
  variant?: "light" | "dark";
}) {
  const dark = variant === "dark";
  const tenantQuery = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return (
    <footer
      className={cn(
        "border-t py-7",
        dark ? "border-white/10 bg-brand-900 text-brand-200" : "border-brand-200 bg-white text-brand-600"
      )}
    >
      <Container className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          {tenantName && <p className={cn("font-display text-base font-bold", dark ? "text-white" : "text-brand-900")}>{tenantName}</p>}
          {tenantTagline && <p className="mt-1 text-xs">{tenantTagline}</p>}
          <p className={cn("text-xs", tenantName && "mt-2")}>{copyrightText}</p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold" aria-label="Legal links">
          <Link href={`/terms${tenantQuery}`} className="hover:underline">Terms</Link>
          <Link href={`/privacy${tenantQuery}`} className="hover:underline">Privacy</Link>
          {tenantSlug && <Link href={`/refund${tenantQuery}`} className="hover:underline">Refunds</Link>}
          <Link href="/cookies" className="hover:underline">Cookies</Link>
          <Link href="/acceptable-use" className="hover:underline">Acceptable Use</Link>
        </nav>
      </Container>
    </footer>
  );
}
