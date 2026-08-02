import { AppFooter } from "@/components/layout/AppFooter";
import { Button, Container } from "@/components/ui";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-50">
      <main className="grid flex-1 place-items-center px-4 py-16">
        <Container>
          <div className="mx-auto max-w-xl text-center">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-accent-700">404</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-brand-900">Page Not Found</h1>
            <p className="mt-4 text-brand-600">The page may have moved, or your account may not have access to it.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button href="/">Go Home</Button>
              <Button href="/dashboard/support" variant="secondary">Contact Support</Button>
            </div>
          </div>
        </Container>
      </main>
      <AppFooter />
    </div>
  );
}
