import { Keypair, Transaction, TransactionBuilder, WebAuth } from "@stellar/stellar-sdk";
import { network } from "@/config/network";
import { transactionHash } from "@/services/stellar/transactions";
import { AnchorError } from "./errors";
import { fetchJson, query } from "./http";
import type { AnchorDiscovery, AnchorSession } from "./types";

type ChallengeResponse = { transaction: string; network_passphrase?: string };

/**
 * SEP-10 step 1: request a challenge transaction. The server's signature and
 * transaction structure are verified by the Stellar SDK before anything is
 * shown to the wallet for signing.
 */
export async function requestChallenge(
  discovery: AnchorDiscovery,
  address: string,
): Promise<{ xdr: string }> {
  const body = await fetchJson<ChallengeResponse>(
    `${discovery.webAuthEndpoint}${query({ account: address })}`,
  );
  if (
    body.network_passphrase &&
    body.network_passphrase !== network.passphrase
  )
    throw new AnchorError(
      "DOMAIN_MISMATCH",
      "The anchor's challenge targets an unexpected network.",
    );
  let parsed: ReturnType<typeof WebAuth.readChallengeTx>;
  try {
    parsed = WebAuth.readChallengeTx(
      body.transaction,
      discovery.signingKey,
      network.passphrase,
      discovery.homeDomain,
      discovery.homeDomain,
    );
  } catch {
    throw new AnchorError(
      "CHALLENGE_INVALID",
      "The anchor's authentication challenge failed validation.",
    );
  }
  if (parsed.clientAccountID !== address)
    throw new AnchorError(
      "CHALLENGE_INVALID",
      "The challenge was not issued for the connected wallet.",
    );
  return { xdr: body.transaction };
}

/**
 * Accept only a signature added to the exact challenge the anchor issued.
 * The transaction hash excludes signatures, so any operation/fee/source
 * tampering by an intermediary is caught before the challenge is returned.
 */
export function verifySignedChallenge(
  unsignedXdr: string,
  signedXdr: string,
  address: string,
): Transaction {
  const unsigned = TransactionBuilder.fromXDR(unsignedXdr, network.passphrase);
  const signed = TransactionBuilder.fromXDR(signedXdr, network.passphrase);
  if (
    !(unsigned instanceof Transaction) ||
    !(signed instanceof Transaction) ||
    transactionHash(unsigned) !== transactionHash(signed)
  ) {
    throw new AnchorError(
      "CHALLENGE_INVALID",
      "The wallet returned a different challenge. Nothing was sent to the anchor.",
    );
  }
  const signer = Keypair.fromPublicKey(address);
  if (
    !signed.signatures.some((signature) =>
      signer.verify(signed.hash(), signature.signature),
    )
  )
    throw new AnchorError(
      "CHALLENGE_INVALID",
      "The selected account did not sign the authentication challenge.",
    );
  return signed;
}

function decodeJwt(token: string): { sub?: string; exp?: number } {
  const parts = token.split(".");
  if (parts.length !== 3)
    throw new AnchorError(
      "INVALID_RESPONSE",
      "The anchor returned a malformed session token.",
    );
  try {
    const segment = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = segment.padEnd(
      segment.length + ((4 - (segment.length % 4)) % 4),
      "=",
    );
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json) as { sub?: string; exp?: number };
  } catch {
    throw new AnchorError(
      "INVALID_RESPONSE",
      "The anchor returned an unreadable session token.",
    );
  }
}

/** SEP-10 step 2: exchange the signed challenge for a bearer JWT. */
export async function submitChallenge(
  discovery: AnchorDiscovery,
  signedTransaction: Transaction,
  address: string,
): Promise<AnchorSession> {
  const body = await fetchJson<{ token: string }>(discovery.webAuthEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: signedTransaction.toXDR() }),
  });
  const claims = decodeJwt(body.token);
  if (claims.sub !== address)
    throw new AnchorError(
      "CHALLENGE_INVALID",
      "The anchor issued a session for a different account.",
    );
  if (!claims.exp || claims.exp * 1000 <= Date.now())
    throw new AnchorError(
      "SESSION_EXPIRED",
      "The anchor session already expired. Authenticate again.",
    );
  return { token: body.token, address, expiresAt: claims.exp * 1000 };
}

export function sessionValid(session: AnchorSession | null): session is AnchorSession {
  return !!session && session.expiresAt > Date.now();
}
