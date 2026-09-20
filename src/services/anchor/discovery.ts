import { StellarToml } from "@stellar/stellar-sdk";
import { network } from "@/config/network";
import { AnchorError } from "./errors";
import type { AnchorDiscovery } from "./types";

const ENDPOINT_KEYS = [
  ["WEB_AUTH_ENDPOINT", "webAuthEndpoint"],
  ["TRANSFER_SERVER", "transferServer"],
  ["KYC_SERVER", "kycServer"],
  ["ANCHOR_QUOTE_SERVER", "quoteServer"],
] as const;

/**
 * SEP-1 discovery and verification. Every endpoint the anchor publishes must
 * live on its own home domain, and its signing key/asset must match the
 * values ArrivalPay expects, before any wallet signature is requested.
 * Reference: https://skills.stellar.org/skills/anchors/SKILL.md
 */
export async function discoverAnchor(): Promise<AnchorDiscovery> {
  const homeDomain = network.anchorHomeDomain;
  let toml: StellarToml.Api.StellarToml;
  try {
    toml = await StellarToml.Resolver.resolve(homeDomain, {
      allowHttp: false,
      timeout: 15_000,
    });
  } catch {
    throw new AnchorError(
      "DISCOVERY_FAILED",
      "Could not read the anchor's stellar.toml. Check your connection and try again.",
    );
  }

  if (toml.NETWORK_PASSPHRASE !== network.passphrase)
    throw new AnchorError(
      "DOMAIN_MISMATCH",
      "The anchor is not configured for Stellar Testnet.",
    );
  if (toml.SIGNING_KEY !== network.anchorSigningKey)
    throw new AnchorError(
      "SIGNING_KEY_MISMATCH",
      "The anchor's signing key does not match the expected TR Mock Anchor key.",
    );

  const currency = toml.CURRENCIES?.find(
    (entry) => entry.code === network.assetCode && entry.issuer === network.assetIssuer,
  );
  if (!currency)
    throw new AnchorError(
      "ASSET_MISMATCH",
      "The anchor does not list the expected USDC asset and issuer.",
    );

  const endpoints: Record<string, string> = {};
  for (const [tomlKey, field] of ENDPOINT_KEYS) {
    const value = toml[tomlKey];
    if (!value)
      throw new AnchorError(
        "INVALID_RESPONSE",
        `The anchor did not publish ${tomlKey}.`,
      );
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new AnchorError(
        "INVALID_RESPONSE",
        `The anchor published an invalid ${tomlKey}.`,
      );
    }
    if (url.protocol !== "https:" || url.host !== homeDomain)
      throw new AnchorError(
        "DOMAIN_MISMATCH",
        "The anchor's published endpoints do not stay on its own domain.",
      );
    endpoints[field] = value;
  }

  return {
    homeDomain,
    webAuthEndpoint: endpoints.webAuthEndpoint!,
    transferServer: endpoints.transferServer!,
    kycServer: endpoints.kycServer!,
    quoteServer: endpoints.quoteServer!,
    signingKey: toml.SIGNING_KEY!,
    assetIssuer: currency.issuer!,
  };
}
