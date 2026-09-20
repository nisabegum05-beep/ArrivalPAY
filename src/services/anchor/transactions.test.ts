import { afterEach, describe, expect, it, vi } from "vitest";
import { AnchorError } from "./errors";
import { getTransaction, listTransactions } from "./transactions";
import type { AnchorDiscovery, AnchorSession } from "./types";

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

afterEach(() => vi.unstubAllGlobals());

describe("anchor transaction status", () => {
  it("reads a pending_anchor transaction from the real response shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            transaction: {
              id: "sep_45n85u24w12b3lu8gs0i",
              status: "pending_anchor",
              amount_in: "100.00",
              amount_out: "2.0396090",
              stellar_transaction_id: null,
              more_info_url: "https://tr-mock-anchor.fly.dev/sep6/tx/sep_45n85u24w12b3lu8gs0i",
            },
          }),
          { status: 200 },
        ),
      ),
    );
    const tx = await getTransaction(discovery, session, "sep_45n85u24w12b3lu8gs0i");
    expect(tx.status).toBe("pending_anchor");
    expect(tx.stellarTransactionId).toBeUndefined();
  });

  it("treats an anchor status this build does not recognize as an error state, not silent progress", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ transaction: { id: "x", status: "some_future_status" } }),
          { status: 200 },
        ),
      ),
    );
    const tx = await getTransaction(discovery, session, "x");
    expect(tx.status).toBe("error");
  });

  it("rejects a response with no transaction body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
    await expect(getTransaction(discovery, session, "x")).rejects.toThrow(AnchorError);
  });

  it("lists transactions, defaulting to an empty array rather than throwing on a malformed body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
    expect(await listTransactions(discovery, session)).toEqual([]);
  });
});
