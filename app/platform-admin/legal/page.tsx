import { LegalCenterEditor } from "@/components/legal/LegalCenterEditor";
import { notFound } from "next/navigation";
import { getPlatformAdministrator } from "@/lib/platform-context";

export default async function PlatformLegalCenterPage() {
  if (!(await getPlatformAdministrator("platform.content.manage"))) notFound();
  return <LegalCenterEditor scope="platform" />;
}
