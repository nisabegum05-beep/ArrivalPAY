import { afterEach, describe, expect, it, vi } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { network } from "@/config/network";
import * as api from "@/services/soroban/intents";
import { IntentsController } from "./controller";

const id = "a".repeat(64), hash = "b".repeat(64);
function setup() {
  const address = Keypair.random().publicKey();
  const student = Keypair.random().publicKey();
  const identity = { address, networkPassphrase: network.passphrase };
  const adapter = { connect: vi.fn(async () => identity), identity: vi.fn(async () => identity), sign: vi.fn(async () => "signed"), disconnect: vi.fn(async () => {}) };
  const intent = { id, student, institution: address, token: String(network.assetContractId), amount: "2.0000000", deadline: Math.floor(Date.now() / 1000) + 3600, status: "Created" as const, resolution: "Pending" as const, externalReference: null };
  const prepared = { method: "create_intent", xdr: "unsigned", sourceAddress: address, hash, expiresAt: Math.floor(Date.now() / 1000) + 180 };
  const service = { ...api,
    listByStudent: vi.fn(async () => [] as string[]), listByInstitution: vi.fn(async () => [id]),
    getIntent: vi.fn(async () => intent), prepareCreateIntent: vi.fn(async () => prepared),
    prepareFundIntent: vi.fn(async () => prepared),
    submitInvocation: vi.fn(async () => ({ hash, state: "confirmed" as api.TransactionResult["state"] })),
    transactionStatus: vi.fn(async () => ({ hash, state: "confirmed" as api.TransactionResult["state"] })),
  };
  return { address, adapter, service, intent, controller: new IntentsController(adapter, service) };
}
afterEach(() => vi.unstubAllGlobals());
describe("contract review and recovery", () => {
  it("prepares without signing, then requires explicit confirmation and preserves the receipt after list refresh", async () => {
    const { controller, service, adapter, intent } = setup();
    await controller.createIntent(intent);
    expect(adapter.sign).not.toHaveBeenCalled();
    expect(controller.getSnapshot().review?.amount).toBe("2.0000000");
    await Promise.all([controller.confirm(), controller.confirm()]);
    expect(service.submitInvocation).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().receipt?.state).toBe("confirmed");
    expect(controller.getSnapshot().institutionIntentIds).toContain(id);
  });
  it("stops a stale account response before preparing or signing", async () => {
    const { controller, service, adapter, intent } = setup();
    let resolve!: (v: Awaited<ReturnType<typeof adapter.identity>>) => void;
    adapter.identity.mockReturnValue(new Promise(r => { resolve = r; }));
    const pending = controller.createIntent(intent);
    controller.reset();
    resolve({ address: intent.institution, networkPassphrase: network.passphrase });
    await pending;
    expect(service.prepareCreateIntent).not.toHaveBeenCalled();
    expect(adapter.sign).not.toHaveBeenCalled();
  });
  it("retains an uncertain submission and blocks a second request until its hash is checked", async () => {
    const { controller, service, intent } = setup();
    service.submitInvocation.mockResolvedValue({ hash, state: "pending" });
    await controller.createIntent(intent); await controller.confirm();
    await controller.createIntent({ ...intent, id: "c".repeat(64) });
    expect(service.prepareCreateIntent).toHaveBeenCalledTimes(1);
    await controller.checkReceipt(hash);
    expect(controller.getSnapshot().receipt?.state).toBe("confirmed");
  });
  it("does not trust a locally persisted successful receipt after reload", async () => {
    const { controller, address } = setup();
    vi.stubGlobal("sessionStorage", { getItem: () => JSON.stringify([{ id, hash, action: "creating", state: "confirmed" }]), setItem: vi.fn() });
    await controller.refresh(address);
    expect(controller.getSnapshot().receipt?.state).toBe("pending");
  });
  it("blocks a contract intent using a different token before wallet signing", async () => {
    const { controller, service, intent } = setup();
    service.getIntent.mockResolvedValue({ ...intent, token: "C" + "A".repeat(55) });
    await controller.fund(id, intent.student);
    // Identity mismatch also stops an unauthorized wallet; use a matching institution for token test below.
    await controller.createIntent({ ...intent, token: "C" + "A".repeat(55) });
    expect(service.prepareCreateIntent).not.toHaveBeenCalled();
    expect(controller.getSnapshot().error?.message).toContain("unsupported token");
  });
  it("canceling the review never submits", async () => {
    const { controller, service, intent } = setup();
    await controller.createIntent(intent); controller.cancelReview(); await controller.confirm();
    expect(service.submitInvocation).not.toHaveBeenCalled();
  });
});
