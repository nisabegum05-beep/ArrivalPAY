import { StellarError } from "@/services/stellar/errors";

export type SorobanErrorCode =
  | "ALREADY_EXISTS"
  | "NOT_FOUND"
  | "INVALID_AMOUNT"
  | "INVALID_DEADLINE"
  | "WRONG_STATE"
  | "DEADLINE_PASSED"
  | "DEADLINE_NOT_REACHED"
  | "ACCOUNT_MISSING"
  | "WALLET_REJECTED"
  | "WALLET_CHANGED"
  | "SIMULATION_FAILED"
  | "TRANSACTION_FAILED"
  | "INVALID_RESPONSE"
  | "NETWORK";

export class SorobanError extends Error {
  constructor(
    public readonly code: SorobanErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SorobanError";
  }
}

/** Mirrors contracts/conditional-payment-intent/src/errors.rs exactly. */
const CONTRACT_ERRORS: Record<number, [SorobanErrorCode, string]> = {
  1: ["ALREADY_EXISTS", "An intent with this id already exists."],
  2: ["NOT_FOUND", "This intent could not be found."],
  3: ["INVALID_AMOUNT", "The amount must be greater than zero."],
  4: ["INVALID_DEADLINE", "The deadline must be in the future."],
  5: [
    "WRONG_STATE",
    "This action is not valid for the intent's current status.",
  ],
  6: [
    "DEADLINE_PASSED",
    "The deadline for this action has already passed.",
  ],
  7: [
    "DEADLINE_NOT_REACHED",
    "The deadline has not been reached yet.",
  ],
};

/** Soroban RPC surfaces a failed `Result::Err` as a message containing
 * "Error(Contract, #N)". There is no structured field for it. */
export function parseContractErrorCode(message: string): number | undefined {
  const match = /Error\(Contract, #(\d+)\)/.exec(message);
  return match ? Number(match[1]) : undefined;
}

export function contractError(code: number): SorobanError {
  const [errorCode, text] = CONTRACT_ERRORS[code] ?? [
    "INVALID_RESPONSE",
    "The contract rejected this call.",
  ];
  return new SorobanError(errorCode, text);
}

export function safeSimulationError(message: string): SorobanError {
  const code = parseContractErrorCode(message);
  if (code !== undefined) return contractError(code);
  return new SorobanError(
    "SIMULATION_FAILED",
    "The network rejected this request before any signature was needed. Refresh and try again.",
  );
}

export function safeError(error: unknown): SorobanError {
  if (error instanceof SorobanError) return error;
  if (error instanceof StellarError) return new SorobanError(
    error.code === "WALLET_REJECTED" ? "WALLET_REJECTED" : "WALLET_CHANGED", error.message,
  );
  return new SorobanError(
    "NETWORK",
    "Could not reach Stellar Testnet. Check your connection and try again.",
  );
}
