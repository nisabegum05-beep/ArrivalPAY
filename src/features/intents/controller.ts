import { freighterAdapter, verifyIdentity, type WalletAdapter } from "@/features/wallet/adapter";
import { network } from "@/config/network";
import * as api from "@/services/soroban/intents";
import { safeError, SorobanError } from "@/services/soroban/errors";
import type { PaymentIntent } from "@/services/soroban/types";
import { transactionStatus } from "@/services/stellar/transactions";

export type IntentAction = "listing" | "creating" | "funding" | "approving" | "rejecting" | "claiming" | "checking";
export type IntentReceipt = {
  id: string; action: IntentAction; hash: string;
  state: api.TransactionResult["state"]; message?: string; expiresAt?: number;
};
export type IntentReview = {
  id: string; action: IntentAction; signer: string; amount: string; recipient: string;
  deadline: number; invocation: api.PreparedInvocation;
};
export type IntentsState = {
  studentIntentIds: string[]; institutionIntentIds: string[];
  intents: Record<string, PaymentIntent>; busy: IntentAction | null;
  busyIntentId: string | null; error: SorobanError | null;
  receipt: IntentReceipt | null; receipts: IntentReceipt[]; review: IntentReview | null;
  loadedIds: string[];
};
const initialState: IntentsState = {
  studentIntentIds: [], institutionIntentIds: [], intents: {}, busy: null,
  busyIntentId: null, error: null, receipt: null, receipts: [], review: null, loadedIds: [],
};
const services = { ...api, transactionStatus };
export function explorerUrlForReceipt(hash: string) { return api.transactionUrl(hash); }
const storageKey = (address: string) => `arrivalpay:intents:${network.contractId}:${address}`;

export class IntentsController {
  private state: IntentsState = initialState;
  private listeners = new Set<() => void>();
  private epoch = 0;
  private address: string | null = null;
  constructor(private adapter: WalletAdapter = freighterAdapter, private service: typeof services = services) {}
  getSnapshot = () => this.state;
  getServerSnapshot = () => initialState;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<IntentsState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  private valid(epoch: number) { return epoch === this.epoch; }
  private failure(error: unknown) { this.update({ busy: null, busyIntentId: null, error: safeError(error) }); }
  reset = () => { this.epoch++; this.address = null; this.update(initialState); };
  private record(receipt: IntentReceipt) {
    const receipts = [receipt, ...this.state.receipts.filter(r => r.hash !== receipt.hash)].slice(0, 50);
    this.update({ receipt, receipts });
    try { if (this.address) sessionStorage.setItem(storageKey(this.address), JSON.stringify(receipts)); } catch { /* memory-only if unavailable */ }
  }
  private restore(address: string) {
    try {
      const rows: unknown = JSON.parse(sessionStorage.getItem(storageKey(address)) || "[]");
      if (!Array.isArray(rows)) return;
      const receipts: IntentReceipt[] = rows.slice(0, 50).filter(r =>
        r && /^[a-f0-9]{64}$/.test(r.hash) && /^[a-f0-9]{64}$/.test(r.id) &&
        ["creating", "funding", "approving", "rejecting", "claiming"].includes(r.action),
      ).map(r => ({ id: r.id, action: r.action, hash: r.hash, state: "pending", expiresAt: Number.isSafeInteger(r.expiresAt) ? r.expiresAt : undefined }));
      // Storage is a recovery hint, never proof of chain success.
      this.update({ receipts, receipt: receipts[0] ?? null });
    } catch { /* ignore malformed or unavailable storage */ }
  }
  refresh = async (address: string | null) => {
    if (!address || this.state.busy || this.state.review) return;
    if (this.address !== address) { this.reset(); this.address = address; this.restore(address); }
    const epoch = this.epoch;
    this.update({ busy: "listing", error: null });
    try {
      const [studentIds, institutionIds] = await Promise.all([
        this.service.listByStudent(address, 0, 50, address),
        this.service.listByInstitution(address, 0, 50, address),
      ]);
      const ids = [...new Set([...studentIds, ...institutionIds])];
      const loaded = await Promise.all(ids.map(id => this.service.getIntent(id, address)));
      if (!this.valid(epoch)) return;
      const intents: Record<string, PaymentIntent> = { ...this.state.intents };
      loaded.forEach(intent => { if (intent) intents[intent.id] = intent; });
      this.update({ studentIntentIds: studentIds, institutionIntentIds: institutionIds, intents, busy: null });
    } catch (error) { if (this.valid(epoch)) this.failure(error); }
  };
  loadOne = async (id: string, viewerAddress: string) => {
    const epoch = this.epoch;
    try {
      const intent = await this.service.getIntent(id, viewerAddress);
      if (!this.valid(epoch)) return;
      this.update({ intents: intent ? { ...this.state.intents, [id]: intent } : this.state.intents,
        loadedIds: [...new Set([...this.state.loadedIds, id])] });
    } catch (error) { if (this.valid(epoch)) this.update({ error: safeError(error), loadedIds: [...this.state.loadedIds, id] }); }
  };
  private blocked() { return !!this.state.busy || !!this.state.review || this.state.receipts.some(r => r.state === "pending"); }
  private async prepare(id: string, action: IntentAction, signer: string, params?: api.CreateIntentParams) {
    if (this.blocked()) return;
    const epoch = this.epoch;
    this.address = signer;
    this.update({ busy: action, busyIntentId: id, error: null });
    try {
      verifyIdentity(await this.adapter.identity(), signer);
      if (!this.valid(epoch)) return;
      const intent = params ?? await this.service.getIntent(id, signer);
      if (!intent) throw new SorobanError("NOT_FOUND", "This payment request no longer exists.");
      if (intent.token !== network.assetContractId)
        throw new SorobanError("INVALID_RESPONSE", "This request uses an unsupported token. ArrivalPay signs payments only for canonical Testnet USDC.");
      const invocation = params ? await this.service.prepareCreateIntent(params) :
        action === "funding" ? await this.service.prepareFundIntent(id, signer) :
        action === "approving" ? await this.service.prepareApproveIntent(id, signer) :
        action === "rejecting" ? await this.service.prepareRejectIntent(id, signer) :
        await this.service.prepareClaimTimeoutRefund(id, signer);
      if (!this.valid(epoch)) return;
      this.update({ busy: null, busyIntentId: null, review: {
        id, action, signer, amount: intent.amount, deadline: intent.deadline,
        recipient: action === "funding" ? network.contractId : action === "rejecting" || action === "claiming" ? intent.student : intent.institution,
        invocation,
      }});
    } catch (error) { if (this.valid(epoch)) this.failure(error); }
  }
  cancelReview = () => { if (!this.state.busy) this.update({ review: null }); };
  confirm = async () => {
    const review = this.state.review;
    if (!review || this.state.busy || this.state.receipts.some(r => r.state === "pending")) return;
    const epoch = this.epoch;
    this.update({ busy: review.action, busyIntentId: review.id, error: null });
    try {
      verifyIdentity(await this.adapter.identity(), review.signer);
      if (!this.valid(epoch)) return;
      if (review.invocation.expiresAt && Date.now() / 1000 >= review.invocation.expiresAt)
        throw new SorobanError("INVALID_DEADLINE", "This review expired. Close it and prepare the transaction again.");
      const signed = await this.adapter.sign(review.invocation.xdr, review.signer);
      if (!this.valid(epoch)) return;
      verifyIdentity(await this.adapter.identity(), review.signer);
      if (!this.valid(epoch)) return;
      // Preserve a recoverable public hash before sending, including tab-close races.
      if (review.invocation.hash) this.record({ id: review.id, action: review.action, hash: review.invocation.hash, state: "pending", expiresAt: review.invocation.expiresAt });
      this.update({ review: null });
      const result = await this.service.submitInvocation(review.invocation, signed);
      if (!this.valid(epoch)) return;
      this.record({ id: review.id, action: review.action, ...result, expiresAt: review.invocation.expiresAt });
      this.update({ busy: null, busyIntentId: null });
      if (result.state === "confirmed") await this.refresh(review.signer);
    } catch (error) { if (this.valid(epoch)) this.failure(error); }
  };
  checkReceipt = async (hash: string) => {
    if (!this.address || this.state.busy || this.state.review) return;
    const receipt = this.state.receipts.find(r => r.hash === hash);
    if (!receipt) return;
    const epoch = this.epoch;
    this.update({ busy: "checking", error: null });
    try {
      const result = await this.service.transactionStatus(hash, receipt.expiresAt);
      if (!this.valid(epoch)) return;
      this.record({ ...receipt, ...result });
      this.update({ busy: null });
      if (result.state === "confirmed") await this.refresh(this.address);
    } catch (error) { if (this.valid(epoch)) this.failure(error); }
  };
  createIntent = (params: api.CreateIntentParams) => this.prepare(params.id, "creating", params.institution, params);
  fund = (id: string, address: string) => this.prepare(id, "funding", address);
  approve = (id: string, address: string) => this.prepare(id, "approving", address);
  reject = (id: string, address: string) => this.prepare(id, "rejecting", address);
  claimTimeoutRefund = (id: string, address: string) => this.prepare(id, "claiming", address);
}
