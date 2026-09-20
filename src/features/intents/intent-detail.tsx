"use client";

import { useEffect } from "react";
import { AsyncState } from "@/components/feedback/async-state";
import { ButtonLink, Arrow } from "@/components/ui/button";
import { Status, type StatusTone } from "@/components/ui/status";
import { network } from "@/config/network";
import { displayAmount } from "@/utils/amount";
import { transactionUrl } from "@/services/soroban/intents";
import { useWallet } from "@/features/wallet/provider";
import { useIntents } from "./provider";
import { IntentRow } from "./intent-row";
import type { PaymentIntent } from "@/services/soroban/types";

const STATUS_TONE: Record<PaymentIntent["status"], StatusTone> = {
  Created: "neutral",
  Funded: "pending",
  Released: "ready",
  Refunded: "attention",
};

export function IntentDetail({ intentId }: { intentId: string }) {
  const { state: wallet } = useWallet();
  const { state: intents, controller } = useIntents();
  const intent = intents.intents[intentId];

  useEffect(() => {
    if (wallet.address) void controller.loadOne(intentId, wallet.address);
  }, [intentId, wallet.address, controller]);

  if (!wallet.address)
    return (
      <AsyncState
        title="Connect your wallet to view this request."
        action={
          <ButtonLink href="/student" variant="secondary">
            Go to your workspace <Arrow />
          </ButtonLink>
        }
      >
        <p>
          Reading a payment request requires a connected Testnet wallet — the
          contract state is read live, not stored by this app.
        </p>
      </AsyncState>
    );

  if (intents.error && !intent) return <AsyncState kind="error" title="Could not load request."><p>{intents.error.message}</p></AsyncState>;
  if (!intent && !intents.loadedIds.includes(intentId)) return <AsyncState kind="loading" title="Loading request…"><p>Reading its current state from Stellar Testnet.</p></AsyncState>;
  if (!intent)
    return (
      <AsyncState
        title="Payment request not found."
        action={
          <ButtonLink href="/student" variant="secondary">
            Back to your workspace <Arrow />
          </ButtonLink>
        }
      >
        <p>
          No request with this reference was returned by the contract.
        </p>
      </AsyncState>
    );

  const role =
    intent.student === wallet.address
      ? "student"
      : intent.institution === wallet.address
        ? "institution"
        : null;

  return (
    <div className="intent-detail">
      <div className="intent-row-top">
        <Status tone={STATUS_TONE[intent.status]}>{intent.status}</Status>
        {intent.resolution !== "Pending" && (
          <span className="subtle-label">{intent.resolution}</span>
        )}
      </div>
      <dl className="trustline-details">
        <div>
          <dt>Amount</dt>
          <dd>{displayAmount(intent.amount)} {intent.token === network.assetContractId ? "USDC" : "token units"}</dd>
        </div>
        <div>
          <dt>Institution</dt>
          <dd className="mono-value">{intent.institution}</dd>
        </div>
        <div>
          <dt>Student</dt>
          <dd className="mono-value">{intent.student}</dd>
        </div>
        <div>
          <dt>Token contract</dt>
          <dd className="mono-value">{intent.token}</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{new Date(intent.deadline * 1000).toLocaleString()}</dd>
        </div>
      </dl>
      <p className="field-hint">
        Approved → released to the institution. Rejected, or unresolved past
        the deadline → refunded to the student. The contract does not verify
        the institution&rsquo;s real-world decision, only that an authorized
        decision moves the funds correctly.
      </p>
      {role ? (
        <ul className="intent-list">
          <IntentRow intent={intent} viewerAddress={wallet.address} />
        </ul>
      ) : (
        <p className="field-hint">
          This wallet is neither the student nor the institution on this
          request, so no action is available here.
        </p>
      )}
      {intents.receipt?.id === intentId && intents.receipt.state === "confirmed" && (
        <a
          className="wallet-hash"
          href={transactionUrl(intents.receipt.hash)}
          target="_blank"
          rel="noreferrer"
        >
          {intents.receipt.hash}
          <span className="sr-only"> — View transaction (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}
