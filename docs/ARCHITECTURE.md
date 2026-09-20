# Architecture

ArrivalPay is a Next.js application that connects a user's Freighter wallet to Stellar Testnet and TR Mock Anchor. It does not run a custodial signing backend or maintain a private payment database.

## Boundaries

| Layer | Responsibility | Source of truth |
|---|---|---|
| `src/app`, `src/components` | Routes, layout, metadata, controls | Rendered UI |
| `src/features/wallet` | Account identity, network, balances, trustline review/signing | Freighter and Horizon |
| `src/features/anchor` | Authentication, quotes, deposit instructions, bounded polling, recovery | Anchor SEP endpoints |
| `src/features/intents` | Request lists, role-aware actions, review/confirm, pending receipts | Soroban contract state |
| `src/features/arrival-services` | QR request generation, link parsing, direct payment review | Explicit request plus verified Stellar payment |
| `src/features/transactions` | Source-labeled Anchor and chain activity | SEP-6 history and Horizon |
| `src/services` | External API calls, transaction construction and verification | Remote validated responses |
| `contracts/conditional-payment-intent` | Authorization, escrow and deadline settlement | Stellar ledger |

## Signing and confirmation

A contract action reads current state, verifies the expected canonical asset and simulates a transaction. The user reviews amount, recipient, deadline and maximum fee before Freighter signs. The app verifies that the signed body is unchanged. A public hash is recorded before broadcast; a lost response means pending, not failed. Pending contract receipts block another contract action until checked. Reconnecting restores public receipts as unverified/pending and queries the network; local storage never proves success.

Wallet/account changes invalidate asynchronous controllers. SEP-10 JWTs exist only in memory and are cleared on account changes. Public recovery references use session storage scoped to the account and service/contract. Closing the browser session or clearing storage can remove them; they are not a complete history database.

## Two distinct payment paths

**Enrollment:** institution request → student's USDC → contract → institution release or student refund. Classic USDC is represented through its Stellar Asset Contract. The deployed contract supports arbitrary token addresses, while ArrivalPay's UI only creates and acts on canonical Testnet USDC intents.

**Arrival Services:** shareable QR/link → explicit recipient/amount review → classic Stellar `Payment` with canonical USDC and a unique text memo. No escrow contract is involved. Receiver confirmation matches destination, asset issuer, amount and reference against Horizon. Requests do not provide cross-device single-use enforcement or verified merchant identity.

## Limits

Lists currently read the first 50 IDs per role; request details can be opened by direct link. Contract indexes are per-address vectors, not a scalable event index. Activity reads the latest 20 account transactions and Anchor history. Receiver QR checks inspect the latest 50 payment records. These bounded views can omit older records; explorer links remain available.

Contract storage TTL is extended by executed writes/reads, but RPC simulations do not commit extensions. Archive restoration and explicit storage maintenance are operator responsibilities before any long-lived or real-value pilot. The deployed contract was not changed during this frontend release.
