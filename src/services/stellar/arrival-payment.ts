import { Asset, Memo, Operation, TransactionBuilder, type Horizon } from "@stellar/stellar-sdk";
import { network } from "@/config/network";
import { parseAmount, formatAmount } from "@/utils/amount";
import { validateRequest, type ArrivalRequest } from "@/features/arrival-services/request";
import { horizon } from "./client";
import { transactionHash, transactionStatus, type TransactionResult } from "./transactions";

function usdc(account: Horizon.AccountResponse) {
  return account.balances.find(b => (b.asset_type === "credit_alphanum4" || b.asset_type === "credit_alphanum12") && b.asset_code === network.assetCode && b.asset_issuer === network.assetIssuer);
}
export async function prepareArrivalPayment(request: ArrivalRequest, sender: string) {
  const r = validateRequest(request);
  if (sender === r.recipient) throw new Error("Connect the student's wallet to pay this request; the recipient cannot pay themselves.");
  const [source, destination, ledger, fee] = await Promise.all([
    horizon.loadAccount(sender), horizon.loadAccount(r.recipient),
    horizon.ledgers().order("desc").limit(1).call(), horizon.fetchBaseFee(),
  ]);
  const amount = parseAmount(r.amount);
  const from = usdc(source), to = usdc(destination);
  if (!from || !("asset_issuer" in from) || !from.is_authorized || parseAmount(from.balance) - parseAmount(from.selling_liabilities) < amount) throw new Error("Your spendable canonical USDC balance is too low. Fund your wallet first.");
  if (!to || !("asset_issuer" in to) || !to.is_authorized || parseAmount(to.limit) - parseAmount(to.balance) - parseAmount(to.buying_liabilities) < amount) throw new Error("The recipient needs an authorized USDC trustline with enough remaining capacity.");
  const native = source.balances.find(b => b.asset_type === "native");
  const reserve = ledger.records[0]?.base_reserve_in_stroops;
  if (!Number.isSafeInteger(fee) || fee <= 0 || fee > 100000 || !Number.isSafeInteger(reserve) || !reserve || reserve <= 0) throw new Error("The network returned an unsupported fee or reserve. Try again later.");
  const minimum = BigInt(2 + source.subentry_count + (source.num_sponsoring ?? 0) - (source.num_sponsored ?? 0)) * BigInt(reserve);
  if (!native || parseAmount(native.balance) - parseAmount(native.selling_liabilities) < minimum + BigInt(fee)) throw new Error("Keep enough XLM for your account reserve and network fee.");
  const expiresAt = Math.min(r.expiresAt, Math.floor(Date.now() / 1000) + 180);
  const transaction = new TransactionBuilder(source, { fee: String(fee), networkPassphrase: network.passphrase, timebounds: { minTime: 0, maxTime: expiresAt } })
    .addOperation(Operation.payment({ destination: r.recipient, asset: new Asset(network.assetCode, network.assetIssuer), amount: r.amount }))
    .addMemo(Memo.text(r.reference)).build();
  return { xdr: transaction.toXDR(), hash: transactionHash(transaction), expiresAt, fee: formatAmount(BigInt(fee)) };
}
export async function checkArrivalPayment(request: ArrivalRequest, hash: string, sender?: string, expiresAt?: number): Promise<TransactionResult> {
  const status = await transactionStatus(hash, expiresAt);
  if (status.state !== "confirmed") return status;
  const [tx, payments] = await Promise.all([
    horizon.transactions().transaction(hash).call(), horizon.payments().forTransaction(hash).call(),
  ]);
  const matches = tx.memo_type === "text" && tx.memo === request.reference && payments.records.some(p =>
    p.type === "payment" && p.to === request.recipient && (!sender || p.from === sender) &&
    p.asset_type !== "native" && p.asset_code === network.assetCode && p.asset_issuer === network.assetIssuer &&
    parseAmount(p.amount) === parseAmount(request.amount),
  );
  if (!matches) throw new Error("This transaction does not pay the exact recipient, amount and reference in this request.");
  return status;
}
export async function findArrivalPayment(request: ArrivalRequest): Promise<string | null> {
  const recent = await horizon.payments().forAccount(request.recipient).order("desc").limit(50).call();
  for (const p of recent.records) {
    if (p.type !== "payment" || p.to !== request.recipient || p.asset_type === "native" || p.asset_code !== network.assetCode || p.asset_issuer !== network.assetIssuer || parseAmount(p.amount) !== parseAmount(request.amount)) continue;
    const tx = await horizon.transactions().transaction(p.transaction_hash).call();
    if (tx.memo_type !== "text" || tx.memo !== request.reference) continue;
    const result = await checkArrivalPayment(request, p.transaction_hash);
    if (result.state === "confirmed") return result.hash;
  }
  return null;
}
