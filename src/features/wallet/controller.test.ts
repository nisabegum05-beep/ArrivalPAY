import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { describe, expect, it, vi } from "vitest";
import { network } from "@/config/network";
import { accountFixture } from "../../../tests/fixtures/stellar-account";
import { readAccount } from "@/services/stellar/account";
import { buildTrustline } from "@/services/stellar/trustline";
import { StellarError } from "@/services/stellar/errors";
import { verifySignedTransaction } from "@/services/stellar/transactions";
import { WalletController } from "./controller";

function setup() {
  const key = Keypair.random();
  const identity: { address: string; networkPassphrase: string } = {
    address: key.publicKey(),
    networkPassphrase: network.passphrase,
  };
  const quote = buildTrustline(
    accountFixture(identity.address),
    5_000_000,
    100,
  );
  const adapter = {
    connect: vi.fn(async () => identity),
    identity: vi.fn(async () => identity),
    disconnect: vi.fn(async () => {}),
    sign: vi.fn(async (xdr: string) => {
      const tx = TransactionBuilder.fromXDR(xdr, network.passphrase);
      tx.sign(key);
      return tx.toXDR();
    }),
  };
  const api = {
    loadAccount: vi.fn(async () =>
      readAccount(accountFixture(identity.address)),
    ),
    prepareTrustline: vi.fn(async () => quote),
    verifySignedTransaction,
    submitSignedTransaction: vi.fn(async () => ({
      hash: "a".repeat(64),
      state: "pending" as const,
    })),
    transactionStatus: vi.fn(async () => ({
      hash: "a".repeat(64),
      state: "confirmed" as const,
    })),
  };
  return {
    controller: new WalletController(adapter, api),
    adapter,
    api,
    identity,
    quote,
  };
}

describe("wallet session and submission races", () => {
  it("rejects Mainnet before reading balances", async () => {
    const { controller, adapter, api, identity } = setup();
    adapter.connect.mockResolvedValue({
      ...identity,
      networkPassphrase: "mainnet",
    });
    await controller.connect();
    expect(controller.getSnapshot().error?.code).toBe("WRONG_NETWORK");
    expect(api.loadAccount).not.toHaveBeenCalled();
  });
  it("does not restore a connection after disconnecting an in-flight request", async () => {
    const { controller, adapter, identity } = setup();
    let finish!: (value: typeof identity) => void;
    adapter.connect.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const connecting = controller.connect();
    await controller.disconnect();
    finish(identity);
    await connecting;
    expect(controller.getSnapshot().address).toBeNull();
  });
  it("clears the balance when the wallet account changes", async () => {
    const { controller, adapter, identity } = setup();
    await controller.connect();
    adapter.identity.mockResolvedValue({
      ...identity,
      address: Keypair.random().publicKey(),
    });
    await controller.checkConnection();
    expect(controller.getSnapshot().account).toBeNull();
    expect(controller.getSnapshot().error?.code).toBe("WALLET_CHANGED");
  });
  it("checks the account again after the signing prompt, before submitting", async () => {
    const { controller, adapter, api, identity } = setup();
    await controller.connect();
    await controller.prepare();
    adapter.identity
      .mockResolvedValueOnce(identity)
      .mockResolvedValue({
        ...identity,
        address: Keypair.random().publicKey(),
      });
    await controller.confirm();
    expect(adapter.sign).toHaveBeenCalledTimes(1);
    expect(api.submitSignedTransaction).not.toHaveBeenCalled();
  });
  it("rejects duplicate signing and keeps uncertain results pending until queried", async () => {
    const { controller, adapter, api } = setup();
    await controller.connect();
    await controller.prepare();
    await Promise.all([controller.confirm(), controller.confirm()]);
    expect(adapter.sign).toHaveBeenCalledTimes(1);
    expect(api.submitSignedTransaction).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().receipt?.state).toBe("pending");
    await controller.prepare();
    expect(api.prepareTrustline).toHaveBeenCalledTimes(1);
    await controller.refresh();
    expect(controller.getSnapshot().receipt?.state).toBe("confirmed");
  });
  it("does not submit after a rejected signature", async () => {
    const { controller, adapter, api } = setup();
    await controller.connect();
    await controller.prepare();
    adapter.sign.mockRejectedValue(
      new StellarError("WALLET_REJECTED", "Signing was not approved."),
    );
    await controller.confirm();
    expect(api.submitSignedTransaction).not.toHaveBeenCalled();
    expect(controller.getSnapshot().busy).toBeNull();
    expect(controller.getSnapshot().error?.code).toBe("WALLET_REJECTED");
  });
});
