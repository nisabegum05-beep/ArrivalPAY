import { afterEach, describe, expect, it, vi } from "vitest";
import { AnchorError } from "./errors";
import { quoteExpired, requestQuote } from "./quote";
import type { AnchorDiscovery, AnchorSession } from "./types";

const discovery: AnchorDiscovery = {
  homeDomain: "tr-mock-anchor.fly.dev",
  webAuthEndpoint: "https://tr-mock-anchor.fly.dev/auth",
  transferServer: "https://tr-mock-anchor.fly.dev/sep6",
  kycServer: "https://tr-mock-anchor.fly.dev/sep12",
  quoteServer: "https://tr-mock-anchor.fly.dev/sep38",
  signingKey: "GSIGN",
  assetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
};
const session: AnchorSession = {
  token: "jwt",
  address: "GCLIENT",
  expiresAt: Date.now() + 60_000,
};

// Real response captured from a live TR Mock Anchor POST /sep38/quote call.
const liveQuoteResponse = {
  id: "qt_sb16bsmp592wrgnluqvc",
  expires_at: "2026-09-20T03:08:28.683Z",
  total_price: "49.0290051",
  price: "48.785078",
  sell_asset: "iso4217:TRY",
  sell_amount: "100.00",
  buy_asset: `stellar:USDC:${discovery.assetIssuer}`,
  buy_amount: "2.0396090",
  fee: {
    total: "0.50",
    asset: "iso4217:TRY",
    details: [{ name: "spread", description: "50 bps from the USD/TRY mid rate", amount: "0.50" }],
  },
};

afterEach(() => vi.unstubAllGlobals());

describe("SEP-38 firm quote", () => {
  it("parses a real anchor quote response into the locked-amount shape the deposit step needs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ...liveQuoteResponse, expires_at: new Date(Date.now() + 60000).toISOString() }), { status: 201 })),
    );
    const quote = await requestQuote(discovery, session, "100.00");
    expect(quote.id).toBe("qt_sb16bsmp592wrgnluqvc");
    expect(quote.buyAmount).toBe("2.0396090");
    expect(quote.feeAmount).toBe("0.50");
    expect(quoteExpired(quote)).toBe(false);
  });

  it("rejects a quote for another issuer or amount", async () => {
    for (const patch of [{ buy_asset: "stellar:USDC:OTHER" }, { sell_amount: "200.00" }]) {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ...liveQuoteResponse, ...patch, expires_at: new Date(Date.now() + 60000).toISOString() }), { status: 201 })));
      await expect(requestQuote(discovery, session, "100.00")).rejects.toThrow(AnchorError);
    }
  });

  it("rejects an incomplete quote instead of guessing an id or expiry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ price: "1" }), { status: 201 })),
    );
    await expect(requestQuote(discovery, session, "100.00")).rejects.toThrow(AnchorError);
  });

  it("maps an expired-session response to a re-authenticate error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ type: "authentication_required", error: "expired" }), {
          status: 403,
        }),
      ),
    );
    const error = await requestQuote(discovery, session, "100.00").catch((e) => e);
    expect((error as AnchorError).code).toBe("SESSION_EXPIRED");
  });
});
