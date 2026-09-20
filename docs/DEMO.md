# Demo and recovery

## Before presenting

Use Stellar Testnet only. Prepare separate institution and student Freighter accounts. Both need XLM for fees. Both need canonical USDC trustlines; the student needs enough USDC for the demonstrated deposit. A third receiving account is useful for QR payments. A connected wallet is a demo role, not a verified university or driver identity.

The Anchor bank-transfer leg is simulated. Its settlement is external and was still pending in the latest live test. Do not promise a timed live deposit demonstration unless USDC arrival has actually been checked. Existing fixture-token contract evidence can explain the code's operation, but must be labeled as such.

## 2–3 minute presentation

1. **0:00–0:25 — Problem:** show the overview. Explain that an enrollment deposit needs clear release/refund conditions and a shared payment record.
2. **0:25–0:55 — Institution:** connect the institution wallet, enter the student's public key, a small USDC amount and deadline. Review the prepared request, sign in Freighter and show its transaction.
3. **0:55–1:25 — Student:** switch accounts, refresh requests, inspect amount, deadline and institution. Explain the TRY sandbox quote and bank-transfer simulation separately from confirmed USDC balance. Fund only after sufficient balance is present.
4. **1:25–1:55 — Resolution:** the institution reviews and signs approval or rejection. Show the updated contract state and explorer link. A second request can demonstrate the alternative path; after expiry the student signs a timeout refund.
5. **1:55–2:30 — Reuse:** open Arrival services. The recipient generates a QR request; the student opens its link, reviews exact recipient/amount/fee and signs a direct USDC payment. The receiver checks the matching payment. No escrow or TRY withdrawal is claimed for this path.
6. **2:30–3:00 — Evidence and limits:** show source-labeled activity, Testnet contract and the evidence table. Describe next steps: institution pilot, licensed Anchor, audit and operational readiness.

Allow additional time for real wallet prompts and network confirmation. A prepared explanation does not imply a guaranteed three-minute live network round trip.

## Refresh and recovery

- **Wallet:** reconnect the same account and choose Refresh status. Pending trustline hashes are queried before another trustline is prepared.
- **Intent:** a pending hash survives refresh in this browser session. Check transaction until the network gives a result. Restored records are not trusted as confirmed. Do not clear storage to bypass this check.
- **Anchor:** reconnect and sign a new SEP-10 challenge; JWTs are intentionally not persisted. Saved public deposit references restore status tracking. Anchor activity can resume a specific existing deposit. A lost deposit response must be investigated in history before another transfer.
- **QR:** reopen the same request using the same payer account. A saved receipt begins as pending and is verified for exact destination, issuer, amount and memo. Different browsers do not share this protection; inspect prior account payments first.
- **Account switch:** pick the correct Freighter account/network and reconnect. A stale screen is not proof that a transaction failed.
- **Expired request:** an unfunded enrollment request cannot be funded after its deadline. Create a new request. A funded request can be refunded according to the contract rules.

## Reset for another run

Use a new intent ID/request and explicitly funded Testnet accounts. Keep prior transaction references for audit. Closing a browser session clears recovery storage; it does not undo a payment. Never resubmit solely because a record disappeared locally.

## Testnet reset

A network reset can remove accounts, balances, contract deployment and explorer history. Follow [deployment instructions](DEPLOYMENT.md), verify the new contract and canonical asset configuration, rebuild the frontend and rerun live tests. Old evidence is historical, not proof that the reset network contains the same state.
