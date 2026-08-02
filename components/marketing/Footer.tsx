import { Container } from "@/components/ui";
import type { LandingContent } from "@/lib/landing-content";
import { AppFooter } from "@/components/layout/AppFooter";

export function Footer({
  tenant,
  footer
}: Pick<LandingContent, "tenant" | "footer">) {
  return (
    <>
    <section className="border-t border-brand-200 bg-brand-50 py-12" aria-label="Website footer links">
      <Container className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-lg font-semibold text-brand-900">{tenant.name}</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-brand-700">{footer.tagline}</p>
        </div>
        {footer.columns.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-500">
              {col.title}
            </p>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-brand-700 transition-colors hover:text-brand-900">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <Container className="mt-10 border-t border-brand-200 pt-6">
        <p className="text-xs text-brand-500">{footer.platformNote}</p>
      </Container>
    </section>
    <AppFooter />
    </>
  );
}
