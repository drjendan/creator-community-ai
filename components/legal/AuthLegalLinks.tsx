import Link from "next/link";
import { copyrightText } from "@/lib/terminology";

export function AuthLegalLinks() {
  return (
    <footer className="mt-6 border-t border-brand-200 pt-5 text-center text-xs leading-5 text-brand-500">
      <p>By using UpNexx, you agree to the Terms of Service and acknowledge the Privacy Policy.</p>
      <nav className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 font-semibold text-accent-700" aria-label="Authentication legal links">
        <Link href="/terms" className="hover:underline">Terms</Link>
        <Link href="/privacy" className="hover:underline">Privacy</Link>
        <Link href="/cookies" className="hover:underline">Cookies</Link>
        <Link href="/acceptable-use" className="hover:underline">Acceptable Use</Link>
      </nav>
      <p className="mt-3">{copyrightText}</p>
    </footer>
  );
}
