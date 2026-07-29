import { Suspense } from "react";
import { InvitationAcceptance } from "@/components/dashboard/InvitationAcceptance";

export default function AcceptInvitationPage() {
  return (
    <Suspense>
      <InvitationAcceptance />
    </Suspense>
  );
}
