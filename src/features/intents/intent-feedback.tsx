"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useIntents } from "./provider";
import { transactionUrl } from "@/services/soroban/intents";

const labels: Record<string, string> = {
  creating: "Create this payment request", funding: "Fund this request",
  approving: "Approve and release", rejecting: "Reject and refund", claiming: "Claim deadline refund",
};
const effects: Record<string, string> = {
  creating: "Creates terms on-chain. No USDC moves until the student signs a separate funding transaction.",
  funding: "Transfers your USDC into the contract. The institution may release it before the deadline; rejection or a deadline claim returns it to you.",
  approving: "Transfers the held USDC to the institution and permanently closes this request. It cannot be refunded through this intent afterward.",
  rejecting: "Returns the held USDC to the student and permanently closes this request.",
  claiming: "Returns the held USDC to the student after the deadline and permanently closes this request.",
};

export function IntentFeedback() {
  const { state, controller } = useIntents();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const review = state.review;
  useEffect(() => {
    if (!review) { dialog.current?.close(); return; }
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal(); heading.current?.focus();
    return () => { element?.close(); previous?.focus(); };
  }, [review]);
  return <>
    {state.receipts.some(r => r.state === "pending") && <aside className="release-notice" aria-label="Pending contract transactions">
      <p>A contract transaction needs confirmation. Check its result before starting another.</p>
      {state.receipts.filter(r => r.state === "pending").map(r => <div className="receipt-actions" key={r.hash}>
        <a href={transactionUrl(r.hash)} target="_blank" rel="noreferrer" className="wallet-hash">{r.hash}</a>
        <Button variant="secondary" disabled={!!state.busy} onClick={() => void controller.checkReceipt(r.hash)}>Check transaction</Button>
      </div>)}
    </aside>}
    <dialog ref={dialog} className="trustline-dialog" aria-labelledby="intent-review-heading" onCancel={event => { event.preventDefault(); controller.cancelReview(); }}>
      {review && <>
        <p className="eyebrow">Stellar Testnet · Review transaction</p>
        <h2 id="intent-review-heading" ref={heading} tabIndex={-1}>{labels[review.action]}</h2>
        <p>{effects[review.action]}</p>
        <dl className="trustline-details">
          <div><dt>Exact amount</dt><dd>{review.amount} USDC</dd></div>
          <div><dt>{review.action === "creating" ? "Institution" : "Recipient"}</dt><dd className="mono-value">{review.recipient}</dd></div>
          <div><dt>Signing wallet</dt><dd className="mono-value">{review.signer}</dd></div>
          <div><dt>Decision deadline</dt><dd>{new Date(review.deadline * 1000).toLocaleString()}</dd></div>
          <div><dt>Maximum network fee</dt><dd>{review.invocation.fee ?? "See wallet"} XLM</dd></div>
        </dl>
        {state.error && <p role="alert" className="field-error">{state.error.message}</p>}
        <div className="dialog-actions">
          <Button variant="secondary" disabled={!!state.busy} onClick={controller.cancelReview}>Cancel</Button>
          <Button disabled={!!state.busy} onClick={() => void controller.confirm()}>{state.busy ? "Waiting for wallet…" : "Confirm in Freighter"}</Button>
        </div>
      </>}
    </dialog>
  </>;
}
