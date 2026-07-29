import { notFound } from "next/navigation";
import { PlatformBrandingManager } from "@/components/platform/PlatformBrandingManager";

export default async function PlatformSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "platform-settings") return <PlatformBrandingManager />;
  notFound();
}
