"use client";

import { useState, type FormEvent } from "react";
import { Arrow, Button } from "@/components/ui/button";
import { Status } from "@/components/ui/status";
import { FormField } from "@/components/ui/form-field";
import { network } from "@/config/network";
import { displayAmount } from "@/utils/amount";
import { transactionUrl } from "@/services/stellar/transactions";
import { useWallet } from "@/features/wallet/provider";
import { useAnchor } from "./provider";

const progress: Record<string, string> = {
  discovering: "Reading the anchor's published configuration…",
  authenticating: "Sign the authentication request in Freighter.",
  "loading-info": "Checking what the anchor currently supports…",
  quoting: "Locking today's TRY → USDC rate…",
  depositing: "Requesting your deposit reference…",
  simulating: "Simulating the sandbox bank transfer…",
  polling: "Checking the deposit status…",
};

const statusLabels: Record<string, string> = {
  pending_user_transfer_start: "Waiting for the TRY transfer",
  pending_anchor: "TRY received, anchor is preparing USDC",
  pending_trust: "Waiting for a USDC trustline",
  pending_external: "Waiting on an external step",
  completed: "Anchor reports settlement completed",
  refunded: "Anchor reports a sandbox refund",
  expired: "This deposit expired",
  error: "The anchor reported an error",
  incomplete: "Waiting for more information",
};

export function AnchorConnection() {
  const { state: wallet } = useWallet();
  const { state: anchor, controller } = useAnchor();
  const ready = wallet.account?.usdcAccess === "authorized" || wallet.account?.usdcAccess === "full";
  const busy = !!anchor.busy;

  if (!wallet.address) return null;

  return (
    <div className="anchor-connect">
      <div className="list-heading">
        <h2>TR Mock Anchor</h2>
        <Status tone={anchor.session ? "ready" : "neutral"}>
          {anchor.session ? "Anchor session active" : "Not connected to the anchor"}
        </Status>
      </div>
      {!ready && (
        <p className="field-hint">
          Enable USDC on your wallet above before connecting to the anchor.
        </p>
      )}
      {ready && !anchor.session && (
        <>
          <Button disabled={busy} onClick={() => controller.connect(wallet.address)}>
            {busy ? "Connecting…" : "Connect to TR Mock Anchor"} <Arrow />
          </Button>
          <p className="field-hint wallet-help">
            This signs a SEP-10 authentication request with Freighter. It does
            not move any funds.
          </p>
        </>
      )}
      {anchor.session && anchor.info && (
        <p className="field-hint wallet-help">
          The anchor accepts USDC deposits funded by Turkish bank transfer
          (sandbox only), with a {anchor.info.feePercent}% spread fee.
        </p>
      )}
      <div className="wallet-progress" role="status" aria-live="polite">
        {anchor.busy ? progress[anchor.busy] : ""}
      </div>
      {anchor.error && (
        <div className="wallet-notice wallet-notice--error" role="alert">
          <p>{anchor.error.message}</p>
        </div>
      )}
    </div>
  );
}

export function AnchorFundingFlow() {
  const { state: wallet } = useWallet();
  const { state: anchor, controller } = useAnchor();
  const [amount, setAmount] = useState("100.00");
  const [copyMessage, setCopyMessage] = useState("");
  const busy = !!anchor.busy;



  if (!anchor.session || !wallet.address) return null;

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copied.`);
    } catch {
      setCopyMessage(`Copy unavailable. Select the ${label.toLowerCase()} to copy it.`);
    }
  }

  function submitQuote(event: FormEvent) {
    event.preventDefault();
    void controller.requestQuote(amount);
  }

  const transaction = anchor.transaction;
  const terminal = transaction
    ? ["completed", "error", "refunded", "expired"].includes(transaction.status)
    : false;

  return (
    <div className="funding-flow">
      <h3>Fund with TRY</h3>
      <p className="field-hint">
        Sandbox only. This simulates a Turkish bank transfer on Stellar
        Testnet — no real TRY or bank account is involved.
      </p>

      {anchor.depositUncertain && <p role="alert" className="field-error">The deposit request had no confirmed response. Check Anchor activity before requesting another deposit; do not repeat a transfer.</p>}
      {!anchor.quote && !anchor.deposit && !anchor.depositUncertain && (
        <form onSubmit={submitQuote} className="quote-form">
          <FormField
            id="try-amount"
            label="Amount in TRY"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={busy}
            hint="Up to 2 decimal places."
          />
          <Button type="submit" disabled={busy}>
            {anchor.busy === "quoting" ? "Getting quote…" : "Get quote"} <Arrow />
          </Button>
        </form>
      )}

      {anchor.quote && !anchor.deposit && (
        <div className="quote-summary">
          <dl className="trustline-details">
            <div>
              <dt>You send</dt>
              <dd>{anchor.quote.sellAmount} TRY</dd>
            </div>
            <div>
              <dt>You receive</dt>
              <dd>{displayAmount(anchor.quote.buyAmount)} USDC</dd>
            </div>
            <div>
              <dt>Anchor fee</dt>
              <dd>
                {anchor.quote.feeAmount} {anchor.quote.feeAsset.split(":")[0]}
              </dd>
            </div>
            <div>
              <dt>Quote expires</dt>
              <dd>{new Date(anchor.quote.expiresAt).toLocaleTimeString()}</dd>
            </div>
          </dl>
          <div className="dialog-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void controller.requestQuote(amount)}
            >
              Refresh quote
            </Button>
            <Button
              disabled={busy}
              onClick={() => void controller.startDeposit(wallet.address!)}
            >
              {anchor.busy === "depositing" ? "Requesting…" : "Continue to deposit"}
            </Button>
          </div>
        </div>
      )}

      {anchor.deposit && (
        <div className="deposit-instructions">
          <p className="eyebrow">• Sandbox bank transfer instructions</p>
          <dl className="trustline-details">
            <div>
              <dt>Bank</dt>
              <dd>{anchor.deposit.bankName ?? "—"}</dd>
            </div>
            <div>
              <dt>IBAN</dt>
              <dd className="mono-value">
                {anchor.deposit.ibanOrAccount ?? "—"}
                {anchor.deposit.ibanOrAccount && (
                  <button
                    type="button"
                    className="inline-copy"
                    onClick={() => void copy(anchor.deposit!.ibanOrAccount!, "IBAN")}
                  >
                    Copy
                  </button>
                )}
              </dd>
            </div>
            <div>
              <dt>Transfer description (reference)</dt>
              <dd className="mono-value">
                {anchor.deposit.transferMemo ?? "—"}
                {anchor.deposit.transferMemo && (
                  <button
                    type="button"
                    className="inline-copy"
                    onClick={() => void copy(anchor.deposit!.transferMemo!, "Reference")}
                  >
                    Copy
                  </button>
                )}
              </dd>
            </div>
          </dl>
          <p role="status" className="field-hint">
            {copyMessage}
          </p>

          {!anchor.simulationAttempted && (!transaction || transaction.status === "pending_user_transfer_start") && (
            <>
              <Button disabled={busy} onClick={() => void controller.simulateBankTransfer()}>
                {anchor.busy === "simulating" ? "Simulating…" : "Simulate bank transfer (sandbox)"}{" "}
                <Arrow />
              </Button>
              <p className="field-hint wallet-help">
                A real bank transfer never happens here. This sandbox action
                stands in for the TRY arriving, so the anchor can pay out
                Testnet USDC.
              </p>
            </>
          )}

          {anchor.simulationAttempted && !transaction && <Button variant="secondary" disabled={busy} onClick={() => void controller.checkTransaction()}>Check transfer status</Button>}
          {transaction && (
            <div className="anchor-transaction-status">
              <Status
                tone={
                  transaction.status === "completed"
                    ? "ready"
                    : transaction.status === "error" || transaction.status === "expired"
                      ? "error"
                      : "pending"
                }
              >
                {statusLabels[transaction.status] ?? transaction.status}
              </Status>
              {transaction.status === "completed" && transaction.stellarTransactionId && (
                <a
                  className="wallet-hash"
                  href={transactionUrl(transaction.stellarTransactionId)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {transaction.stellarTransactionId}
                  <span className="sr-only"> — View transaction (opens in a new tab)</span>
                </a>
              )}
              {terminal && <Button variant="secondary" disabled={busy} onClick={controller.clearCompleted}>Start another deposit</Button>}
              {!terminal && (
                <>
                  <p className="field-hint">
                    Automatic checks are limited. Settlement has not been confirmed. Check again or inspect Anchor activity; do not repeat a bank transfer based only on a timeout.
                  </p>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void controller.checkTransaction()}
                  >
                    Check status again
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="wallet-progress" role="status" aria-live="polite">
        {anchor.busy ? progress[anchor.busy] : ""}
      </div>
      {anchor.error && (
        <div className="wallet-notice wallet-notice--error" role="alert">
          <p>{anchor.error.message}</p>
        </div>
      )}
      <p className="field-hint">Network: {network.label}.</p>
    </div>
  );
}
