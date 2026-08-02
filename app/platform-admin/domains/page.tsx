import { notFound } from "next/navigation";
import { PlatformCustomDomains } from "@/components/platform/PlatformCustomDomains";
import { getPlatformAdministrator } from "@/lib/platform-context";

export default async function PlatformDomainsPage() {
  if (!(await getPlatformAdministrator("platform.audit.view"))) notFound();
  return <PlatformCustomDomains />;
}
