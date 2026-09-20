import { AnchorError } from "./errors";
import { fetchJson } from "./http";
import type { AnchorDiscovery, AnchorTransferInfo } from "./types";

type Sep6InfoResponse = {
  deposit?: Record<
    string,
    {
      enabled?: boolean;
      authentication_required?: boolean;
      fee_percent?: number;
      funding_methods?: string[];
    }
  >;
  features?: { claimable_balances?: boolean };
};

/** SEP-6 /info: capabilities, fee shape and funding methods for the asset. */
export async function fetchTransferInfo(
  discovery: AnchorDiscovery,
  assetCode: string,
): Promise<AnchorTransferInfo> {
  const body = await fetchJson<Sep6InfoResponse>(
    `${discovery.transferServer}/info`,
  );
  const asset = body.deposit?.[assetCode];
  if (!asset)
    throw new AnchorError(
      "UNSUPPORTED_ASSET",
      `The anchor does not support ${assetCode} deposits.`,
    );
  return {
    depositEnabled: !!asset.enabled,
    authenticationRequired: !!asset.authentication_required,
    feePercent: typeof asset.fee_percent === "number" ? asset.fee_percent : 0,
    fundingMethods: Array.isArray(asset.funding_methods)
      ? asset.funding_methods
      : [],
    claimableBalances: !!body.features?.claimable_balances,
  };
}
