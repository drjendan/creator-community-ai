import { notFound } from "next/navigation";
import { PlatformQualityVerification } from "@/components/platform/PlatformQualityVerification";
import { getPlatformAdministrator } from "@/lib/platform-context";
export default async function PlatformQualityPage() { if (!(await getPlatformAdministrator("platform.audit.view"))) notFound(); return <PlatformQualityVerification />; }
