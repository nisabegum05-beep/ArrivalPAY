"use client";

import { Button } from "@/components/ui/button";
import { useWallet } from "@/features/wallet/provider";
import { useIntents } from "./provider";
import { IntentList } from "./intent-list";

export function StudentDeposits() {
  const { state: wallet } = useWallet();
  const { state: intents, controller } = useIntents();
  if (!wallet.address)
    return (
      <p className="field-hint">
        Connect your wallet above to see enrollment deposits assigned to you.
      </p>
    );
  return (
    <>
    <Button variant="text" disabled={!!intents.busy || !!intents.review} onClick={() => void controller.refresh(wallet.address)}>Refresh requests</Button>
    <IntentList
      ids={intents.studentIntentIds}
      viewerAddress={wallet.address}
      emptyTitle="Your enrollment journey starts here."
      emptyBody="Enrollment requests your institution creates for this wallet will appear here, read live from the contract, with the amount, deadline and refund conditions."
    />
    </>
  );
}
