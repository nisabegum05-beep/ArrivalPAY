# Release QA

Final verification is in progress. This document records executed checks rather than presumed success.

| Check | Latest observed result |
|---|---|
| Baseline JavaScript tests after release changes | 93 passed |
| Baseline lint | Passed after dialog cleanup and JSX correction |
| Contract tests | 16 passed; contract source unchanged |
| Typecheck / build | A test-only literal-type error was found and corrected; rerun pending |
| Production browser suite | Rerun pending |
| Clean installation | Pending |
| Live Anchor retest | Auth, quote and transfer simulation passed; final status remained pending_anchor |
| Public Vercel smoke | Pending deployment |
| Real user Freighter acceptance | Not observed |

Browser tests use fixtures, while Node live tests use ephemeral keys and real Testnet APIs. Fixture screenshots and genuine disconnected UI screenshots will be labeled separately. A passing Anchor submission test is not proof of completed settlement.
