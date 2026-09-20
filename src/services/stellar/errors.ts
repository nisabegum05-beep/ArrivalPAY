export type StellarErrorCode =
  | "WALLET_MISSING"
  | "WALLET_REJECTED"
  | "WRONG_NETWORK"
  | "WALLET_CHANGED"
  | "ACCOUNT_MISSING"
  | "LOW_RESERVE"
  | "TRUSTLINE_EXISTS"
  | "INVALID_RESPONSE"
  | "TRANSACTION_FAILED"
  | "NETWORK";

export class StellarError extends Error {
  constructor(
    public readonly code: StellarErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StellarError";
  }
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function httpStatus(error: unknown): number | undefined {
  const value = object(error);
  const status = object(value.response).status ?? value.status;
  return typeof status === "number" ? status : undefined;
}

export function transactionCodes(error: unknown): string[] {
  const body = object(object(object(error).response).data);
  const codes = object(object(body.extras).result_codes);
  return [
    codes.transaction,
    ...(Array.isArray(codes.operations) ? codes.operations : []),
  ].filter((value): value is string => typeof value === "string");
}

export function safeError(error: unknown): StellarError {
  if (error instanceof StellarError) return error;
  const codes = transactionCodes(error);
  if (
    codes.some((code) =>
      ["op_low_reserve", "tx_insufficient_balance"].includes(code),
    )
  ) {
    return new StellarError(
      "LOW_RESERVE",
      "Your account needs more Testnet XLM for the reserve and network fee. Add test funds, then refresh.",
    );
  }
  if (codes.includes("tx_bad_seq"))
    return new StellarError(
      "TRANSACTION_FAILED",
      "The account changed before this transaction was accepted. Refresh the balance before trying again.",
    );
  if (codes.includes("tx_bad_auth"))
    return new StellarError(
      "TRANSACTION_FAILED",
      "The wallet signature was not accepted. Check the selected account and its signing permissions.",
    );
  if (codes.includes("tx_too_late"))
    return new StellarError(
      "TRANSACTION_FAILED",
      "The transaction expired. Refresh and prepare a new USDC request.",
    );
  if (codes.length)
    return new StellarError(
      "TRANSACTION_FAILED",
      "Stellar rejected this transaction. Refresh your account before preparing another request.",
    );
  return new StellarError(
    "NETWORK",
    "Could not reach Stellar Testnet. Check your connection and try again.",
  );
}
