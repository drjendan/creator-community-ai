import { notFound } from "next/navigation";
import { PlatformTeamManager } from "@/components/platform/PlatformTeamManager";
import { getPlatformAdministrator } from "@/lib/platform-context";

export default async function PlatformTeamPage() {
  if (!(await getPlatformAdministrator("platform.team.view"))) notFound();
  return <PlatformTeamManager />;
}
