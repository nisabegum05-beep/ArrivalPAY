import { network } from "@/config/network";
import { AnchorError } from "./errors";
import { authHeaders, fetchJson, query } from "./http";
import type {
  AnchorDiscovery,
  AnchorQuote,
  AnchorSession,
  DepositInstructions,
} from "./types";

type InstructionField = { value?: string; description?: string };
type DepositResponse = {
  id: string;
  how: string;
  eta?: number;
  fee_percent?: number;
  instructions?: Record<string, InstructionField>;
  extra_info?: { message?: string };
};

/**
 * SEP-6 deposit-exchange (GET, authenticated). Using the locked SEP-38
 * quote id here, instead of the plain /deposit endpoint, guarantees the
 * anchor pays out exactly the USDC amount that was quoted rather than
 * whatever the market rate is when the simulated bank transfer lands.
 */
export async function requestDeposit(
  discovery: AnchorDiscovery,
  session: AnchorSession,
  address: string,
  quote: AnchorQuote,
): Promise<DepositInstructions> {
  const body = await fetchJson<DepositResponse>(
    `${discovery.transferServer}/deposit-exchange${query({
      destination_asset: network.assetCode,
      source_asset: quote.sellAsset,
      account: address,
      quote_id: quote.id,
      amount: quote.sellAmount,
      type: "bank_account",
    })}`,
    { headers: authHeaders(session.token) },
  );
  if (!body.id)
    throw new AnchorError(
      "INVALID_RESPONSE",
      "The anchor did not return a deposit reference.",
    );
  const fields = body.instructions ?? {};
  return {
    id: body.id,
    how: body.how,
    bankName: fields.bank_name?.value,
    ibanOrAccount: fields.bank_account_number?.value,
    transferMemo: fields.external_transfer_memo?.value,
    etaMinutes: body.eta,
    feePercent: body.fee_percent,
  };
}

/**
 * Sandbox-only: TR Mock Anchor lets a caller simulate the incoming bank
 * transfer instead of a real one, so the deposit can be demonstrated on
 * Testnet. This must never be presented as, or accidentally wired to, a
 * real payment rail. It matches quote.sellAmount so the anchor pays out
 * the locked USDC amount rather than a live-rate default.
 */
export async function simulateBankTransfer(
  discovery: AnchorDiscovery,
  session: AnchorSession,
  transactionId: string,
  tryAmount: string,
): Promise<void> {
  await fetchJson(
    `${discovery.transferServer}/tx/${encodeURIComponent(transactionId)}/simulate-bank-transfer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(session.token),
      },
      body: JSON.stringify({ amount: tryAmount }),
    },
  );
}
