"use client";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { AsyncState } from "@/components/feedback/async-state";
import { Status } from "@/components/ui/status";
import { useWallet } from "@/features/wallet/provider";
import { useAnchor } from "@/features/anchor/provider";
import { useIntents } from "@/features/intents/provider";
import { horizon } from "@/services/stellar/client";
import { transactionUrl } from "@/services/stellar/transactions";
import { listTransactions } from "@/services/anchor/transactions";
import type { AnchorTransaction } from "@/services/anchor/types";

type ChainRow = { hash: string; successful: boolean; created_at: string };
export function Activity() {
  const { state: wallet } = useWallet();
  const { state: anchor, controller: anchorController } = useAnchor();
  const { state: intents } = useIntents();
  const [chain, setChain] = useState<ChainRow[]>([]);
  const [deposits, setDeposits] = useState<AnchorTransaction[]>([]);
  const [chainError, setChainError] = useState("");
  const [anchorError, setAnchorError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setChain([]); setDeposits([]); setChainError(""); setAnchorError("");
      if (!wallet.address) return;
      setLoading(true);
      await Promise.all([
        horizon.transactions().forAccount(wallet.address).order("desc").limit(20).includeFailed(true).call()
          .then(data => { if (active) setChain(data.records.map(r => ({ hash: r.hash, successful: r.successful, created_at: r.created_at }))); })
          .catch(() => { if (active) setChainError("Could not load the account's Stellar activity. Check the network and refresh."); }),
        anchor.discovery && anchor.session ? listTransactions(anchor.discovery, anchor.session)
          .then(rows => { if (active) setDeposits(rows); })
          .catch(() => { if (active) setAnchorError("Could not load Anchor activity. Reconnect the Anchor if your session expired."); }) : Promise.resolve(),
      ]);
      if (active) setLoading(false);
    }
    void load(); return () => { active = false; };
  }, [wallet.address, anchor.discovery, anchor.session, revision]);
  if (!wallet.address) return <AsyncState title="Connect a wallet to see payment activity." action={<ButtonLink href="/student">Open student workspace</ButtonLink>}><p>Public transaction references are read from Stellar. Anchor records require a separate authenticated session.</p></AsyncState>;
  return <div className="activity-view">
    <Button variant="secondary" disabled={loading} onClick={() => setRevision(v => v + 1)}>{loading ? "Loading activity…" : "Refresh activity"}</Button>
    <section aria-labelledby="anchor-activity-heading">
      <h3 id="anchor-activity-heading">Anchor deposits</h3>
      <p className="field-hint">Source: TR Mock Anchor · Sandbox bank leg. A deposit reference is not a Stellar transaction hash.</p>
      {!anchor.session && <p><ButtonLink href="/student" variant="text">Authenticate with the Anchor in your workspace →</ButtonLink></p>}
      {anchorError && <p role="alert" className="field-error">{anchorError}</p>}
      {anchor.session && !loading && !anchorError && !deposits.length && <p>No deposits returned by the Anchor.</p>}
      <ul className="activity-list">{deposits.map(deposit => <li key={deposit.id}>
        <Status tone={deposit.status === "completed" ? "ready" : deposit.status === "error" ? "error" : "pending"}>{deposit.status.replaceAll("_", " ")}</Status>
        <p className="mono-value">{deposit.id}</p>
        <p>{deposit.amountIn ?? "—"} TRY → {deposit.amountOut ?? "—"} USDC</p>
        {deposit.stellarTransactionId && <a className="wallet-hash" href={transactionUrl(deposit.stellarTransactionId)} target="_blank" rel="noreferrer">Inspect reported Stellar transaction ↗</a>}
        <Button variant="text" disabled={!!anchor.busy} onClick={() => void anchorController.resumeDeposit(deposit.id)}>Resume status tracking</Button>
      </li>)}</ul>
    </section>
    <section aria-labelledby="stellar-activity-heading">
      <h3 id="stellar-activity-heading">Stellar transactions</h3>
      <p className="field-hint">Source: Horizon · Latest 20 transactions involving this account. Includes activity outside ArrivalPay; this is not a complete contract event index.</p>
      {chainError && <p role="alert" className="field-error">{chainError}</p>}
      {!loading && !chainError && !chain.length && <p>No transactions returned by Stellar.</p>}
      <ul className="activity-list">{chain.map(row => {
        const receipt = intents.receipts.find(r => r.hash === row.hash);
        return <li key={row.hash}>
          <Status tone={row.successful ? "ready" : "error"}>{row.successful ? "Confirmed" : "Failed"}</Status>
          <p>{receipt ? `ArrivalPay · ${receipt.action}` : "Account transaction"} · <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString()}</time></p>
          <a className="wallet-hash" href={transactionUrl(row.hash)} target="_blank" rel="noreferrer">{row.hash}<span className="sr-only"> — opens in a new tab</span></a>
        </li>;
      })}</ul>
    </section>
  </div>;
}
