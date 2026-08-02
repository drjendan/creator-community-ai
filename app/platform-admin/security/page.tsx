import { notFound } from "next/navigation";
import { PlatformSecurityEvents } from "@/components/platform/PlatformSecurityEvents";
import { getPlatformAdministrator } from "@/lib/platform-context";
export default async function PlatformSecurityPage() { if (!(await getPlatformAdministrator("platform.audit.view"))) notFound(); return <PlatformSecurityEvents />; }
