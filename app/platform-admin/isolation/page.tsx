import { notFound } from "next/navigation";
import { PlatformIsolationVerification } from "@/components/platform/PlatformIsolationVerification";
import { getPlatformAdministrator } from "@/lib/platform-context";

export default async function PlatformIsolationPage() {
  if (!(await getPlatformAdministrator("platform.audit.view"))) notFound();
  return <PlatformIsolationVerification />;
}
