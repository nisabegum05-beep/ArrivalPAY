"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Status } from "@/components/ui/status";
import { network } from "@/config/network";
import { useWallet } from "@/features/wallet/provider";
import { WalletPanel } from "@/features/wallet/wallet-panel";
import { freighterAdapter, verifyIdentity } from "@/features/wallet/adapter";
import { safeError, StellarError } from "@/services/stellar/errors";
import { prepareArrivalPayment, checkArrivalPayment, findArrivalPayment } from "@/services/stellar/arrival-payment";
import { submitSignedTransaction, verifySignedTransaction, transactionUrl, type TransactionResult } from "@/services/stellar/transactions";
import { createRequest, parseRequestUrl, requestUrl, type ArrivalRequest } from "./request";

function message(error: unknown) {
  if (error instanceof StellarError) return error.message;
  if (error instanceof Error && !error.message.includes("Request failed") && !error.message.includes("fetch")) return error.message;
  return safeError(error).message;
}

function PayRequest({ request }: { request: ArrivalRequest }) {
  const { state: wallet, controller: walletController } = useWallet();
  const address = wallet.address!;
  const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof prepareArrivalPayment>> | null>(null);
  const [receipt, setReceipt] = useState<(TransactionResult & { expiresAt?: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true);
  const locked = useRef(false);
  const key = `arrivalpay:qr:${address}:${request.reference}`;
  const current = () => active.current && walletController.getSnapshot().address === address;
  const save = (value: TransactionResult & { expiresAt?: number }) => {
    if (current()) setReceipt(value);
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* public receipt; memory fallback */ }
  };
  useEffect(() => {
    active.current = true;
    Promise.resolve().then(() => {
      if (!active.current) return;
      try {
        const record = JSON.parse(sessionStorage.getItem(key) || "null");
        if (record && /^[a-f0-9]{64}$/.test(record.hash)) setReceipt({ hash: record.hash, state: "pending", expiresAt: Number.isSafeInteger(record.expiresAt) ? record.expiresAt : undefined });
      } catch { /* storage is untrusted */ }
      setHydrated(true);
    });
    return () => { active.current = false; };
  }, [key]);
  async function act(action: "prepare" | "sign" | "check") {
    if (locked.current || !hydrated) return;
    locked.current = true; setBusy(true); setError("");
    try {
      if (action === "check" && receipt) {
        const result = await checkArrivalPayment(request, receipt.hash, address, receipt.expiresAt);
        save({ ...result, expiresAt: receipt.expiresAt }); return;
      }
      if (receipt && receipt.state !== "failed") return;
      verifyIdentity(await freighterAdapter.identity(), address);
      if (!current()) return;
      if (action === "prepare") {
        const quote = await prepareArrivalPayment(request, address);
        if (current()) setPrepared(quote);
        return;
      }
      if (!prepared || Date.now() / 1000 >= prepared.expiresAt) throw new Error("This review expired. Prepare the payment again.");
      const signedXdr = await freighterAdapter.sign(prepared.xdr, address);
      if (!current()) return;
      verifyIdentity(await freighterAdapter.identity(), address);
      if (!current()) return;
      const signed = verifySignedTransaction(prepared.xdr, signedXdr, address);
      save({ hash: prepared.hash, state: "pending", expiresAt: prepared.expiresAt });
      const result = await submitSignedTransaction(signed);
      save({ ...result, expiresAt: prepared.expiresAt });
      if (current()) { setPrepared(null); if (result.state === "confirmed") void walletController.refresh(); }
    } catch (e) { if (current()) setError(message(e)); }
    finally { locked.current = false; if (current()) setBusy(false); }
  }
  return <section className="qr-payment" aria-labelledby="qr-pay-heading">
    <p className="eyebrow">Student · Direct payment</p>
    <h2 id="qr-pay-heading">Review your arrival payment.</h2>
    <dl className="trustline-details">
      <div><dt>Exact amount</dt><dd>{request.amount} USDC</dd></div>
      <div><dt>Recipient</dt><dd className="mono-value">{request.recipient}</dd></div>
      <div><dt>Network</dt><dd>Stellar Testnet</dd></div>
      <div><dt>Reference</dt><dd className="mono-value">{request.reference}</dd></div>
      <div><dt>Request expires</dt><dd>{new Date(request.expiresAt * 1000).toLocaleString()}</dd></div>
      {prepared && <div><dt>Maximum network fee</dt><dd>{prepared.fee} XLM</dd></div>}
    </dl>
    <p className="field-hint">This sends USDC directly to the address above. It has no enrollment escrow or automatic refund. Verify the recipient with the service provider before signing. The QR code does not prove their identity.</p>
    <p className="field-hint mono-value">USDC issuer: {network.assetIssuer}</p>
    {(!receipt || receipt.state === "failed") && <div className="dialog-actions">
      {prepared && <Button variant="secondary" disabled={busy} onClick={() => setPrepared(null)}>Cancel review</Button>}
      <Button disabled={busy || !hydrated} onClick={() => void act(prepared ? "sign" : "prepare")}>{busy ? "Working…" : prepared ? "Confirm payment in Freighter" : "Review payment and fee"}</Button>
    </div>}
    {receipt && <div className="wallet-receipt" role="status">
      <Status tone={receipt.state === "confirmed" ? "ready" : receipt.state === "failed" ? "error" : "pending"}>{receipt.state === "confirmed" ? "Payment confirmed" : receipt.state === "failed" ? "Payment not completed" : "Payment confirmation pending"}</Status>
      <a className="wallet-hash" href={transactionUrl(receipt.hash)} target="_blank" rel="noreferrer">{receipt.hash}</a>
      {receipt.state === "pending" && <Button variant="secondary" disabled={busy} onClick={() => void act("check")}>Check payment</Button>}
    </div>}
    {error && <p role="alert" className="field-error">{error}</p>}
  </section>;
}

export function ArrivalServices() {
  const { state: wallet } = useWallet();
  const [request, setRequest] = useState<ArrivalRequest | null>(null);
  const [amount, setAmount] = useState("5.00");
  const [link, setLink] = useState("");
  const [manualRecipient, setManualRecipient] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [received, setReceived] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    function read() {
      if (!window.location.hash) return;
      try { setRequest(parseRequestUrl(window.location.href, window.location.origin)); setError(""); }
      catch (e) { setError(message(e)); setRequest(null); }
    }
    queueMicrotask(read); window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => {
    let current = true;
    if (request && canvas.current) {
      const element = canvas.current;
      void import("qrcode").then(qr => qr.toCanvas(element, requestUrl(request, window.location.origin), { width: 280, margin: 4, errorCorrectionLevel: "M" }))
        .then(() => { if (current) setImage(element.toDataURL("image/png")); })
        .catch(() => { if (current) setError("Could not generate the QR image. Use the payment link instead."); });
    }
    return () => { current = false; };
  }, [request]);
  function generate(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice(""); setReceived(null);
    if (!wallet.address) return;
    if (wallet.account?.usdcAccess !== "authorized") { setError("Enable USDC and leave capacity in your trustline before requesting a payment."); return; }
    try { setRequest(createRequest(wallet.address, amount)); } catch (e) { setError(message(e)); }
  }
  async function checkReceived() {
    if (!request || busy) return;
    setBusy(true); setError("");
    try { const hash = await findArrivalPayment(request); setReceived(hash); setNotice(hash ? "A matching USDC payment is confirmed on Stellar." : "No matching payment in the latest 50 payment records. Refresh later or inspect the account in Stellar Expert."); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  const isRecipient = request?.recipient === wallet.address;
  return <div className="workspace-grid">
    <div className="arrival-main">
      <section aria-labelledby="qr-create-heading">
        <p className="eyebrow">Driver / service provider</p>
        <h2 id="qr-create-heading">Create a payment QR.</h2>
        <p>Receive Testnet USDC in the same wallet. Share a request for an arrival service, such as a ride.</p>
        <form onSubmit={generate} className="quote-form">
          <FormField id="qr-amount" label="Request amount (USDC)" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} disabled={!wallet.address} />
          <Button type="submit" disabled={!wallet.address}>Create QR request</Button>
        </form>
        {!wallet.address && <p className="field-hint">Connect the receiving wallet to create a request.</p>}
      </section>
      <section aria-labelledby="qr-open-heading">
        <h2 id="qr-open-heading">Open a payment link.</h2>
        <p className="field-hint">Scan with your device camera to open the link, or paste it here. Signing currently requires a desktop browser with Freighter; mobile wallet handoff is not supported.</p>
        <form className="quote-form" onSubmit={event => { event.preventDefault(); setError(""); try { setRequest(parseRequestUrl(link, window.location.origin)); setReceived(null); setNotice(""); } catch (e) { setError(message(e)); } }}>
          <FormField id="qr-link" label="ArrivalPay payment link" value={link} onChange={e => setLink(e.target.value)} autoComplete="off" />
          <Button type="submit" variant="secondary">Open request</Button>
        </form>
      </section>
      <details className="manual-payment">
        <summary>Enter a recipient and amount manually</summary>
        <p className="field-hint">Use the provider&rsquo;s complete Stellar address. This creates a new reference; to match an existing QR, paste its payment link instead.</p>
        <form className="quote-form" onSubmit={event => { event.preventDefault(); setError(""); try { setRequest(createRequest(manualRecipient.trim(), manualAmount.trim())); setReceived(null); setNotice(""); } catch (e) { setError(message(e)); } }}>
          <FormField id="qr-manual-recipient" label="Recipient Stellar address" value={manualRecipient} onChange={e => setManualRecipient(e.target.value)} autoComplete="off" spellCheck={false} required />
          <FormField id="qr-manual-amount" label="Payment amount (USDC)" value={manualAmount} onChange={e => setManualAmount(e.target.value)} inputMode="decimal" required />
          <Button type="submit" variant="secondary">Review manual request</Button>
        </form>
      </details>
      {request && <section className="qr-share" aria-label="Share payment request">
        <canvas ref={canvas} className="qr-canvas" role="img" aria-label={`QR payment request for ${request.amount} USDC`} />
        <p className="mono-value">{request.amount} USDC · {request.reference}</p>
        <p className="mono-value">To: {request.recipient}</p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(requestUrl(request, window.location.origin)); setNotice("Payment link copied."); } catch { setNotice("Copy unavailable. Use the payment link below."); } }}>Copy payment link</Button>
          {image && <a className="button button--text" href={image} download={`arrivalpay-${request.reference}.png`}>Download QR</a>}
        </div>
        <a className="wallet-hash" href={typeof window === "undefined" ? "#" : requestUrl(request, window.location.origin)}>Open this payment request →</a>
        {isRecipient && <Button disabled={busy} variant="secondary" onClick={() => void checkReceived()}>{busy ? "Checking Stellar…" : "Check incoming payment"}</Button>}
        {received && <a className="wallet-hash" href={transactionUrl(received)} target="_blank" rel="noreferrer">View received payment ↗</a>}
      </section>}
      {request && wallet.address && !isRecipient && <PayRequest key={`${wallet.address}:${request.reference}:${request.recipient}:${request.amount}:${request.expiresAt}`} request={request} />}
      {request && !wallet.address && <p className="field-hint">Connect the student&rsquo;s wallet to review and pay this request.</p>}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert" className="field-error">{error}</p>}
      <p className="field-hint">Testnet only. TRY withdrawals are not available. Requests are shareable; they do not enforce single payment across devices. Check prior payments before paying again.</p>
    </div>
    <WalletPanel />
  </div>;
}
