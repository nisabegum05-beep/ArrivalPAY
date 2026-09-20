# Conditional Payment Intent — contract reference

Source: `contracts/conditional-payment-intent/`. Soroban SDK 27, Rust, built for `wasm32v1-none` via `stellar contract build`.

## What it does, and does not, guarantee

The contract cannot verify that an institution's admit/reject decision reflects reality — that judgment happens off-chain. What it guarantees is that once an **authorized** decision is made (a real signature from the institution address named on the intent, or a deadline the ledger itself tracks), the held USDC moves exactly the way that decision implies: to the institution on approval, back to the student on rejection or on an unmet deadline, and never twice.

## State machine

```
CREATED --fund_intent(student)--> FUNDED --approve_intent(institution, before deadline)--> RELEASED
                                     |
                                     +--reject_intent(institution, any time while Funded)--> REFUNDED
                                     |
                                     +--claim_timeout_refund(student, at/after deadline)-----> REFUNDED
```

A resolved intent (`RELEASED` or `REFUNDED`) cannot be resolved again — every state-changing call checks the intent's current `status` first and returns `WrongState` otherwise.

**Deadline rule (a deliberate design choice, not left ambiguous):** `fund_intent` and `approve_intent` both require `now < deadline`; `claim_timeout_refund` requires `now >= deadline`. This means once the deadline arrives on a still-`Funded` intent, the institution can no longer approve — only a refund path (its own `reject_intent`, or the student's `claim_timeout_refund`) remains open. This closes the race where a late institution decision could still claim funds after the student became eligible for a timeout refund. `reject_intent` is not deadline-gated, since it reaches the same outcome (refund) a timeout claim would.

## Public API

| Function | Auth required | Preconditions | Effect |
|---|---|---|---|
| `create_intent(institution, id, student, token, amount, deadline, external_reference)` | `institution` | `id` unused, `amount > 0`, `deadline` in the future | Stores a `Created` intent; indexes it under both the student and the institution |
| `fund_intent(id)` | the intent's `student` | status `Created`, `now < deadline` | Transfers `amount` of `token` from the student to the contract; status → `Funded` |
| `approve_intent(id)` | the intent's `institution` | status `Funded`, `now < deadline` | Transfers the held amount to the institution; status → `Released`, resolution → `Approved` |
| `reject_intent(id)` | the intent's `institution` | status `Funded` | Transfers the held amount back to the student; status → `Refunded`, resolution → `Rejected` |
| `claim_timeout_refund(id)` | the intent's `student` | status `Funded`, `now >= deadline` | Transfers the held amount back to the student; status → `Refunded`, resolution → `Timeout` |
| `get_intent(id)` | none | — | Returns the stored `PaymentIntent` |
| `list_by_student(student, offset, limit)` | none | — | Paginated list of intent ids for that student |
| `list_by_institution(institution, offset, limit)` | none | — | Paginated list of intent ids for that institution |

The decision-maker's address is always read from the stored intent, never taken as a separate caller-supplied parameter — there is nothing for a caller to spoof; the call either carries a real authorization from that exact address or it fails.

## Data model

```rust
pub struct PaymentIntent {
    pub kind: IntentKind,       // EnrollmentDeposit (MVP has only this one)
    pub student: Address,
    pub institution: Address,
    pub token: Address,         // the SAC token contract used for this intent
    pub amount: i128,
    pub deadline: u64,          // ledger timestamp
    pub external_reference: Option<BytesN<32>>, // opaque hash only, never PII/documents
    pub status: IntentStatus,   // Created | Funded | Released | Refunded
    pub resolution: Resolution, // Pending | Approved | Rejected | Timeout
}
```

`resolution` is a plain enum with a `Pending` sentinel rather than `Option<Resolution>` — Soroban SDK 27's `#[contracttype]` derive does not support `Option` of a custom multi-variant enum as a struct field (verified by hitting the compiler error directly); a sentinel variant is the working, idiomatic alternative and is what several Soroban example contracts do.

Storage keys are `Intent(id)`, `StudentIndex(student)`, `InstitutionIndex(institution)`, all persistent. Intent reads/writes and index writes request TTL extension (~30-day threshold / ~60-day bump). Read-only RPC simulations do not commit that extension, and index reads do not extend it. Long-lived escrow therefore needs explicit TTL maintenance and tested restoration; ordinary UI polling is insufficient. Index values are whole per-address vectors even though the read API paginates results. No personal data or document content is ever stored; `external_reference` is an opaque 32-byte value the caller supplies.

## Events

`IntentCreated`, `IntentFunded`, `IntentReleased`, `IntentRefunded` (carries the `resolution`), defined with `#[contractevent]` so they are part of the contract's published interface, not just raw topic tuples.

## Tests

`contracts/conditional-payment-intent/src/test.rs`, 16 tests, run with `cargo test -p conditional-payment-intent`. Covers all 12 tests the project specification requires, plus four more:

1. Intent creation. 2. Successful funding. 3. Approval pays the institution. 4. Rejection refunds the student. 5. Timeout refund after the deadline. 6. Timeout refund before the deadline is rejected. 7. Unauthorized institution decision is rejected. 8. Unauthorized student funding is rejected. 9. Double settlement is rejected (in all four directions from a resolved intent). 10. Duplicate intent id is rejected. 11. Invalid amount/deadline is rejected. 12. Balance changes are verified precisely.

Plus: the exact deadline instant counts as passed (not just "after"); two intents on two different tokens keep independent balances; storage TTL is actually extended on write, not just assumed; pagination over an institution's intent index.

The two "unauthorized" tests do not mock any authorization for the tested call and assert a panic — in Soroban's model there is no separate "caller" identity to spoof (the contract reads the decision-maker's address from the stored intent itself), so the only way an unauthorized call can be attempted at all is one where that exact address never actually signed.

## Deployment (Testnet)

| Field | Value |
|---|---|
| Network | Stellar Testnet |
| Wasm hash | `ce0fb9967d98e41e9091a30ee5cc7690c7956f9157fde54893131dc9cf36b2ea` |
| Contract ID | `CDL4LVIFDJGLZCYJ7W2644NSYKPGMC6K5XPEPYHRTXPWZ2LNWBCD7NNK` |
| Explorer | https://lab.stellar.org/r/testnet/contract/CDL4LVIFDJGLZCYJ7W2644NSYKPGMC6K5XPEPYHRTXPWZ2LNWBCD7NNK |
| Wasm size | 10,818 bytes (optimized; 12,224 bytes before optimization) |

Deployed with `stellar contract deploy` using Testnet-only identities generated and funded for this purpose (`arrivalpay-deployer`, `institution`, `student`); no secret key is stored in this repository or in application code.

### Live smoke evidence

Two full flows were run as real transactions against the deployed contract, using a throwaway Testnet asset (code `TEST`, wrapped as a Stellar Asset Contract) instead of real USDC, purely to exercise the token transfers. Full transaction links: `docs/evidence/phase-5-contract.json`.

- **Approve flow:** `create_intent` → `fund_intent` → `approve_intent`. The first `approve_intent` attempt genuinely failed (`Error(Contract, #13)`, missing trustline on the institution's account) and reverted atomically — `get_intent` afterward still showed `Funded`, unchanged. After adding the trustline, the retry succeeded: final state `Released` / `Approved`, USDC-equivalent balance moved to the institution.
- **Reject flow:** a second intent, `create_intent` → `fund_intent` → `reject_intent`. Final state `Refunded` / `Rejected`, balance moved back to the student.

Both `IntentCreated`/`IntentFunded`/`IntentReleased`/`IntentRefunded` events were emitted and decoded correctly by the CLI on every call.

Frontend integration was subsequently implemented in Phase 6 and hardened with review/confirmation and receipt recovery in the final release. See [release QA](QA.md).
