import { afterEach, describe, expect, it, vi } from "vitest";
import { requestDeposit, simulateBankTransfer } from "./deposit";
import { AnchorError } from "./errors";
import type { AnchorDiscovery, AnchorQuote, AnchorSession } from "./types";

const discovery: AnchorDiscovery = {
  homeDomain: "tr-mock-anchor.fly.dev",
  webAuthEndpoint: "https://tr-mock-anchor.fly.dev/auth",
  transferServer: "https://tr-mock-anchor.fly.dev/sep6",
  kycServer: "https://tr-mock-anchor.fly.dev/sep12",
  quoteServer: "https://tr-mock-anchor.fly.dev/sep38",
  signingKey: "GSIGN",
  assetIssuer: "GISSUER",
};
const session: AnchorSession = { token: "jwt", address: "GCLIENT", expiresAt: Date.now() + 60_000 };
const quote: AnchorQuote = {
  id: "qt_sb16bsmp592wrgnluqvc",
  sellAsset: "iso4217:TRY",
  buyAsset: "stellar:USDC:GISSUER",
  sellAmount: "100.00",
  buyAmount: "2.0396090",
  price: "48.785078",
  feeAmount: "0.50",
  feeAsset: "iso4217:TRY",
  expiresAt: Date.now() + 60_000,
};

// Real response captured from a live TR Mock Anchor GET /sep6/deposit-exchange call.
const liveDepositResponse = {
  id: "sep_45n85u24w12b3lu8gs0i",
  how: 'Send TRY to IBAN TR050009900000000000000001 (TR Mock Bank A.Ş.) with "TRMA-V7C3-3D4X" in the transfer description.',
  instructions: {
    bank_name: { value: "TR Mock Bank A.Ş.", description: "Bank holding the anchor account" },
    bank_account_number: { value: "TR050009900000000000000001", description: "IBAN" },
    external_transfer_memo: { value: "TRMA-V7C3-3D4X", description: "reference" },
  },
  eta: 5,
  fee_percent: 0.5,
  extra_info: { message: "Sandbox." },
};

afterEach(() => vi.unstubAllGlobals());

describe("SEP-6 deposit-exchange", () => {
  it("extracts the IBAN, memo and bank name a student must copy", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain("quote_id=qt_sb16bsmp592wrgnluqvc");
      expect(String(url)).toContain("amount=100.00");
      return new Response(JSON.stringify(liveDepositResponse), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const instructions = await requestDeposit(discovery, session, session.address, quote);
    expect(instructions.ibanOrAccount).toBe("TR050009900000000000000001");
    expect(instructions.transferMemo).toBe("TRMA-V7C3-3D4X");
    expect(instructions.bankName).toBe("TR Mock Bank A.Ş.");
  });

  it("rejects a response with no transaction id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ how: "x" }), { status: 200 })),
    );
    await expect(
      requestDeposit(discovery, session, session.address, quote),
    ).rejects.toThrow(AnchorError);
  });
});

describe("simulate-bank-transfer (sandbox only)", () => {
  it("always sends the quote's exact TRY amount, never the anchor's silent default", async () => {
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({ amount: "100.00" });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await simulateBankTransfer(discovery, session, "sep_45n85u24w12b3lu8gs0i", "100.00");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
