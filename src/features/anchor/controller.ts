import { verifyIdentity, freighterAdapter, type WalletAdapter } from "@/features/wallet/adapter";
import { discoverAnchor } from "@/services/anchor/discovery";
import {
  requestChallenge,
  sessionValid,
  submitChallenge,
  verifySignedChallenge,
} from "@/services/anchor/auth";
import { AnchorError, safeError } from "@/services/anchor/errors";
import { fetchTransferInfo } from "@/services/anchor/info";
import { quoteExpired, requestQuote } from "@/services/anchor/quote";
import { requestDeposit, simulateBankTransfer } from "@/services/anchor/deposit";
import { getTransaction, TERMINAL_STATUSES } from "@/services/anchor/transactions";
import { network } from "@/config/network";
import { parseAmount } from "@/utils/amount";
import type {
  AnchorDiscovery,
  AnchorQuote,
  AnchorSession,
  AnchorTransaction,
  AnchorTransferInfo,
  DepositInstructions,
} from "@/services/anchor/types";

/** Client-side sanity guard only; the live anchor publishes no min/max. */
const MAX_TRY_SANITY_CEILING = "100000.00";

export type AnchorBusy =
  | "discovering"
  | "authenticating"
  | "loading-info"
  | "quoting"
  | "depositing"
  | "simulating"
  | "polling"
  | null;

export type AnchorFlowState = {
  discovery: AnchorDiscovery | null;
  session: AnchorSession | null;
  info: AnchorTransferInfo | null;
  quote: AnchorQuote | null;
  deposit: DepositInstructions | null;
  transaction: AnchorTransaction | null;
  busy: AnchorBusy;
  error: AnchorError | null;
  pollAttempts: number;
  depositUncertain: boolean;
  simulationAttempted: boolean;
};

const initialState: AnchorFlowState = {
  discovery: null,
  session: null,
  info: null,
  quote: null,
  deposit: null,
  transaction: null,
  busy: null,
  error: null,
  pollAttempts: 0,
  depositUncertain: false,
  simulationAttempted: false,
};

const services = {
  discoverAnchor,
  requestChallenge,
  submitChallenge,
  fetchTransferInfo,
  requestQuote,
  requestDeposit,
  simulateBankTransfer,
  getTransaction,
};

const MAX_AUTO_POLLS = 12;
const POLL_INTERVAL_MS = 5_000;

export class AnchorController {
  private state: AnchorFlowState = initialState;
  private listeners = new Set<() => void>();
  private epoch = 0;
  private pollTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private adapter: WalletAdapter = freighterAdapter,
    private api: typeof services = services,
  ) {}

  getSnapshot = () => this.state;
  getServerSnapshot = () => initialState;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<AnchorFlowState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private valid(epoch: number) {
    return epoch === this.epoch;
  }
  private failure(error: unknown) {
    const mapped = safeError(error);
    this.update({ busy: null, error: mapped });
    if (mapped.code === "SESSION_EXPIRED") this.update({ session: null });
  }
  private saveRecovery() {
    const address = this.state.session?.address;
    if (!address) return;
    try { sessionStorage.setItem(`arrivalpay:anchor:${network.anchorHomeDomain}:${address}`, JSON.stringify({ deposit: this.state.deposit, quote: this.state.quote, simulationAttempted: this.state.simulationAttempted, depositUncertain: this.state.depositUncertain })); } catch { /* public references only; memory fallback */ }
  }
  private restoreRecovery(address: string) {
    try {
      const raw = JSON.parse(sessionStorage.getItem(`arrivalpay:anchor:${network.anchorHomeDomain}:${address}`) || "null");
      if (!raw || typeof raw !== "object") return;
      if (raw.depositUncertain) this.update({ depositUncertain: true });
      if (typeof raw.deposit?.id !== "string" || !/^[a-zA-Z0-9_-]{1,150}$/.test(raw.deposit.id)) return;
      const deposit: DepositInstructions = { id: raw.deposit.id, how: "Recovered sandbox deposit" };
      for (const key of ["bankName", "ibanOrAccount", "transferMemo"] as const) if (typeof raw.deposit[key] === "string") deposit[key] = raw.deposit[key].slice(0, 300);
      this.update({ deposit, simulationAttempted: !!raw.simulationAttempted });
    } catch { /* invalid recovery data never authorizes a transfer */ }
  }
  clearCompleted = () => {
    if (this.state.busy || !this.state.transaction || !TERMINAL_STATUSES.includes(this.state.transaction.status)) return;
    this.update({ deposit: null, quote: null, transaction: null, simulationAttempted: false, depositUncertain: false }); this.saveRecovery();
  };

  /** Clears the anchor session. Call this whenever the wallet disconnects or
   * switches accounts — an anchor JWT for a different key must never linger. */
  reset = () => {
    this.epoch++;
    this.clearPoll();
    this.update(initialState);
  };

  connect = async (address: string | null) => {
    if (!address || this.state.busy) return;
    const epoch = ++this.epoch;
    this.clearPoll();
    this.update({ ...initialState, busy: "discovering" });
    try {
      const discovery = await this.api.discoverAnchor();
      if (!this.valid(epoch)) return;
      this.update({ discovery, busy: "authenticating" });

      verifyIdentity(await this.adapter.identity(), address);
      const { xdr } = await this.api.requestChallenge(discovery, address);
      if (!this.valid(epoch)) return;
      const signedXdr = await this.adapter.sign(xdr, address);
      if (!this.valid(epoch)) return;
      verifyIdentity(await this.adapter.identity(), address);
      const signedTransaction = verifySignedChallenge(xdr, signedXdr, address);
      const session = await this.api.submitChallenge(discovery, signedTransaction, address);
      if (!this.valid(epoch)) return;

      this.update({ session, busy: "loading-info" });
      const info = await this.api.fetchTransferInfo(discovery, "USDC");
      if (this.valid(epoch)) {
        this.update({ info, busy: null });
        this.restoreRecovery(address);
        if (this.state.deposit) { await this.checkTransaction(); if (this.valid(epoch)) this.startPolling(); }
      }
    } catch (error) {
      if (this.valid(epoch)) this.failure(error);
    }
  };

  requestQuote = async (tryAmount: string) => {
    const { discovery, session } = this.state;
    if (!discovery || !session || this.state.busy || this.state.deposit || this.state.depositUncertain) return;
    if (!sessionValid(session)) {
      this.update({
        busy: null,
        session: null,
        error: new AnchorError(
          "SESSION_EXPIRED",
          "Your anchor session expired. Authenticate again.",
        ),
      });
      return;
    }
    try {
      const units = parseAmount(tryAmount, 2);
      if (units <= 0n || units > parseAmount(MAX_TRY_SANITY_CEILING, 2))
        throw new AnchorError(
          "AMOUNT_OUT_OF_RANGE",
          `Enter an amount between 0.01 and ${MAX_TRY_SANITY_CEILING} TRY.`,
        );
    } catch (error) {
      if (error instanceof AnchorError) {
        this.update({ error });
      } else {
        this.update({
          error: new AnchorError("AMOUNT_OUT_OF_RANGE", "Enter a valid TRY amount with up to 2 decimals."),
        });
      }
      return;
    }
    const epoch = this.epoch;
    this.update({ busy: "quoting", error: null, quote: null });
    try {
      const quote = await this.api.requestQuote(discovery, session, tryAmount);
      if (this.valid(epoch)) this.update({ quote, busy: null });
    } catch (error) {
      if (this.valid(epoch)) this.failure(error);
    }
  };

  startDeposit = async (address: string) => {
    const { discovery, session, quote } = this.state;
    if (!discovery || !session || !quote || this.state.busy || this.state.deposit || this.state.depositUncertain) return;
    if (session.address !== address || !sessionValid(session)) { this.failure(new AnchorError("SESSION_EXPIRED", "Authenticate again before creating a deposit.")); return; }
    if (quoteExpired(quote)) {
      this.update({
        error: new AnchorError(
          "QUOTE_EXPIRED",
          "This quote expired. Request a new one before depositing.",
        ),
        quote: null,
      });
      return;
    }
    const epoch = this.epoch;
    this.update({ busy: "depositing", error: null, depositUncertain: true });
    this.saveRecovery();
    try {
      const deposit = await this.api.requestDeposit(discovery, session, address, quote);
      if (this.valid(epoch)) { this.update({ deposit, busy: null, depositUncertain: false }); this.saveRecovery(); }
    } catch (error) {
      if (this.valid(epoch)) this.failure(error);
    }
  };

  /** Sandbox-only simulated bank transfer. Never call this against a real anchor. */
  simulateBankTransfer = async () => {
    const { discovery, session, deposit, quote } = this.state;
    if (!discovery || !session || !deposit || this.state.busy || this.state.simulationAttempted) return;
    if (!quote && !this.state.transaction?.amountIn) return;
    const epoch = this.epoch;
    this.update({ busy: "simulating", error: null, simulationAttempted: true });
    this.saveRecovery();
    try {
      await this.api.simulateBankTransfer(discovery, session, deposit.id, quote?.sellAmount ?? this.state.transaction!.amountIn!);
      if (!this.valid(epoch)) return;
      this.update({ busy: null, pollAttempts: 0 });
      this.startPolling();
    } catch (error) {
      if (this.valid(epoch)) this.failure(error);
    }
  };

  resumeDeposit = async (id: string) => {
    const { discovery, session } = this.state;
    if (!discovery || !session || this.state.busy) return;
    const epoch = this.epoch;
    this.clearPoll(); this.update({ busy: "polling", error: null });
    try {
      const transaction = await this.api.getTransaction(discovery, session, id);
      if (!this.valid(epoch)) return;
      this.update({ transaction, deposit: { id, how: "Recovered sandbox deposit" }, quote: null, busy: null, depositUncertain: false,
        simulationAttempted: transaction.status !== "pending_user_transfer_start", pollAttempts: 0 });
      this.saveRecovery(); this.startPolling();
    } catch (error) { if (this.valid(epoch)) this.failure(error); }
  };

  private clearPoll() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = undefined;
  }

  checkTransaction = async () => {
    const { discovery, session, deposit } = this.state;
    if (!discovery || !session || !deposit || this.state.busy) return;
    const epoch = this.epoch;
    this.update({ busy: "polling" });
    try {
      const transaction = await this.api.getTransaction(discovery, session, deposit.id);
      if (!this.valid(epoch)) return;
      this.update({ transaction, busy: null, error: null });
      this.saveRecovery();
      return transaction;
    } catch (error) {
      if (this.valid(epoch)) this.failure(error);
      return undefined;
    }
  };

  /** Bounded automatic polling. After the cap, the result is "not yet
   * confirmed" — never silently reported as failure or success. */
  private startPolling() {
    const epoch = this.epoch;
    const tick = async () => {
      if (!this.valid(epoch)) return;
      if (this.state.pollAttempts >= MAX_AUTO_POLLS) return;
      const transaction = await this.checkTransaction();
      if (!this.valid(epoch)) return;
      this.update({ pollAttempts: this.state.pollAttempts + 1 });
      if (transaction && TERMINAL_STATUSES.includes(transaction.status)) return;
      this.pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    this.pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
  }
}
