"use client";

import { Button } from "@/components/ui/button";
import { useWallet } from "@/features/wallet/provider";
import { useIntents } from "@/features/intents/provider";
import { IntentList } from "@/features/intents/intent-list";

export function InstitutionRequests() {
  const { state: wallet } = useWallet();
  const { state: intents, controller } = useIntents();
  if (!wallet.address)
    return (
      <p className="field-hint">
        Connect your institution&rsquo;s wallet to see your requests.
      </p>
    );
  return (
    <>
    <Button variant="text" disabled={!!intents.busy || !!intents.review} onClick={() => void controller.refresh(wallet.address)}>Refresh requests</Button>
    <IntentList
      ids={intents.institutionIntentIds}
      viewerAddress={wallet.address}
      emptyTitle="No requests yet."
      emptyBody="Requests your institution creates will appear here, read live from the contract."
    />
    </>
  );
}
