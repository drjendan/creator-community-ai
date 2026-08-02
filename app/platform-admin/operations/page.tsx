import { notFound } from "next/navigation";
import { PlatformOperationalReadiness } from "@/components/platform/PlatformOperationalReadiness";
import { getPlatformAdministrator } from "@/lib/platform-context";

export default async function PlatformOperationsPage() {
  if (!(await getPlatformAdministrator("platform.audit.view"))) notFound();
  return <PlatformOperationalReadiness />;
}
