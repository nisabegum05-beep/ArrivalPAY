import { Networks, StellarToml } from "@stellar/stellar-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { network } from "@/config/network";
import { discoverAnchor } from "./discovery";
import { AnchorError } from "./errors";

const HOST = network.anchorHomeDomain;
const validToml: StellarToml.Api.StellarToml = {
  NETWORK_PASSPHRASE: Networks.TESTNET,
  SIGNING_KEY: network.anchorSigningKey,
  WEB_AUTH_ENDPOINT: `https://${HOST}/auth`,
  TRANSFER_SERVER: `https://${HOST}/sep6`,
  KYC_SERVER: `https://${HOST}/sep12`,
  ANCHOR_QUOTE_SERVER: `https://${HOST}/sep38`,
  CURRENCIES: [
    { code: network.assetCode, issuer: network.assetIssuer, status: "test" },
  ],
};

function mockResolve(toml: StellarToml.Api.StellarToml) {
  vi.spyOn(StellarToml.Resolver, "resolve").mockResolvedValue(toml);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SEP-1 discovery safety", () => {
  it("accepts a toml that matches the expected network, key and asset", async () => {
    mockResolve(validToml);
    const discovery = await discoverAnchor();
    expect(discovery.webAuthEndpoint).toBe(validToml.WEB_AUTH_ENDPOINT);
    expect(discovery.assetIssuer).toBe(network.assetIssuer);
  });

  it("rejects a wrong network passphrase", async () => {
    mockResolve({ ...validToml, NETWORK_PASSPHRASE: Networks.PUBLIC });
    await expect(discoverAnchor()).rejects.toThrow(AnchorError);
  });

  it("rejects a signing key that does not match the expected anchor", async () => {
    mockResolve({ ...validToml, SIGNING_KEY: "GA" + "A".repeat(54) });
    const error = await discoverAnchor().catch((e) => e);
    expect(error).toBeInstanceOf(AnchorError);
    expect((error as AnchorError).code).toBe("SIGNING_KEY_MISMATCH");
  });

  it("rejects a currency list missing the expected USDC issuer", async () => {
    mockResolve({ ...validToml, CURRENCIES: [{ code: "USDC", issuer: "GDIFFERENT" }] });
    const error = await discoverAnchor().catch((e) => e);
    expect((error as AnchorError).code).toBe("ASSET_MISMATCH");
  });

  it("rejects an endpoint published on a different domain, even over https", async () => {
    mockResolve({ ...validToml, TRANSFER_SERVER: "https://attacker.example/sep6" });
    const error = await discoverAnchor().catch((e) => e);
    expect((error as AnchorError).code).toBe("DOMAIN_MISMATCH");
  });

  it("rejects a non-https endpoint", async () => {
    mockResolve({ ...validToml, WEB_AUTH_ENDPOINT: `http://${HOST}/auth` });
    const error = await discoverAnchor().catch((e) => e);
    expect((error as AnchorError).code).toBe("DOMAIN_MISMATCH");
  });

  it("wraps a resolver failure as a discovery error", async () => {
    vi.spyOn(StellarToml.Resolver, "resolve").mockRejectedValue(new Error("boom"));
    const error = await discoverAnchor().catch((e) => e);
    expect((error as AnchorError).code).toBe("DISCOVERY_FAILED");
  });
});
