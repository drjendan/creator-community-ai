import { notFound } from "next/navigation";
import { PlatformProductionReleases } from "@/components/platform/PlatformProductionReleases";
import { getPlatformAdministrator } from "@/lib/platform-context";

export default async function PlatformReleasesPage() {
  if (!(await getPlatformAdministrator("platform.audit.view"))) notFound();
  return <PlatformProductionReleases />;
}
