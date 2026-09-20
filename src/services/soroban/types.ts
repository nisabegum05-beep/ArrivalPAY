/** Mirrors contracts/conditional-payment-intent/src/types.rs. Field order and
 * the u32 discriminants below must stay in sync with the deployed contract;
 * they are not independently re-derived at runtime. */

export type IntentStatus = "Created" | "Funded" | "Released" | "Refunded";
export type Resolution = "Pending" | "Approved" | "Rejected" | "Timeout";

const STATUS_BY_CODE: readonly IntentStatus[] = [
  "Created",
  "Funded",
  "Released",
  "Refunded",
];
const RESOLUTION_BY_CODE: readonly Resolution[] = [
  "Pending",
  "Approved",
  "Rejected",
  "Timeout",
];

export function statusFromCode(code: number): IntentStatus {
  const status = STATUS_BY_CODE[code];
  if (!status) throw new Error(`Unknown intent status code: ${code}`);
  return status;
}

export function resolutionFromCode(code: number): Resolution {
  const resolution = RESOLUTION_BY_CODE[code];
  if (!resolution) throw new Error(`Unknown resolution code: ${code}`);
  return resolution;
}

export type PaymentIntent = {
  id: string; // 64 lowercase hex chars (32 bytes)
  student: string;
  institution: string;
  token: string;
  /** Canonical decimal string, `src/utils/amount.ts` scale (7 decimals). */
  amount: string;
  /** Unix seconds. */
  deadline: number;
  externalReference: string | null; // 64 hex chars, or null
  status: IntentStatus;
  resolution: Resolution;
};

export function hexToId(hex: string): Buffer {
  if (!/^[0-9a-f]{64}$/i.test(hex))
    throw new Error("An intent id must be exactly 32 bytes (64 hex chars).");
  return Buffer.from(hex, "hex");
}

export function idToHex(id: Uint8Array): string {
  return Buffer.from(id).toString("hex");
}

/** Client-generated, not derived from any secret — only needs to be unique
 * enough to avoid an accidental collision with another live intent. */
export function randomIntentId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return idToHex(bytes);
}
