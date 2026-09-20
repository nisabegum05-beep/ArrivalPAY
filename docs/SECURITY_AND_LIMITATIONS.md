# Security and limitations

This release is a Testnet demonstration. Public hosting does not establish readiness for real-money payment operations.

## Controls implemented

- Known HTTPS Testnet endpoints; Anchor discovery checks passphrase, signing key, issuer and endpoint domain.
- SEP-10 challenge validation before signing; unchanged challenge body and selected-account signature required.
- User-held Freighter signatures; no secret key input, custody backend or public secret environment variables.
- Integer-based token amounts, asset code plus issuer checks, account reserve/fee checks for classic operations and simulation for contract calls.
- Explicit contract action review; unchanged signed transaction body; bounded fee and transaction expiry.
- Pending submission hashes retained and checked; uncertain results are not automatically resubmitted as new transactions.
- Account changes invalidate in-flight UI state and clear the Anchor session.
- QR requests are validated for origin, version, Testnet, account checksum, amount, reference and expiry. Settlement checks exact payment fields.
- Browser hardening headers reject framing and MIME sniffing and limit referrer details. The CSP contains baseline restrictions, not a strict script nonce policy.

## Trust assumptions

The institution's key is authorized to decide; the contract cannot assess whether admission or rejection is factually correct. No institution identity registry exists. The Anchor simulates its bank and KYC leg and controls the timing of canonical USDC settlement. Stellar assets retain issuer behavior. Anyone can inspect on-chain public keys, terms, amounts and transaction records.

The general contract accepts an asset address on creation. The user-facing application blocks unsupported token actions. Tests using a newly issued `TEST`/`FIXT` asset demonstrate escrow semantics, not a canonical USDC funding corridor.

## Operational limits

- No independent smart-contract audit, mainnet deployment, real bank integration, production KYC or licensed payout operation is claimed.
- An initial lack of USDC may leave funding simulation rejected. An institution also needs a canonical USDC trustline for release. Rejection returns on-chain tokens, not fiat.
- The real Anchor deposit observed during this release remained `pending_anchor`. A canonical Anchor → escrow journey therefore remains unproven. Do not replace that evidence with a fixture or faucet while claiming the same test passed.
- Refund after deadline is user-initiated. TTL storage maintenance and archive restoration need an operator procedure; read-only UI polling does not preserve storage indefinitely.
- Per-address contract vectors and first-50 list loading limit scale. No full historical contract event index is provided.
- Ordinary Freighter extension accounts are supported. Mobile signing handoff, hardware wallets, multisig and passkeys are outside this release.
- QR transfers are direct and final; requests are unsigned descriptions, not verified merchant identities. Reopening on another device can allow another payment. The reference is for matching, not contract-enforced uniqueness.
- No in-app camera capture is required: scan with a device camera or paste a payment link. Manual recipient/amount entry is available in the arrival-services flow.
- Dependency findings are recorded in QA. A passing build is not a dependency security audit.

## Reporting and recovery

No private key or seed phrase is ever needed in a bug report. Share the public transaction hash, Testnet address, request ID, expected result and visible error. Check the chain result before retrying. See [demo recovery](DEMO.md).
