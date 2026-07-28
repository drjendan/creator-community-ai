import { Badge } from "@/components/ui";
import { EpisodeStatus } from "@/lib/mock/podcastos";

const toneMap: Record<EpisodeStatus, "success" | "warning" | "info"> = {
  published: "success",
  draft: "warning",
  scheduled: "info"
};

export function EpisodeStatusBadge({ status }: { status: EpisodeStatus }) {
  return <Badge tone={toneMap[status]}>{status}</Badge>;
}
