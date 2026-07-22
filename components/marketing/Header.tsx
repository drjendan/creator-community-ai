import Link from "next/link";
import { Button, Container } from "@/components/ui";
import type { LandingContent } from "@/lib/landing-content";

export function Header({ tenant, nav }: Pick<LandingContent, "tenant" | "nav">) {
  return (
    <header className="border-b border-brand-200/70 bg-brand-50/80 backdrop-blur">
      <Container className="flex items-center justify-between gap-6 py-4">
        <Link href="/" className="font-display text-lg font-semibold text-brand-900">
          {tenant.name}
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-7 text-sm font-medium text-brand-700 md:flex">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-brand-900">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button href="/join" size="sm">
            Join
          </Button>
        </div>
      </Container>
    </header>
  );
}
