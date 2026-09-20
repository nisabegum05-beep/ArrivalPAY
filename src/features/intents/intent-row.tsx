"use client";

import { network } from "@/config/network";
import { transactionUrl } from "@/services/soroban/intents";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Status, type StatusTone } from "@/components/ui/status";
import { displayAmount } from "@/utils/amount";
import { useIntents } from "./provider";
import { useNow } from "./use-now";
import type { PaymentIntent } from "@/services/soroban/types";

const STATUS_TONE: Record<PaymentIntent["status"], StatusTone> = {
  Created: "neutral",
  Funded: "pending",
  Released: "ready",
  Refunded: "attention",
};

const progress: Record<string, string> = {
  funding: "Sign the deposit in Freighter.",
  approving: "Sign the approval in Freighter.",
  rejecting: "Sign the rejection in Freighter.",
  claiming: "Sign the refund claim in Freighter.",
};

function formatDeadline(deadline: number) {
  return new Date(deadline * 1000).toLocaleString();
}

export function IntentRow({
  intent,
  viewerAddress,
}: {
  intent: PaymentIntent;
  viewerAddress: string;
}) {
  const { state, controller } = useIntents();
  const isStudent = intent.student === viewerAddress;
  const isInstitution = intent.institution === viewerAddress;
  const now = useNow();
  const deadlinePassed = now !== null && now / 1000 >= intent.deadline;
  const rowBusy = state.busy !== null && state.busyIntentId === intent.id;
  const anyBusy = state.busy !== null || !!state.review || state.receipts.some(r => r.state === "pending") || intent.token !== network.assetContractId;
  const receipt =
    state.receipt?.id === intent.id ? state.receipt : undefined;

  return (
    <li className="intent-row">
      <div className="intent-row-top">
        <Status tone={STATUS_TONE[intent.status]}>{intent.status}</Status>
        <Link href={`/intent/${intent.id}`} className="intent-row-id">
          {intent.id.slice(0, 8)}…{intent.id.slice(-6)}
        </Link>
      </div>
      <dl className="intent-row-body">
        <div>
          <dt>Amount</dt>
          <dd>{displayAmount(intent.amount)} {intent.token === network.assetContractId ? "USDC" : "token units"}</dd>
        </div>
        <div>
          <dt>{isInstitution ? "Student" : "Institution"}</dt>
          <dd className="mono-value">
            {isInstitution ? intent.student : intent.institution}
          </dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{formatDeadline(intent.deadline)}</dd>
        </div>
      </dl>
      {intent.token !== network.assetContractId && <p className="field-error">Unsupported token. Actions are disabled; this asset is not canonical Testnet USDC.</p>}

      {isStudent && intent.status === "Created" && !deadlinePassed && (
        <Button
          disabled={anyBusy}
          onClick={() => void controller.fund(intent.id, viewerAddress)}
        >
          {rowBusy && state.busy === "funding"
            ? "Funding…"
            : "Fund this request"}
        </Button>
      )}
      {isInstitution && intent.status === "Funded" && !deadlinePassed && (
        <div className="intent-row-actions">
          <Button
            disabled={anyBusy}
            onClick={() => void controller.approve(intent.id, viewerAddress)}
          >
            {rowBusy && state.busy === "approving"
              ? "Approving…"
              : "Approve and release"}
          </Button>
          <Button
            variant="secondary"
            disabled={anyBusy}
            onClick={() => void controller.reject(intent.id, viewerAddress)}
          >
            {rowBusy && state.busy === "rejecting"
              ? "Rejecting…"
              : "Reject and refund"}
          </Button>
        </div>
      )}
      {isInstitution && intent.status === "Funded" && deadlinePassed && (
        <div className="intent-row-actions">
          <Button
            variant="secondary"
            disabled={anyBusy}
            onClick={() => void controller.reject(intent.id, viewerAddress)}
          >
            {rowBusy && state.busy === "rejecting"
              ? "Rejecting…"
              : "Reject and refund"}
          </Button>
          <p className="field-hint">
            The deadline has passed — approval is closed; the student can
            also claim a refund directly.
          </p>
        </div>
      )}
      {isStudent && intent.status === "Funded" && deadlinePassed && (
        <Button
          variant="secondary"
          disabled={anyBusy}
          onClick={() =>
            void controller.claimTimeoutRefund(intent.id, viewerAddress)
          }
        >
          {rowBusy && state.busy === "claiming"
            ? "Claiming…"
            : "Claim refund"}
        </Button>
      )}

      {rowBusy && (
        <p className="wallet-progress" role="status" aria-live="polite">
          {state.busy ? progress[state.busy] : ""}
        </p>
      )}
      {isStudent && intent.status === "Created" && deadlinePassed && <p className="field-hint">This unfunded request expired. Ask the institution for a new request.</p>}
      {receipt && (
        <p className="field-hint">
          {receipt.state === "confirmed"
            ? "Confirmed."
            : receipt.state === "failed"
              ? "Not completed."
              : "Result not confirmed yet."}
        <a className="wallet-hash" href={transactionUrl(receipt.hash)} target="_blank" rel="noreferrer">View transaction ↗</a>
        </p>
      )}
    </li>
  );
}
