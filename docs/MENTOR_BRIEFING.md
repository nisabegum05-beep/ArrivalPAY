# ArrivalPay — Mentor Briefing

## 1. Executive summary

ArrivalPay is a Stellar Testnet application for conditional international student enrollment deposits.

The core idea is simple: an institution creates a payment request for a student, the student funds it with canonical Testnet USDC, and a Soroban smart contract holds the funds until the institution approves or rejects the request. If the deadline passes, the student can claim a timeout refund. The student keeps ownership of the wallet throughout the process.

ArrivalPay is not a bank, a custodial wallet, an admissions system, a visa-verification system, or a production payment service. It is a Testnet prototype exploring whether a reusable Stellar wallet and an institution-authored conditional payment record can make enrollment deposits clearer and more auditable.

## 2. The problem

International students may need to pay an enrollment or tuition deposit before an institution completes enrollment or issues visa-related documentation. Today, the payment, the institution's decision, the deadline and the refund process may be handled in separate systems.

This creates several practical problems:

- The student may not have a clear, shared record of what the payment is for.
- The institution's decision and the movement of money are difficult to connect operationally.
- Refund conditions may be unclear or slow to verify.
- A student may need to repeat payment onboarding for future transactions.

ArrivalPay attempts to place the amount, student, institution, deadline, settlement status and resolution in one inspectable payment intent.

The project deliberately does not claim that blockchain can verify whether an institution's admission decision is correct. It only enforces who is authorized to make a recorded decision and how the held funds move after that decision.

## 3. Target users and roles

### Student

The student connects a Freighter-compatible Stellar wallet, checks the canonical Testnet USDC asset, optionally requests USDC through the TR Mock Anchor sandbox, reviews assigned payment intents and signs funding or refund transactions.

### Institution

The institution connects a separate wallet, creates a payment request for a student's public key, specifies an amount and deadline, and later signs an approval or rejection.

A connected public key is only a wallet identity. It is not proof that the user represents an accredited institution.

### Recipient or service operator

The Arrival Services extension allows a recipient to create a shareable QR/link payment request. A payer reviews the recipient, amount, asset and memo, then signs a direct Stellar USDC payment. This path does not use escrow.

## 4. The main enrollment flow

1. The institution creates an intent with the student address, institution address, canonical Testnet USDC amount, deadline and an optional opaque external reference.
2. The student opens the request and reviews the institution, amount, deadline and contract state.
3. The student obtains USDC. The intended funding path is TRY to USDC through the TR Mock Anchor sandbox, but the bank-transfer leg is simulated.
4. The student signs `fund_intent`. The contract transfers the exact token amount from the student to escrow.
5. Before the deadline, the institution signs either `approve_intent` or `reject_intent`.
6. Approval releases the funds to the institution. Rejection refunds them to the student.
7. If a funded intent reaches its deadline, the student can sign `claim_timeout_refund` and receive the funds back.

The frontend separates Anchor status from confirmed wallet balance. An Anchor request being accepted or marked `pending_anchor` is not treated as proof that USDC has arrived.

## 5. The smart contract

The contract is written in Rust with Soroban SDK 27 and deployed to Stellar Testnet.

Contract ID:

`CDL4LVIFDJGLZCYJ7W2644NSYKPGMC6K5XPEPYHRTXPWZ2LNWBCD7NNK`

Public API:

- `create_intent`
- `fund_intent`
- `approve_intent`
- `reject_intent`
- `claim_timeout_refund`
- `get_intent`
- `list_by_student`
- `list_by_institution`

The state machine is:

```text
Created -> Funded -> Released
                  -> Refunded
```

The contract also stores a resolution: `Pending`, `Approved`, `Rejected` or `Timeout`.

Important rules:

- Funding and approval require ledger time strictly before the deadline.
- Timeout refund requires ledger time at or after the deadline.
- Rejection remains possible after the deadline because it has the same financial outcome as a refund.
- A resolved intent cannot be settled again.
- Authorization is checked against the student and institution addresses stored in the intent.
- Transfers and state updates are atomic: a failed token transfer must not leave the intent in a partially updated state.
- The contract stores opaque references only; it does not store identity documents or personal data.

The contract supports an arbitrary token address at the protocol level. The ArrivalPay frontend intentionally restricts the product flow to canonical Testnet USDC and verifies both the asset code and issuer.

## 6. Technical architecture

The repository is a Next.js App Router application using TypeScript, React and Tailwind CSS, plus a Rust Soroban contract.

```text
src/app/                  Routes and page composition
src/components/           Shared layout, controls and feedback
src/config/               Network, asset and environment validation
src/features/wallet/      Freighter connection, balances and trustlines
src/features/anchor/      SEP discovery, auth, quotes and deposit status
src/features/intents/     Intent discovery, roles and contract actions
src/features/institution/ Request creation flow
src/features/arrival-services/ QR/link and direct USDC payments
src/features/transactions/ Source-labelled activity
src/services/             Stellar, Anchor and Soroban network clients
contracts/conditional-payment-intent/ Rust contract and tests
tests/e2e/                Browser tests using fixtures
tests/live/               Opt-in tests against real Testnet services
docs/evidence/            Recorded addresses, hashes and transaction evidence
```

The application is intentionally non-custodial:

- Secret keys never enter the application.
- Freighter signs wallet transactions.
- The frontend prepares, simulates, submits and verifies transactions.
- SEP-10 JWTs remain in browser memory.
- Public transaction and intent references may be stored temporarily for recovery.
- The blockchain and external Anchor APIs are the sources of truth, not a private ArrivalPay database.

A transaction is treated as pending when the network response is ambiguous. The UI does not assume that a missing response means failure or that a locally stored receipt proves success.

## 7. Stellar integrations

### Wallet and asset handling

The application uses Stellar Wallets Kit and Freighter-compatible signing. It reads account balances from Testnet Horizon, validates the network, checks the canonical USDC issuer and prepares trustline transactions when necessary.

Amounts are converted using integer-scaled units and `bigint`; floating-point arithmetic is not used for payment amounts.

### Anchor

The TR Mock Anchor integration covers the shape of a local-funding flow:

- SEP-1 discovery
- SEP-10 authentication
- SEP-6 deposit instructions and status
- SEP-38 quote retrieval
- sandbox bank-transfer simulation
- deposit history and recovery

This is not a real bank transfer and does not implement production KYC. In the latest recorded live attempts, the Anchor accepted the simulated transfer but remained `pending_anchor`; canonical USDC settlement was not demonstrated.

### Soroban

Soroban supplies the conditional escrow and authorization layer. Its key value here is not merely token transfer; it makes the deadline and one-time settlement rules executable and publicly inspectable.

## 8. What has been demonstrated

The following has been implemented and tested:

- Responsive product screens for student, institution, intent detail, transactions and Arrival Services.
- Wallet connection, network checks, account/balance reads and canonical USDC trustline flow.
- Real Anchor discovery, SEP-10 authentication, quote and sandbox deposit request flow.
- Soroban contract unit tests: 16 passing contract tests covering creation, funding, approval, rejection, timeout refunds, authorization, duplicate IDs, invalid values, atomic failure behavior, token separation, TTL and pagination.
- A Testnet contract deployment with real approve and reject evidence.
- Frontend integration with the deployed contract.
- A real Testnet service flow using ephemeral Node keys: create, fund and approve through the application's own Soroban services.
- Browser tests, accessibility checks and responsive viewport checks using fixtures.
- Source-labelled activity and pending-transaction recovery behavior.
- Direct USDC QR/link payments as a separate, non-escrow extension.

The repository contains evidence files and explorer links, but Testnet resets can invalidate historical records.

## 9. What has not been demonstrated yet

This distinction is important when presenting the project:

- A real user completing the full journey with the Freighter browser extension has not yet been observed.
- A complete `TRY -> Anchor settlement -> canonical Testnet USDC -> escrow -> institution resolution` journey has not been demonstrated.
- The Anchor sandbox's final USDC settlement remained pending in the latest live run.
- The application has no real bank rail, production KYC, institution verification or bank-account refund.
- The contract has not had a production security audit.
- Mobile wallet handoff, multisig and hardware-wallet workflows are not implemented.
- The contract's per-address vectors and storage TTL strategy need an operational/indexing plan for long-lived or large-scale use.
- Final production QA, public deployment smoke testing and release readiness are still being completed.

## 10. Current product boundary

The strongest current claim is:

> ArrivalPay is a working Stellar Testnet prototype that connects a non-custodial student wallet, a conditional Soroban payment intent and a sandbox Anchor funding flow, with the contract and application-side transaction logic tested against real Testnet infrastructure.

The project should not currently claim:

- production readiness
- guaranteed fiat settlement
- verified university participation
- real customer traction
- automatic admission or visa decisions
- guaranteed refunds to a bank account
- that a passing browser fixture test is proof of real wallet acceptance

## 11. Suggested mentor questions

These are the questions I would like help answering:

1. Is conditional escrow the right product abstraction for enrollment deposits, or would institutions prefer a normal payment plus an off-chain refund policy?
2. What evidence would convince an institution to use a student-controlled wallet instead of an existing education-payment provider?
3. Which institution-side verification and compliance requirements must exist before a pilot can be credible?
4. Should the institution identity be represented by a wallet, a verified organization account, a multisig, or an external identity provider?
5. Is the TR Mock Anchor integration valuable enough for the MVP, or should the product first focus on direct USDC funding and prove the escrow workflow?
6. How should the system handle Anchor settlement delays, failed deposits and reconciliation at production scale?
7. Is the deadline policy correct, especially the rule that approval is forbidden at or after the deadline while rejection remains allowed?
8. Should the contract support more intent types now, or remain limited to enrollment deposits until user research validates another use case?
9. What is the right indexing architecture once per-address contract vectors are no longer sufficient: events, an indexer, a database, or a combination?
10. What storage TTL maintenance and archive-recovery operations are required before funds can be held for weeks or months?
11. What threat model and audit scope should be completed before any real-value pilot?
12. Which single user journey should be optimized first: student onboarding, institution request creation, or payment-status/reconciliation operations?
13. What metrics would validate the product: completion rate, time to fund, refund time, support burden, institution reconciliation time, or wallet reuse?
14. Should Arrival Services remain in the product, or is the direct QR payment path distracting from the enrollment-deposit thesis?
15. What is the smallest real-world pilot that could test willingness to adopt without requiring a full banking or KYC stack?

## 12. What might be removed or added

### Candidates to remove or postpone

- Arrival Services QR/link payments, if they weaken the single enrollment-deposit narrative.
- Passkey, mobile wallet, hardware wallet and multisig work before the core pilot is validated.
- Advanced market-size language that cannot be supported by customer or institutional evidence.
- Additional intent types before enrollment deposits have a validated user need.
- Any UI that suggests Anchor acceptance equals completed USDC settlement.

### Candidates to add

- A minimal institution verification model and an explicit trust model for decision-makers.
- A production-grade reconciliation model for Anchor deposits and on-chain settlements.
- Event indexing and durable history beyond bounded first-page reads.
- Contract TTL monitoring, restoration procedures and operational alerts.
- A formal threat model and an independent Soroban security review.
- An onboarding flow that explains wallet creation, XLM fees, trustlines and recovery without assuming crypto expertise.
- User research with institutions and international students before adding more payment rails.
- A pilot analytics layer that measures successful completion, delay, refund and support outcomes without placing personal data on-chain.

## 13. How to run it

Requirements:

- Node.js 24
- npm
- Freighter for browser signing
- Rust, the `wasm32v1-none` target and Stellar CLI for contract work

```sh
npm ci
npm run dev
```

Useful checks:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
cargo test -p conditional-payment-intent
```

The default configuration targets Stellar Testnet and the deployed contract. Public environment variables must never contain secret keys, seed phrases, JWTs or deployment credentials.

## 14. Reference documents

- [Project README](../README.md)
- [Architecture](ARCHITECTURE.md)
- [Contract reference](CONTRACT.md)
- [Demo and recovery guide](DEMO.md)
- [Release QA](QA.md)
- [Security and limitations](SECURITY_AND_LIMITATIONS.md)
- [Phase 3-4 Anchor QA](PHASE_3_4_QA.md)
- [Phase 6 intent QA](PHASE_6_QA.md)
