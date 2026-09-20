import { mkdir, writeFile } from "node:fs/promises";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { expect, test } from "vitest";
import { network } from "@/config/network";
import { loadAccount } from "@/services/stellar/account";
import { prepareTrustline } from "@/services/stellar/trustline";
import {
  accountUrl,
  submitSignedTransaction,
  transactionStatus,
  transactionUrl,
  verifySignedTransaction,
} from "@/services/stellar/transactions";

test("live Testnet fixture creates canonical USDC trustline using production services", async () => {
  // Ephemeral NODE-ONLY TEST FIXTURE. Never expose or persist its private key.
  // This validates real ledger plumbing, not the user's Freighter extension.
  const fixture = Keypair.random();
  const address = fixture.publicKey();
  const funding = await fetch(`${network.friendbotUrl}?addr=${address}`, {
    signal: AbortSignal.timeout(45_000),
  });
  expect(funding.ok).toBe(true);
  expect((await loadAccount(address))?.usdcAccess).toBe("missing");
  const quote = await prepareTrustline(address);
  const tx = TransactionBuilder.fromXDR(quote.xdr, network.passphrase);
  tx.sign(fixture);
  const verified = verifySignedTransaction(quote.xdr, tx.toXDR(), address);
  let receipt = await submitSignedTransaction(verified);
  for (
    let attempt = 0;
    receipt.state === "pending" && attempt < 15;
    attempt++
  ) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    receipt = await transactionStatus(receipt.hash, quote.expiresAt);
  }
  expect(receipt.state).toBe("confirmed");
  const account = await loadAccount(address);
  expect(account?.usdcAccess).toBe("authorized");
  expect(account?.usdc).toBe("0.0000000");
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    "docs/evidence/phase-2-testnet.json",
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        network: "Stellar Testnet",
        kind: "ephemeral server-side test fixture; not a Freighter wallet test",
        address,
        accountUrl: accountUrl(address),
        hash: receipt.hash,
        transactionUrl: transactionUrl(receipt.hash),
        usdcIssuer: network.assetIssuer,
        usdcAccess: account?.usdcAccess,
        usdcBalance: account?.usdc,
        fee: quote.fee,
        reserve: quote.reserve,
      },
      null,
      2,
    ) + "\n",
  );
});
