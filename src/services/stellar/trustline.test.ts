import { Asset, Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { network } from "@/config/network";
import {
  accountFixture,
  usdcFixture,
} from "../../../tests/fixtures/stellar-account";
import { buildTrustline } from "./trustline";
import { transactionHash, verifySignedTransaction } from "./transactions";

describe("USDC trustline safety", () => {
  it("builds only the expected changeTrust operation and verifies its wallet signature", () => {
    const key = Keypair.random();
    const quote = buildTrustline(
      accountFixture(key.publicKey()),
      5_000_000,
      100,
    );
    const tx = TransactionBuilder.fromXDR(quote.xdr, network.passphrase);
    expect(tx.operations).toHaveLength(1);
    const operation = tx.operations[0];
    expect(operation?.type).toBe("changeTrust");
    if (operation?.type === "changeTrust" && operation.line instanceof Asset) {
      expect(operation.line.getCode()).toBe("USDC");
      expect(operation.line.getIssuer()).toBe(network.assetIssuer);
      expect(operation.limit).toBe("1000000.0000000");
    }
    tx.sign(key);
    const verified = verifySignedTransaction(
      quote.xdr,
      tx.toXDR(),
      key.publicKey(),
    );
    expect(transactionHash(verified)).toMatch(/^[a-f0-9]{64}$/);
    expect(quote.fee).toBe("0.0000100");
    expect(quote.reserve).toBe("0.5000000");
  });
  it("counts selling liabilities, subentries and sponsorship before signing", () => {
    const account = accountFixture(Keypair.random().publicKey());
    account.balances[0] = {
      asset_type: "native",
      balance: "1.5000100",
      buying_liabilities: "0.0000000",
      selling_liabilities: "0.0000001",
    };
    expect(() => buildTrustline(account, 5_000_000, 100)).toThrow(
      "More Testnet XLM",
    );
    account.balances[0] = {
      asset_type: "native",
      balance: "2.5000100",
      buying_liabilities: "0.0000000",
      selling_liabilities: "0.0000000",
    };
    Object.assign(account, {
      subentry_count: 2,
      num_sponsoring: 1,
      num_sponsored: 0,
    });
    expect(() => buildTrustline(account, 5_000_000, 100)).toThrow(
      "More Testnet XLM",
    );
    Object.assign(account, { num_sponsored: 1 });
    expect(buildTrustline(account, 5_000_000, 100).fee).toBe("0.0000100");
  });
  it("does not overwrite an existing trustline or accept an excessive fee", () => {
    const account = accountFixture(Keypair.random().publicKey());
    expect(() => buildTrustline(account, 5_000_000, 100001)).toThrow(
      "fee limit",
    );
    account.balances.push(usdcFixture(network.assetIssuer));
    expect(() => buildTrustline(account, 5_000_000, 100)).toThrow(
      "already has",
    );
  });
  it("rejects unsigned, wrong-signer, wrong-network and modified transaction envelopes", () => {
    const key = Keypair.random();
    const other = Keypair.random();
    const quote = buildTrustline(
      accountFixture(key.publicKey()),
      5_000_000,
      100,
    );
    expect(() =>
      verifySignedTransaction(quote.xdr, quote.xdr, key.publicKey()),
    ).toThrow("has not signed");
    const wrongSigner = TransactionBuilder.fromXDR(
      quote.xdr,
      network.passphrase,
    );
    wrongSigner.sign(other);
    expect(() =>
      verifySignedTransaction(quote.xdr, wrongSigner.toXDR(), key.publicKey()),
    ).toThrow();
    const wrongNetwork = TransactionBuilder.fromXDR(
      quote.xdr,
      "Public Global Stellar Network ; September 2015",
    );
    wrongNetwork.sign(key);
    expect(() =>
      verifySignedTransaction(quote.xdr, wrongNetwork.toXDR(), key.publicKey()),
    ).toThrow();
    const modified = buildTrustline(
      accountFixture(key.publicKey()),
      5_000_000,
      200,
    );
    const modifiedTx = TransactionBuilder.fromXDR(
      modified.xdr,
      network.passphrase,
    );
    modifiedTx.sign(key);
    expect(() =>
      verifySignedTransaction(quote.xdr, modifiedTx.toXDR(), key.publicKey()),
    ).toThrow("different transaction");
  });
});
