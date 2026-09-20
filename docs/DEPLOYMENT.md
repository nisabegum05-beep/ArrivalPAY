# Deployment

## Vercel

The project uses Next.js and Node.js 24. `vercel.json` selects the Next.js framework, `npm ci` and `npm run build`. `.vercelignore` excludes local environments, build caches, Rust output and test reports. `.gitignore` excludes `.vercel` and environment secrets.

All five settings in `.env.example` are public and have Testnet defaults. The contract ID defaults to `CDL4LVIFDJGLZCYJ7W2644NSYKPGMC6K5XPEPYHRTXPWZ2LNWBCD7NNK`. Empty values select defaults. No private signing key, Anchor JWT, database or backend secret is needed for hosting.

After local checks, deploy from the authorized account:

```sh
npx vercel --prod
```

A Git-linked project can instead build from its approved repository. Inspect `/`, `/student`, `/institution`, `/transactions`, `/arrival-services`, a direct `/intent/[id]` route, unknown-route 404, `/icon.svg` and `/opengraph-image`. Check browser console and responsive layouts. Hosting smoke tests cannot emulate an actual installed Freighter extension; record manual acceptance separately.

CLI deployment does not require pushing to GitHub first. GitHub delivery and future automatic builds are separate actions requiring the intended repository. [Vercel CLI documentation](https://vercel.com/docs/cli/deploy).

## Contract deployment after Testnet reset

The current frontend release does not change the deployed Rust contract. Rebuilding the website does not recreate a missing contract.

```sh
cargo test -p conditional-payment-intent
stellar contract build
stellar contract deploy --network testnet --source YOUR_LOCAL_TESTNET_IDENTITY \
  --wasm target/wasm32v1-none/release/conditional_payment_intent.wasm
```

The Stellar identity is configured locally; never add its secret to the project. Verify the resulting contract ID, WASM and methods; update `NEXT_PUBLIC_INTENT_CONTRACT_ID`, rebuild/redeploy and run the live integration tests. Confirm canonical USDC issuer/SAC and Anchor signing key against current official Testnet configuration before updating allowlists.

## Rollback and dependencies

Use the Vercel project's deployment history to promote the last verified frontend if a release regresses. Frontend rollback does not revert ledger transactions. The dependency lockfile is the reproducible installation source; resolve dependency findings deliberately and rerun relevant checks.
