import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { resolveLegalDocument } from "@/lib/legal";
export default async function TermsPage({ searchParams }: { searchParams: Promise<{ tenant?: string }> }) { const { tenant } = await searchParams; return <LegalDocumentPage document={await resolveLegalDocument("terms", tenant)} />; }
