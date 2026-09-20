import { Keypair, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { network } from "@/config/network";
import { horizon } from "./client";
import {
  httpStatus,
  safeError,
  StellarError,
  transactionCodes,
} from "./errors";

export type TransactionResult = {
  hash: string;
  state: "confirmed" | "pending" | "failed";
  message?: string;
};

/** Accept signatures, never wallet-modified operation/fee/source bodies. */
export function verifySignedTransaction(
  unsignedXdr: string,
  signedXdr: string,
  address: string,
): Transaction {
  const unsigned = TransactionBuilder.fromXDR(unsignedXdr, network.passphrase);
  const signed = TransactionBuilder.fromXDR(signedXdr, network.passphrase);
  if (
    !(unsigned instanceof Transaction) ||
    !(signed instanceof Transaction) ||
    signed.source !== address ||
    transactionHash(unsigned) !== transactionHash(signed)
  ) {
    throw new StellarError(
      "INVALID_RESPONSE",
      "The wallet returned a different transaction. Nothing was submitted.",
    );
  }
  // Phase 2 supports ordinary single-key Freighter accounts. Multisig requires
  // a separate co-signing flow; never report its incomplete envelope as signed.
  const signer = Keypair.fromPublicKey(address);
  if (
    !signed.signatures.some((signature) =>
      signer.verify(signed.hash(), signature.signature),
    )
  ) {
    throw new StellarError(
      "INVALID_RESPONSE",
      "The selected account has not signed this transaction. Multisig co-signing is not supported yet.",
    );
  }
  return signed;
}

export async function transactionStatus(
  hash: string,
  expiresAt?: number,
): Promise<TransactionResult> {
  if (!/^[a-f0-9]{64}$/.test(hash))
    throw new StellarError(
      "INVALID_RESPONSE",
      "Invalid transaction reference.",
    );
  try {
    const record = await horizon.transactions().transaction(hash).call();
    return {
      hash,
      state: record.successful ? "confirmed" : "failed",
      message: record.successful
        ? undefined
        : "Stellar recorded a failed transaction. Refresh your account.",
    };
  } catch (error) {
    if (httpStatus(error) === 404) {
      if (expiresAt) {
        const ledgers = await horizon.ledgers().order("desc").limit(1).call();
        const closeTime =
          Date.parse(ledgers.records[0]?.closed_at || "") / 1000;
        if (closeTime > expiresAt) {
          // Re-query after observing an indexed ledger beyond the timebound,
          // so a transaction indexed between the two calls isn't called expired.
          try {
            const record = await horizon
              .transactions()
              .transaction(hash)
              .call();
            return { hash, state: record.successful ? "confirmed" : "failed" };
          } catch (retryError) {
            if (httpStatus(retryError) !== 404) throw safeError(retryError);
            return {
              hash,
              state: "failed",
              message:
                "The transaction expired without appearing on Testnet. Refresh your balance before preparing a new request.",
            };
          }
        }
      }
      return { hash, state: "pending" };
    }
    throw safeError(error);
  }
}

export async function submitSignedTransaction(
  transaction: Transaction,
): Promise<TransactionResult> {
  const hash = transactionHash(transaction);
  try {
    const result = await horizon.submitTransaction(transaction);
    if (result.hash !== hash || !result.successful)
      return transactionStatus(hash);
    return { hash, state: "confirmed" };
  } catch (error) {
    if (transactionCodes(error).length)
      return { hash, state: "failed", message: safeError(error).message };
    // A dropped connection or 504 does not prove rejection. Preserve the hash
    // and query it instead of blindly submitting a newly sequenced transaction.
    return {
      hash,
      state: "pending",
      message:
        "The result is not confirmed yet. Check this transaction before trying again.",
    };
  }
}

export function transactionUrl(hash: string) {
  return `${network.explorerUrl}/tx/${encodeURIComponent(hash)}`;
}
export function accountUrl(address: string) {
  return `${network.explorerUrl}/account/${encodeURIComponent(address)}`;
}

export function transactionHash(transaction: Transaction): string {
  return Array.from(transaction.hash(), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
