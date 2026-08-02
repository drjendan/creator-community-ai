import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { resolveLegalDocument } from "@/lib/legal";
export default async function CookiesPage() { return <LegalDocumentPage document={await resolveLegalDocument("cookies")} />; }
