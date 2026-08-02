import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { resolveLegalDocument } from "@/lib/legal";
export default async function AcceptableUsePage() { return <LegalDocumentPage document={await resolveLegalDocument("acceptable_use")} />; }
