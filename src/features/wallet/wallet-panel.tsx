"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow, Button } from "@/components/ui/button";
import { Status } from "@/components/ui/status";
import { network } from "@/config/network";
import { displayAmount } from "@/utils/amount";
import { accountUrl, transactionUrl } from "@/services/stellar/transactions";
import { useWallet } from "./provider";

const progress = {
  connecting: "Open Freighter to approve the connection.",
  refreshing: "Checking your account on Testnet…",
  preparing: "Checking the network fee and account reserve…",
  signing: "Review and sign the USDC request in Freighter.",
  submitting: "Waiting for the Stellar transaction result…",
};
const accessLabels = {
  missing: "Not enabled",
  authorized: "Active",
  restricted: "Issuer authorization required",
  full: "Trustline limit reached",
};

export function WalletStatus() {
  const { state } = useWallet();
  return (
    <Status tone={state.address ? "ready" : "neutral"}>
      {state.address ? "Testnet wallet connected" : "Wallet not connected"}
    </Status>
  );
}

export function WalletConnection() {
  const { state, controller } = useWallet();
  return (
    <div className="wallet-connection">
      <Button
        variant="secondary"
        disabled={!!state.busy}
        onClick={state.address ? controller.disconnect : controller.connect}
      >
        {state.address
          ? "Disconnect wallet"
          : state.busy === "connecting"
            ? "Connecting…"
            : "Connect Freighter"}
      </Button>
      {state.address && (
        <p className="field-hint wallet-address">{state.address}</p>
      )}
      {state.error && (
        <p className="field-error" role="alert">
          {state.error.message}
        </p>
      )}
    </div>
  );
}

export function WalletPanel() {
  const { state, controller } = useWallet();
  const [copyMessage, setCopyMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = !!state.busy;
  const pending = state.receipt?.state === "pending";
  useEffect(() => {
    if (state.quote && !dialog.current?.open) {
      dialog.current?.showModal();
      dialog.current?.querySelector<HTMLElement>("#trustline-title")?.focus();
    }
    if (!state.quote && dialog.current?.open) dialog.current.close();
  }, [state.quote]);

  async function copyAddress() {
    if (!state.address) return;
    try {
      await navigator.clipboard.writeText(state.address);
      setCopyMessage("Address copied.");
    } catch {
      setCopyMessage("Copy unavailable. Select the address above to copy it.");
    }
  }

  return (
    <aside className="wallet-panel" aria-labelledby="wallet-heading">
      <p className="eyebrow">• Your Stellar wallet</p>
      <h2 id="wallet-heading">
        A balance for
        <br />
        what comes next.
      </h2>
      {state.address && (
        <div className="connected-wallet">
          <Status tone="ready">Freighter · Testnet</Status>
          <code className="wallet-address">{state.address}</code>
          <div className="wallet-inline-actions">
            <button onClick={copyAddress}>Copy address</button>
            <a
              href={accountUrl(state.address)}
              target="_blank"
              rel="noreferrer"
            >
              View account ↗
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
          <p role="status" className="field-hint">
            {copyMessage}
          </p>
        </div>
      )}
      <dl className="balance-list">
        <div>
          <dt>
            XLM <span>Network balance</span>
          </dt>
          <dd
            aria-label={
              state.account
                ? `XLM balance ${state.account.xlm}`
                : "XLM balance unavailable"
            }
          >
            {state.account ? displayAmount(state.account.xlm) : "—"}
          </dd>
        </div>
        <div>
          <dt>
            USDC <span>Payment balance</span>
          </dt>
          <dd
            aria-label={
              state.account?.usdc != null
                ? `USDC balance ${state.account.usdc}`
                : "USDC balance unavailable"
            }
          >
            {state.account?.usdc != null
              ? displayAmount(state.account.usdc)
              : "—"}
          </dd>
        </div>
      </dl>
      <div className="trustline-row">
        <span>USDC access</span>
        <span>
          {state.account
            ? accessLabels[state.account.usdcAccess]
            : "Not checked"}
        </span>
      </div>

      {!state.address && (
        <>
          <Button
            className="full-width"
            disabled={busy}
            onClick={controller.connect}
          >
            {state.busy === "connecting" ? "Connecting…" : "Connect Freighter"}{" "}
            <Arrow />
          </Button>
          <p className="field-hint wallet-help">
            Connect a Freighter browser extension account on Testnet. Your keys
            stay in your wallet.
          </p>
        </>
      )}
      {state.accountMissing && (
        <div className="wallet-notice">
          <h3>Activate your Testnet account.</h3>
          <p>
            The address is connected, but it has no account on Testnet yet. Open
            the test faucet, then refresh.
          </p>
          <a
            className="inline-link"
            href={`${network.friendbotUrl}?addr=${encodeURIComponent(state.address!)}`}
            target="_blank"
            rel="noreferrer"
          >
            Get test XLM <Arrow diagonal />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <p className="field-hint">
            Friendbot provides test funds, not real money.
          </p>
        </div>
      )}
      {state.account?.usdcAccess === "missing" && !state.quote && (
        <>
          <Button
            className="full-width"
            onClick={controller.prepare}
            disabled={busy || pending}
          >
            Enable USDC <Arrow />
          </Button>
          <p className="field-hint wallet-help">
            Allow this account to receive Testnet USDC. Review the reserve and
            fee before signing.
          </p>
        </>
      )}
      {state.account?.usdcAccess === "authorized" && (
        <p className="field-hint">
          Your account can receive USDC from the configured Testnet issuer. TRY
          funding is available through the sandbox Anchor in the student workspace.
        </p>
      )}
      {state.account?.usdcAccess === "restricted" && (
        <p className="field-error">
          The trustline exists, but the issuer has restricted it. A new
          trustline request will not remove that restriction.
        </p>
      )}
      {state.account?.usdcAccess === "full" && (
        <p className="field-error">
          Your trustline has no remaining receiving capacity. Review its balance
          and open offers in your wallet.
        </p>
      )}
      <div className="wallet-progress" role="status" aria-live="polite">
        {state.busy ? progress[state.busy] : ""}
      </div>
      {state.error && (
        <div className="wallet-notice wallet-notice--error" role="alert">
          <p>{state.error.message}</p>
          {state.error.code === "WALLET_MISSING" && (
            <a
              href="https://www.freighter.app"
              target="_blank"
              rel="noreferrer"
              className="inline-link"
            >
              Get Freighter <Arrow diagonal />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      )}
      {state.receipt && (
        <div className="wallet-receipt">
          <Status
            tone={
              state.receipt.state === "confirmed"
                ? "ready"
                : state.receipt.state === "failed"
                  ? "error"
                  : "pending"
            }
          >
            {state.receipt.state === "confirmed"
              ? "Trustline transaction confirmed"
              : state.receipt.state === "failed"
                ? "Transaction not completed"
                : "Result not confirmed yet"}
          </Status>
          {state.receipt.message && <p>{state.receipt.message}</p>}
          <a
            href={transactionUrl(state.receipt.hash)}
            target="_blank"
            rel="noreferrer"
            className="wallet-hash"
          >
            {state.receipt.hash}
            <span className="sr-only">
              {" "}
              — View transaction (opens in a new tab)
            </span>
          </a>
          {pending && (
            <p>
              Automatic checks are limited. Use “Refresh status” to check again;
              avoid creating another request while this one is unresolved.
            </p>
          )}
        </div>
      )}
      {state.address && (
        <div className="wallet-footer-actions">
          <Button
            variant="secondary"
            onClick={controller.refresh}
            disabled={busy}
          >
            Refresh status
          </Button>
          <Button
            variant="text"
            onClick={controller.disconnect}
            disabled={busy}
          >
            Disconnect
          </Button>
        </div>
      )}

      <dialog
        ref={dialog}
        className="trustline-dialog"
        aria-labelledby="trustline-title"
        aria-describedby="trustline-description"
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else controller.cancelQuote();
        }}
      >
        {state.quote && (
          <>
            <p className="eyebrow">• Review USDC access</p>
            <h2 id="trustline-title" tabIndex={-1}>
              Let your wallet receive USDC.
            </h2>
            <p id="trustline-description">
              This adds a trustline. It does not buy USDC or send a deposit.
            </p>
            <dl className="trustline-details">
              <div>
                <dt>Network</dt>
                <dd>Stellar Testnet</dd>
              </div>
              <div>
                <dt>Additional XLM reserve</dt>
                <dd>{displayAmount(state.quote.reserve)} XLM</dd>
              </div>
              <div>
                <dt>Maximum network fee</dt>
                <dd>{displayAmount(state.quote.fee)} XLM</dd>
              </div>
              <div>
                <dt>USDC holding limit</dt>
                <dd>{displayAmount(state.quote.limit)} USDC</dd>
              </div>
            </dl>
            <p className="field-hint">
              The reserve stays in your account while the trustline exists. The
              network fee is spent when the transaction is included.
            </p>
            <p className="eyebrow issuer-label">USDC issuer</p>
            <code className="wallet-address">{network.assetIssuer}</code>
            <div className="dialog-actions">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={controller.cancelQuote}
              >
                Cancel
              </Button>
              <Button onClick={controller.confirm} disabled={busy}>
                {state.busy === "signing"
                  ? "Waiting for signature…"
                  : "Sign with Freighter"}
              </Button>
            </div>
            <p role="status" className="field-hint">
              {state.busy
                ? progress[state.busy]
                : "Your wallet will ask for approval. No private key is shared."}
            </p>
          </>
        )}
      </dialog>
    </aside>
  );
}
