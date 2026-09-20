import { network } from "@/config/network";
import { StrKey } from "@stellar/stellar-sdk";
import { parseAmount, formatAmount } from "@/utils/amount";

export type ArrivalRequest = {
  version: 1; network: "testnet"; asset: "USDC"; issuer: string; recipient: string; amount: string;
  reference: string; expiresAt: number;
};
export function validateRequest(value: unknown, now = Date.now()): ArrivalRequest {
  if (!value || typeof value !== "object") throw new Error("This is not an ArrivalPay payment request.");
  const r = value as Partial<ArrivalRequest>;
  if (r.version !== 1 || r.network !== "testnet") throw new Error("Only ArrivalPay Testnet requests are supported.");
  if (r.asset !== "USDC" || r.issuer !== network.assetIssuer) throw new Error("The request must use canonical Testnet USDC.");
  if (typeof r.recipient !== "string" || !StrKey.isValidEd25519PublicKey(r.recipient)) throw new Error("The recipient address is invalid.");
  if (typeof r.reference !== "string" || !/^AP-[a-f0-9]{20}$/.test(r.reference)) throw new Error("The payment reference is invalid.");
  if (typeof r.expiresAt !== "number" || !Number.isSafeInteger(r.expiresAt) || r.expiresAt <= now / 1000 || r.expiresAt > now / 1000 + 86400) throw new Error("This request expired or has an invalid expiry. Ask for a new QR code.");
  if (typeof r.amount !== "string") throw new Error("The amount is invalid.");
  const units = parseAmount(r.amount);
  if (units <= 0n || units > parseAmount("10000")) throw new Error("Enter more than zero and at most 10,000 Testnet USDC.");
  return { version: 1, network: "testnet", asset: "USDC", issuer: network.assetIssuer, recipient: r.recipient, amount: formatAmount(units), reference: r.reference, expiresAt: r.expiresAt };
}
export function createRequest(recipient: string, amount: string): ArrivalRequest {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const reference = "AP-" + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  return validateRequest({ version: 1, network: "testnet", asset: "USDC", issuer: network.assetIssuer, recipient, amount, reference, expiresAt: Math.floor(Date.now() / 1000) + 3600 });
}
export function requestUrl(request: ArrivalRequest, origin: string) {
  const url = new URL("/arrival-services", origin);
  url.hash = new URLSearchParams({ pay: JSON.stringify(request) }).toString();
  return url.href;
}
export function parseRequestUrl(value: string, origin: string): ArrivalRequest {
  const url = new URL(value, origin);
  if (url.origin !== origin || url.pathname !== "/arrival-services") throw new Error("Use a payment link from this ArrivalPay site.");
  const text = new URLSearchParams(url.hash.slice(1)).get("pay");
  if (!text || text.length > 2000) throw new Error("The link does not contain a valid payment request.");
  return validateRequest(JSON.parse(text));
}
