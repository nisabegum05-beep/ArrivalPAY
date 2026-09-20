import { StrKey, type Horizon } from "@stellar/stellar-sdk";
import { network } from "@/config/network";
import { parseAmount } from "@/utils/amount";
import { horizon } from "./client";
import { httpStatus, safeError, StellarError } from "./errors";

export type AccountSnapshot = {
  address: string;
  xlm: string;
  usdc: string | null;
  usdcAccess: "missing" | "authorized" | "restricted" | "full";
  usdcLimit: string | null;
  ledger: number;
};

export function assertAddress(address: string) {
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw new StellarError(
      "INVALID_RESPONSE",
      "The wallet did not return a valid Stellar account address.",
    );
  }
}

export function readAccount(
  account: Pick<
    Horizon.AccountResponse,
    "account_id" | "balances" | "last_modified_ledger"
  >,
): AccountSnapshot {
  assertAddress(account.account_id);
  const native = account.balances.find(
    (balance) => balance.asset_type === "native",
  );
  const usdc = account.balances.find(
    (balance) =>
      (balance.asset_type === "credit_alphanum4" ||
        balance.asset_type === "credit_alphanum12") &&
      balance.asset_code === network.assetCode &&
      balance.asset_issuer === network.assetIssuer,
  );
  if (!native)
    throw new StellarError(
      "INVALID_RESPONSE",
      "Stellar returned an incomplete account. Refresh before continuing.",
    );
  parseAmount(native.balance);
  if (usdc && "asset_issuer" in usdc) {
    const remaining =
      parseAmount(usdc.limit) -
      parseAmount(usdc.balance) -
      parseAmount(usdc.buying_liabilities);
    return {
      address: account.account_id,
      xlm: native.balance,
      usdc: usdc.balance,
      usdcLimit: usdc.limit,
      usdcAccess: !usdc.is_authorized
        ? "restricted"
        : remaining <= 0n
          ? "full"
          : "authorized",
      ledger: account.last_modified_ledger,
    };
  }
  return {
    address: account.account_id,
    xlm: native.balance,
    usdc: null,
    usdcLimit: null,
    usdcAccess: "missing",
    ledger: account.last_modified_ledger,
  };
}

export async function loadAccount(
  address: string,
): Promise<AccountSnapshot | null> {
  assertAddress(address);
  try {
    const account = await horizon.loadAccount(address);
    if (account.account_id !== address)
      throw new StellarError(
        "INVALID_RESPONSE",
        "Stellar returned a different account. Please refresh.",
      );
    return readAccount(account);
  } catch (error) {
    if (httpStatus(error) === 404) return null;
    throw safeError(error);
  }
}
