import { network } from "@/config/network";
import { AnchorError } from "./errors";
import { authHeaders, fetchJson, query } from "./http";
import type {
  AnchorDiscovery,
  AnchorSession,
  AnchorTransaction,
  AnchorTransactionStatus,
} from "./types";

const KNOWN_STATUSES: readonly AnchorTransactionStatus[] = [
  "incomplete",
  "pending_user_transfer_start",
  "pending_anchor",
  "pending_trust",
  "pending_external",
  "completed",
  "refunded",
  "expired",
  "error",
];

type TransactionPayload = {
  id: string;
  status: string;
  amount_in?: string;
  amount_out?: string;
  stellar_transaction_id?: string;
  more_info_url?: string;
  message?: string;
};

function readTransaction(raw: TransactionPayload): AnchorTransaction {
  const status = KNOWN_STATUSES.includes(raw.status as AnchorTransactionStatus)
    ? (raw.status as AnchorTransactionStatus)
    : "error";
  return {
    id: raw.id,
    // An anchor status this build does not recognize is treated as an error
    // state, never silently shown as progress or success.
    status,
    amountIn: raw.amount_in,
    amountOut: raw.amount_out,
    stellarTransactionId: raw.stellar_transaction_id || undefined,
    moreInfoUrl: raw.more_info_url,
    message: raw.message,
  };
}

export async function getTransaction(
  discovery: AnchorDiscovery,
  session: AnchorSession,
  id: string,
): Promise<AnchorTransaction> {
  const body = await fetchJson<{ transaction: TransactionPayload }>(
    `${discovery.transferServer}/transaction${query({ id })}`,
    { headers: authHeaders(session.token) },
  );
  if (!body.transaction || body.transaction.id !== id)
    throw new AnchorError(
      "INVALID_RESPONSE",
      "The anchor did not return this transaction.",
    );
  return readTransaction(body.transaction);
}

export async function listTransactions(
  discovery: AnchorDiscovery,
  session: AnchorSession,
): Promise<AnchorTransaction[]> {
  const body = await fetchJson<{ transactions: TransactionPayload[] }>(
    `${discovery.transferServer}/transactions${query({
      asset_code: network.assetCode,
    })}`,
    { headers: authHeaders(session.token) },
  );
  return Array.isArray(body.transactions)
    ? body.transactions.map(readTransaction)
    : [];
}

export const TERMINAL_STATUSES: readonly AnchorTransactionStatus[] = [
  "completed",
  "refunded",
  "expired",
  "error",
];
