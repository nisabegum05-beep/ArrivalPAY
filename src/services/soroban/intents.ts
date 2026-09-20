import {
  BASE_FEE,
  nativeToScVal,
  rpc,
  scValToNative,
  Transaction,
  TransactionBuilder,
  type xdr,
  StrKey,
} from "@stellar/stellar-sdk";
import { network } from "@/config/network";
import {
  transactionHash,
  verifySignedTransaction,
} from "@/services/stellar/transactions";
import { formatAmount, parseAmount } from "@/utils/amount";
import { intentContract, sorobanServer } from "./client";
import { safeSimulationError, SorobanError } from "./errors";
import {
  hexToId,
  idToHex,
  resolutionFromCode,
  statusFromCode,
  type PaymentIntent,
} from "./types";

export type TransactionResult = {
  hash: string;
  state: "confirmed" | "pending" | "failed";
  message?: string;
};

export type PreparedInvocation = {
  method: string;
  xdr: string;
  sourceAddress: string;
  hash?: string;
  expiresAt?: number;
  fee?: string;
};

function idArg(id: string): xdr.ScVal {
  return nativeToScVal(hexToId(id), { type: "bytes" });
}
function addressArg(address: string): xdr.ScVal {
  return nativeToScVal(address, { type: "address" });
}

async function loadAccount(address: string) {
  try {
    return await sorobanServer.getAccount(address);
  } catch {
    throw new SorobanError(
      "ACCOUNT_MISSING",
      "This account needs to exist and hold XLM on Testnet before it can use the contract.",
    );
  }
}

async function prepareWrite(
  method: string,
  args: xdr.ScVal[],
  sourceAddress: string,
): Promise<PreparedInvocation> {
  const account = await loadAccount(sourceAddress);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: network.passphrase,
  })
    .addOperation(intentContract.call(method, ...args))
    .setTimeout(180)
    .build();
  let prepared: Transaction;
  try {
    prepared = await sorobanServer.prepareTransaction(tx);
  } catch (error) {
    throw safeSimulationError(String((error as Error)?.message ?? error));
  }
  if (BigInt(prepared.fee) > 10_000_000n)
    throw new SorobanError("SIMULATION_FAILED", "The estimated network fee exceeds this demo's 1 XLM limit.");
  return { method, xdr: prepared.toXDR(), sourceAddress, hash: transactionHash(prepared), expiresAt: Number(prepared.timeBounds?.maxTime), fee: formatAmount(BigInt(prepared.fee)) };
}

async function simulateRead(
  method: string,
  args: xdr.ScVal[],
  viewerAddress: string,
) {
  const account = await loadAccount(viewerAddress);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: network.passphrase,
  })
    .addOperation(intentContract.call(method, ...args))
    .setTimeout(30)
    .build();
  const sim = await sorobanServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw safeSimulationError(sim.error);
  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result)
    throw new SorobanError(
      "INVALID_RESPONSE",
      "The contract returned no result.",
    );
  return scValToNative(sim.result.retval);
}

function parseIntent(id: string, raw: Record<string, unknown>): PaymentIntent {
  return {
    id,
    student: String(raw.student),
    institution: String(raw.institution),
    token: String(raw.token),
    amount: formatAmount(BigInt(raw.amount as bigint | string)),
    deadline: Number(raw.deadline),
    externalReference: raw.external_reference
      ? idToHex(raw.external_reference as Uint8Array)
      : null,
    status: statusFromCode(Number(raw.status)),
    resolution: resolutionFromCode(Number(raw.resolution)),
  };
}

/** Read-only; requires a funded viewer account only because Soroban RPC
 * simulation needs a syntactically valid source account, not because the
 * viewer needs any special access. Returns null for a non-existent intent
 * rather than throwing, since "not found" is an expected, common case. */
export async function getIntent(
  id: string,
  viewerAddress: string,
): Promise<PaymentIntent | null> {
  try {
    const raw = await simulateRead(
      "get_intent",
      [idArg(id)],
      viewerAddress,
    );
    return parseIntent(id, raw as Record<string, unknown>);
  } catch (error) {
    if (error instanceof SorobanError && error.code === "NOT_FOUND")
      return null;
    throw error;
  }
}

async function listIds(
  method: "list_by_student" | "list_by_institution",
  address: string,
  offset: number,
  limit: number,
  viewerAddress: string,
): Promise<string[]> {
  const raw = await simulateRead(
    method,
    [
      addressArg(address),
      nativeToScVal(offset, { type: "u32" }),
      nativeToScVal(limit, { type: "u32" }),
    ],
    viewerAddress,
  );
  return (raw as Uint8Array[]).map(idToHex);
}

export function listByStudent(
  student: string,
  offset: number,
  limit: number,
  viewerAddress: string,
) {
  return listIds("list_by_student", student, offset, limit, viewerAddress);
}
export function listByInstitution(
  institution: string,
  offset: number,
  limit: number,
  viewerAddress: string,
) {
  return listIds(
    "list_by_institution",
    institution,
    offset,
    limit,
    viewerAddress,
  );
}

export type CreateIntentParams = {
  institution: string;
  id: string;
  student: string;
  token: string;
  /** Canonical decimal string, up to 7 decimals (src/utils/amount.ts). */
  amount: string;
  /** Unix seconds; must be in the future. */
  deadline: number;
  externalReference?: string | null;
};

export async function prepareCreateIntent(
  params: CreateIntentParams,
): Promise<PreparedInvocation> {
  if (!StrKey.isValidEd25519PublicKey(params.student) || !StrKey.isValidEd25519PublicKey(params.institution))
    throw new SorobanError("INVALID_RESPONSE", "Enter a valid Stellar public account address.");
  if (!Number.isSafeInteger(params.deadline))
    throw new SorobanError("INVALID_DEADLINE", "Choose a valid decision deadline.");
  const units = parseAmount(params.amount, 7);
  if (units <= 0n)
    throw new SorobanError(
      "INVALID_AMOUNT",
      "Enter an amount greater than zero.",
    );
  if (params.deadline <= Math.floor(Date.now() / 1000))
    throw new SorobanError(
      "INVALID_DEADLINE",
      "Choose a deadline in the future.",
    );
  const args = [
    addressArg(params.institution),
    idArg(params.id),
    addressArg(params.student),
    addressArg(params.token),
    nativeToScVal(units, { type: "i128" }),
    nativeToScVal(BigInt(params.deadline), { type: "u64" }),
    params.externalReference
      ? nativeToScVal(hexToId(params.externalReference), { type: "bytes" })
      : nativeToScVal(null),
  ];
  return prepareWrite("create_intent", args, params.institution);
}

export function prepareFundIntent(id: string, student: string) {
  return prepareWrite("fund_intent", [idArg(id)], student);
}
export function prepareApproveIntent(id: string, institution: string) {
  return prepareWrite("approve_intent", [idArg(id)], institution);
}
export function prepareRejectIntent(id: string, institution: string) {
  return prepareWrite("reject_intent", [idArg(id)], institution);
}
export function prepareClaimTimeoutRefund(id: string, student: string) {
  return prepareWrite("claim_timeout_refund", [idArg(id)], student);
}

/** Verifies the wallet did not modify the invocation, submits it, and polls
 * for a definitive result. A dropped connection or timeout is reported as
 * "pending", never silently retried or reported as failure — the same
 * discipline as src/services/stellar/transactions.ts. */
export async function submitInvocation(
  invocation: PreparedInvocation,
  signedXdr: string,
): Promise<TransactionResult> {
  const signed = verifySignedTransaction(
    invocation.xdr,
    signedXdr,
    invocation.sourceAddress,
  );
  const hash = transactionHash(signed);
  try {
    const sent = await sorobanServer.sendTransaction(signed);
    // A rejection here is a classic submission failure (stale sequence,
    // insufficient fee/balance) — the contract call itself already passed
    // simulation in prepareWrite, so this is not a contract-level error.
    if (sent.status === "ERROR")
      throw new SorobanError(
        "TRANSACTION_FAILED",
        "Stellar rejected this transaction before it was included. Refresh your account and try again.",
      );
  } catch (error) {
    if (error instanceof SorobanError) return { hash, state: "failed", message: error.message };
    return { hash, state: "pending", message: "Submission was interrupted. Check this hash before preparing another transaction." };
  }
  return pollResult(hash);
}

export async function pollResult(hash: string): Promise<TransactionResult> {
  let response;
  try {
    response = await sorobanServer.pollTransaction(hash, {
      attempts: 20,
      sleepStrategy: rpc.LinearSleepStrategy,
    });
  } catch {
    return {
      hash,
      state: "pending",
      message:
        "The result is not confirmed yet. Check this transaction before trying again.",
    };
  }
  if (response.status === rpc.Api.GetTransactionStatus.SUCCESS)
    return { hash, state: "confirmed" };
  if (response.status === rpc.Api.GetTransactionStatus.FAILED)
    return {
      hash,
      state: "failed",
      message: "Stellar rejected this transaction. Refresh before retrying.",
    };
  return {
    hash,
    state: "pending",
    message:
      "The result is not confirmed yet. Check this transaction before trying again.",
  };
}

export function transactionUrl(hash: string) {
  return `${network.explorerUrl}/tx/${encodeURIComponent(hash)}`;
}
