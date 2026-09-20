import { Keypair } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { createRequest, parseRequestUrl, requestUrl, validateRequest } from "./request";
const origin = "https://arrivalpay.example";
describe("QR request trust boundaries", () => {
  it("round trips a same-origin request with a text memo under 28 bytes", () => {
    const r = createRequest(Keypair.random().publicKey(), "1.0000001");
    expect(parseRequestUrl(requestUrl(r, origin), origin)).toEqual(r);
    expect(new TextEncoder().encode(r.reference).length).toBeLessThanOrEqual(28);
  });
  it("rejects mainnet, invalid recipients, excess precision, stale requests and excessive amounts", () => {
    const r = createRequest(Keypair.random().publicKey(), "1");
    for (const patch of [{ network: "public" }, { recipient: "G".repeat(56) }, { amount: "1.00000001" }, { amount: "10001" }, { amount: "0" }, { amount: "1e3" }, { expiresAt: 0 }])
      expect(() => validateRequest({ ...r, ...patch })).toThrow();
  });
  it("rejects payment links from other origins or paths", () => {
    const r = createRequest(Keypair.random().publicKey(), "1");
    expect(() => parseRequestUrl(requestUrl(r, "https://attacker.example"), origin)).toThrow();
    expect(() => parseRequestUrl(requestUrl(r, origin).replace("/arrival-services", "/student"), origin)).toThrow();
  });
});
