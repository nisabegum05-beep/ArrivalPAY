import { parseAmount } from "@/utils/amount";
import { network } from "@/config/network";
import { AnchorError } from "./errors";
import { authHeaders, fetchJson } from "./http";
import type { AnchorDiscovery, AnchorQuote, AnchorSession } from "./types";

const TRY_ASSET = "iso4217:TRY";

function buyAsset(assetCode: string) {
  return `stellar:${assetCode}:${network.assetIssuer}`;
}

type QuoteResponse = {
  id: string;
  expires_at: string;
  price: string;
  sell_asset: string;
  sell_amount: string;
  buy_asset: string;
  buy_amount: string;
  fee: { total: string; asset: string };
};

/**
 * SEP-38 firm quote (POST /quote, authenticated). Locking the quote before
 * depositing means the USDC the student receives cannot drift with the
 * market rate between "I entered an amount" and "the bank transfer landed".
 */
export async function requestQuote(
  discovery: AnchorDiscovery,
  session: AnchorSession,
  sellAmountTry: string,
): Promise<AnchorQuote> {
  const body = await fetchJson<QuoteResponse>(`${discovery.quoteServer}/quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(session.token),
    },
    body: JSON.stringify({
      context: "sep6",
      sell_asset: TRY_ASSET,
      buy_asset: buyAsset(network.assetCode),
      sell_amount: sellAmountTry,
    }),
  });
  const expiresAt = Date.parse(body.expires_at);
  if (!body.id || !Number.isFinite(expiresAt))
    throw new AnchorError(
      "INVALID_RESPONSE",
      "The anchor returned an incomplete quote.",
    );
  if (body.sell_asset !== TRY_ASSET || body.buy_asset !== buyAsset(network.assetCode) ||
      parseAmount(body.sell_amount, 2) !== parseAmount(sellAmountTry, 2) ||
      parseAmount(body.buy_amount) <= 0n || !body.fee ||
      body.fee.asset !== TRY_ASSET || parseAmount(body.fee.total, 2) < 0n || expiresAt <= Date.now())
    throw new AnchorError("INVALID_RESPONSE", "The quote does not match the requested TRY amount and canonical USDC asset.");
  return {
    id: body.id,
    sellAsset: body.sell_asset,
    buyAsset: body.buy_asset,
    sellAmount: body.sell_amount,
    buyAmount: body.buy_amount,
    price: body.price,
    feeAmount: body.fee.total,
    feeAsset: body.fee.asset,
    expiresAt,
  };
}

export function quoteExpired(quote: AnchorQuote): boolean {
  return Date.now() >= quote.expiresAt;
}
