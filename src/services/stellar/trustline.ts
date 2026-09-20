import {
  Asset,
  Operation,
  TransactionBuilder,
  type Horizon,
} from "@stellar/stellar-sdk";
import { network } from "@/config/network";
import { formatAmount, parseAmount } from "@/utils/amount";
import { assertAddress, readAccount } from "./account";
import { horizon } from "./client";
import { httpStatus, safeError, StellarError } from "./errors";

export type TrustlineQuote = {
  xdr: string;
  fee: string;
  reserve: string;
  limit: string;
  expiresAt: number;
  address: string;
};
export const USDC_LIMIT = "1000000.0000000";

export function buildTrustline(
  account: Horizon.AccountResponse,
  baseReserve: number,
  fee: number,
): TrustlineQuote {
  const snapshot = readAccount(account);
  if (snapshot.usdcAccess !== "missing")
    throw new StellarError(
      "TRUSTLINE_EXISTS",
      "This account already has a USDC trustline. Refresh its status.",
    );
  if (
    ![baseReserve, fee].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    ) ||
    fee > 100_000
  ) {
    throw new StellarError(
      "INVALID_RESPONSE",
      "Network reserve or fee information is unavailable or exceeds the preview fee limit. Try again later.",
    );
  }
  const entries =
    2 + account.subentry_count + account.num_sponsoring - account.num_sponsored;
  if (!Number.isSafeInteger(entries) || entries < 0)
    throw new StellarError(
      "INVALID_RESPONSE",
      "The account reserve could not be verified.",
    );
  const native = account.balances.find(
    (balance) => balance.asset_type === "native",
  )!;
  const available =
    parseAmount(native.balance) - parseAmount(native.selling_liabilities);
  const required = BigInt(entries + 1) * BigInt(baseReserve) + BigInt(fee);
  if (available < required)
    throw new StellarError(
      "LOW_RESERVE",
      `More Testnet XLM is needed. This account needs at least ${formatAmount(required)} XLM outside selling liabilities to add USDC access.`,
    );
  const transaction = new TransactionBuilder(account, {
    fee: String(fee),
    networkPassphrase: network.passphrase,
  })
    .addOperation(
      Operation.changeTrust({
        asset: new Asset(network.assetCode, network.assetIssuer),
        limit: USDC_LIMIT,
      }),
    )
    .setTimeout(180)
    .build();
  return {
    xdr: transaction.toXDR(),
    fee: formatAmount(BigInt(fee)),
    reserve: formatAmount(BigInt(baseReserve)),
    limit: USDC_LIMIT,
    expiresAt: Number(transaction.timeBounds?.maxTime),
    address: snapshot.address,
  };
}

export async function prepareTrustline(
  address: string,
): Promise<TrustlineQuote> {
  assertAddress(address);
  try {
    const [account, ledgers, fee] = await Promise.all([
      horizon.loadAccount(address),
      horizon.ledgers().order("desc").limit(1).call(),
      horizon.fetchBaseFee(),
    ]);
    if (account.account_id !== address)
      throw new StellarError(
        "INVALID_RESPONSE",
        "Stellar returned an unexpected account.",
      );
    const reserve = ledgers.records[0]?.base_reserve_in_stroops;
    if (!reserve)
      throw new StellarError(
        "INVALID_RESPONSE",
        "The network reserve could not be loaded. Please retry.",
      );
    return buildTrustline(account, reserve, fee);
  } catch (error) {
    if (httpStatus(error) === 404)
      throw new StellarError(
        "ACCOUNT_MISSING",
        "Activate your Testnet account with test XLM before enabling USDC.",
      );
    throw safeError(error);
  }
}
