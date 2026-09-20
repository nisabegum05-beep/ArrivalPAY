import { Account, Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { afterEach, expect, it, vi } from "vitest";
import { network } from "@/config/network";
import { sorobanServer } from "./client";
import { submitInvocation } from "./intents";

afterEach(() => vi.restoreAllMocks());
it("preserves a transaction hash on transport loss instead of declaring a failed submission", async () => {
  const key = Keypair.random();
  const tx = new TransactionBuilder(new Account(key.publicKey(), "1"), { fee: "100", networkPassphrase: network.passphrase })
    .addOperation(Operation.manageData({ name: "fixture", value: "1" })).setTimeout(60).build();
  const xdr = tx.toXDR(); tx.sign(key);
  vi.spyOn(sorobanServer, "sendTransaction").mockRejectedValue(new Error("socket dropped after broadcast"));
  const result = await submitInvocation({ method: "fixture", xdr, sourceAddress: key.publicKey() }, tx.toXDR());
  expect(result.state).toBe("pending");
  expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
});
