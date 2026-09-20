import { Keypair } from "@stellar/stellar-sdk";
import { describe, expect, it, vi } from "vitest";
import { network } from "@/config/network";
import { AnchorError } from "@/services/anchor/errors";
import type {
  AnchorDiscovery,
  AnchorQuote,
  AnchorSession,
  AnchorTransferInfo,
} from "@/services/anchor/types";
import { AnchorController } from "./controller";

function setup() {
  const key = Keypair.random();
  const address = key.publicKey();
  const identity = { address, networkPassphrase: network.passphrase };
  const discovery: AnchorDiscovery = {
    homeDomain: "tr-mock-anchor.fly.dev",
    webAuthEndpoint: "https://tr-mock-anchor.fly.dev/auth",
    transferServer: "https://tr-mock-anchor.fly.dev/sep6",
    kycServer: "https://tr-mock-anchor.fly.dev/sep12",
    quoteServer: "https://tr-mock-anchor.fly.dev/sep38",
    signingKey: "GSIGN",
    assetIssuer: network.assetIssuer,
  };
  const session: AnchorSession = { token: "jwt", address, expiresAt: Date.now() + 60_000 };
  const info: AnchorTransferInfo = {
    depositEnabled: true,
    authenticationRequired: true,
    feePercent: 0.5,
    fundingMethods: ["bank_account"],
    claimableBalances: true,
  };
  const quote: AnchorQuote = {
    id: "qt_1",
    sellAsset: "iso4217:TRY",
    buyAsset: `stellar:USDC:${network.assetIssuer}`,
    sellAmount: "100.00",
    buyAmount: "2.0396090",
    price: "48.785078",
    feeAmount: "0.50",
    feeAsset: "iso4217:TRY",
    expiresAt: Date.now() + 60_000,
  };
  const adapter = {
    connect: vi.fn(async () => identity),
    identity: vi.fn(async () => identity),
    disconnect: vi.fn(async () => {}),
    sign: vi.fn(async (xdr: string) => xdr),
  };
  const api = {
    discoverAnchor: vi.fn(async () => discovery),
    requestChallenge: vi.fn(async () => ({ xdr: "unsigned-xdr" })),
    submitChallenge: vi.fn(async () => session),
    fetchTransferInfo: vi.fn(async () => info),
    requestQuote: vi.fn(async () => quote),
    requestDeposit: vi.fn(async () => ({
      id: "dep_1",
      how: "wire",
      ibanOrAccount: "TR00",
      transferMemo: "MEMO",
    })),
    simulateBankTransfer: vi.fn(async () => {}),
    getTransaction: vi.fn(async () => ({
      id: "dep_1",
      status: "pending_anchor" as const,
    })),
  };
  return { controller: new AnchorController(adapter, api), adapter, api, address, discovery, session, info, quote };
}

// verifySignedChallenge requires a real signature; stub adapter.sign to
// return the unsigned xdr as-is would fail verification, so these tests
// replace verifySignedChallenge indirectly by keeping the happy-path xdr
// round trip trivial through a spy on the module is unnecessary — instead
// we assert on the calls made up to that boundary and on error propagation.

describe("anchor session lifecycle", () => {
  it("stops before requesting a quote when there is no session", async () => {
    const { controller, api } = setup();
    await controller.requestQuote("100.00");
    expect(api.requestQuote).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range or malformed TRY amount without calling the anchor", async () => {
    const { controller, api, discovery, session } = setup();
    controller["update"]({ discovery, session } as never);
    await controller.requestQuote("0");
    await controller.requestQuote("-5.00");
    await controller.requestQuote("12.345");
    expect(api.requestQuote).not.toHaveBeenCalled();
  });

  it("blocks a deposit request once the quote has expired", async () => {
    const { controller, api, discovery, session } = setup();
    controller["update"]({
      discovery,
      session,
      quote: {
        id: "qt_expired",
        sellAsset: "iso4217:TRY",
        buyAsset: "stellar:USDC:X",
        sellAmount: "10.00",
        buyAmount: "0.2",
        price: "1",
        feeAmount: "0",
        feeAsset: "iso4217:TRY",
        expiresAt: Date.now() - 1_000,
      },
    } as never);
    await controller.startDeposit(session.address);
    expect(api.requestDeposit).not.toHaveBeenCalled();
    expect(controller.getSnapshot().error?.code).toBe("QUOTE_EXPIRED");
  });

  it("surfaces a session-expired error instead of silently retrying", async () => {
    const { controller, api, discovery, session } = setup();
    controller["update"]({
      discovery,
      session: { ...session, expiresAt: Date.now() - 1_000 },
    } as never);
    await controller.requestQuote("100.00");
    expect(api.requestQuote).not.toHaveBeenCalled();
    expect(controller.getSnapshot().error?.code).toBe("SESSION_EXPIRED");
  });

  it("wraps a discovery failure as a safe AnchorError and clears busy state", async () => {
    const { controller, api, address } = setup();
    api.discoverAnchor.mockRejectedValue(new AnchorError("DISCOVERY_FAILED", "down"));
    await controller.connect(address);
    expect(controller.getSnapshot().busy).toBeNull();
    expect(controller.getSnapshot().error?.code).toBe("DISCOVERY_FAILED");
  });

  it("does not request a quote while a request is already in flight", async () => {
    const { controller, api, discovery, session } = setup();
    controller["update"]({ discovery, session } as never);
    let resolveQuote!: (value: Awaited<ReturnType<typeof api.requestQuote>>) => void;
    api.requestQuote.mockReturnValue(
      new Promise((resolve) => {
        resolveQuote = resolve;
      }),
    );
    const first = controller.requestQuote("100.00");
    await controller.requestQuote("200.00");
    expect(api.requestQuote).toHaveBeenCalledTimes(1);
    resolveQuote({
      id: "q",
      sellAsset: "iso4217:TRY",
      buyAsset: "x",
      sellAmount: "100.00",
      buyAmount: "1",
      price: "1",
      feeAmount: "0",
      feeAsset: "iso4217:TRY",
      expiresAt: Date.now() + 60_000,
    });
    await first;
  });
});
