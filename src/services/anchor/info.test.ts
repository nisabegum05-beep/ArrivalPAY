import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTransferInfo } from "./info";
import { AnchorError } from "./errors";
import type { AnchorDiscovery } from "./types";

const discovery: AnchorDiscovery = {
  homeDomain: "tr-mock-anchor.fly.dev",
  webAuthEndpoint: "https://tr-mock-anchor.fly.dev/auth",
  transferServer: "https://tr-mock-anchor.fly.dev/sep6",
  kycServer: "https://tr-mock-anchor.fly.dev/sep12",
  quoteServer: "https://tr-mock-anchor.fly.dev/sep38",
  signingKey: "GSIGN",
  assetIssuer: "GISSUER",
};

afterEach(() => vi.unstubAllGlobals());

describe("SEP-6 info", () => {
  it("reads the live response shape for USDC deposit capabilities", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            deposit: {
              USDC: {
                enabled: true,
                authentication_required: true,
                fee_percent: 0.5,
                funding_methods: ["bank_account"],
              },
            },
            features: { claimable_balances: true },
          }),
          { status: 200 },
        ),
      ),
    );
    const info = await fetchTransferInfo(discovery, "USDC");
    expect(info).toEqual({
      depositEnabled: true,
      authenticationRequired: true,
      feePercent: 0.5,
      fundingMethods: ["bank_account"],
      claimableBalances: true,
    });
  });

  it("treats a missing asset entry as unsupported rather than silently defaulting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ deposit: {} }), { status: 200 })),
    );
    await expect(fetchTransferInfo(discovery, "USDC")).rejects.toThrow(AnchorError);
  });
});
