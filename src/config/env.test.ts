import { describe, expect, it } from "vitest";
import { parsePublicEnvironment } from "./env";

describe("public environment safety boundaries", () => {
  it("supports empty setup, defaulting to the phase 5 deployed contract", () => {
    const config = parsePublicEnvironment({
      NEXT_PUBLIC_STELLAR_NETWORK: "",
      NEXT_PUBLIC_INTENT_CONTRACT_ID: "",
    });
    expect(config.network).toBe("testnet");
    expect(config.contractId).toBe(
      "CDL4LVIFDJGLZCYJ7W2644NSYKPGMC6K5XPEPYHRTXPWZ2LNWBCD7NNK",
    );
    expect(config.anchorUrl).toBe("https://tr-mock-anchor.fly.dev");
  });

  it("accepts an override pointing at a different, syntactically valid contract", () => {
    const other = `C${"A".repeat(55)}`;
    expect(
      parsePublicEnvironment({ NEXT_PUBLIC_INTENT_CONTRACT_ID: other })
        .contractId,
    ).toBe(other);
  });

  it.each(["mainnet", "public", "futurenet"])(
    "rejects the unsupported %s network",
    (network) => {
      expect(() =>
        parsePublicEnvironment({ NEXT_PUBLIC_STELLAR_NETWORK: network }),
      ).toThrow("Testnet only");
    },
  );

  it.each([
    "http://tr-mock-anchor.fly.dev",
    "https://tr-mock-anchor.fly.dev.attacker.example",
    "https://attacker.example",
    "https://secret@tr-mock-anchor.fly.dev",
    "https://tr-mock-anchor.fly.dev/auth",
    "https://tr-mock-anchor.fly.dev/?token=sensitive",
    "not a url",
  ])(
    "rejects an unsafe Anchor endpoint without echoing its value: %s",
    (endpoint) => {
      expect(() =>
        parsePublicEnvironment({ NEXT_PUBLIC_ANCHOR_URL: endpoint }),
      ).toThrow();
      try {
        parsePublicEnvironment({ NEXT_PUBLIC_ANCHOR_URL: endpoint });
      } catch (error) {
        expect((error as Error).message).not.toContain(endpoint);
      }
    },
  );

  it("rejects mainnet Horizon and RPC settings", () => {
    expect(() =>
      parsePublicEnvironment({
        NEXT_PUBLIC_HORIZON_URL: "https://horizon.stellar.org",
      }),
    ).toThrow();
    expect(() =>
      parsePublicEnvironment({
        NEXT_PUBLIC_STELLAR_RPC_URL: "https://mainnet.example",
      }),
    ).toThrow();
  });

  it("normalizes the supported endpoint with a trailing slash", () => {
    expect(
      parsePublicEnvironment({
        NEXT_PUBLIC_ANCHOR_URL: " https://tr-mock-anchor.fly.dev/ ",
      }).anchorUrl,
    ).toBe("https://tr-mock-anchor.fly.dev");
  });

  it("rejects a wallet address or arbitrary text in the contract field", () => {
    for (const value of ["not-deployed", `G${"A".repeat(55)}`, "C-short"]) {
      expect(() =>
        parsePublicEnvironment({ NEXT_PUBLIC_INTENT_CONTRACT_ID: value }),
      ).toThrow("contract address syntax");
    }
  });
});
