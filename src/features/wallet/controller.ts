import { loadAccount, type AccountSnapshot } from "@/services/stellar/account";
import { StellarError, safeError } from "@/services/stellar/errors";
import {
  prepareTrustline,
  type TrustlineQuote,
} from "@/services/stellar/trustline";
import {
  submitSignedTransaction,
  transactionHash,
  transactionStatus,
  verifySignedTransaction,
  type TransactionResult,
} from "@/services/stellar/transactions";
import {
  freighterAdapter,
  verifyIdentity,
  type WalletAdapter,
} from "./adapter";

type Receipt = TransactionResult & { address: string; expiresAt: number };
export type WalletState = {
  address: string | null;
  account: AccountSnapshot | null;
  accountMissing: boolean;
  busy:
    "connecting" | "refreshing" | "preparing" | "signing" | "submitting" | null;
  error: StellarError | null;
  quote: TrustlineQuote | null;
  receipt: Receipt | null;
};
const initialState: WalletState = {
  address: null,
  account: null,
  accountMissing: false,
  busy: null,
  error: null,
  quote: null,
  receipt: null,
};
const services = {
  loadAccount,
  prepareTrustline,
  submitSignedTransaction,
  transactionStatus,
  verifySignedTransaction,
};

export class WalletController {
  private state: WalletState = initialState;
  private listeners = new Set<() => void>();
  private epoch = 0;
  private checking = false;
  private pollAttempts = 0;
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
  private update(patch: Partial<WalletState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private valid(epoch: number) {
    return epoch === this.epoch;
  }
  private async identity(address: string) {
    verifyIdentity(await this.adapter.identity(), address);
  }
  private failure(error: unknown) {
    const safe = safeError(error);
    if (["WRONG_NETWORK", "WALLET_CHANGED"].includes(safe.code)) {
      this.epoch++;
      this.update({ ...initialState, error: safe });
    } else this.update({ busy: null, error: safe, quote: null });
  }
  private save(receipt: Receipt) {
    try {
      sessionStorage.setItem(
        `arrivalpay:testnet:trustline:${receipt.address}`,
        JSON.stringify(receipt),
      );
    } catch {
      /* The current tab can still track the transaction in memory. */
    }
  }
  private restore(address: string): Receipt | null {
    try {
      const value = JSON.parse(
        sessionStorage.getItem(`arrivalpay:testnet:trustline:${address}`) ||
          "null",
      ) as Receipt | null;
      if (
        !value ||
        value.address !== address ||
        !/^[a-f0-9]{64}$/.test(value.hash) ||
        !Number.isSafeInteger(value.expiresAt) ||
        value.expiresAt <= 0
      )
        return null;
      // Storage is a lookup hint, never evidence of success.
      return {
        address,
        hash: value.hash,
        expiresAt: value.expiresAt,
        state: "pending",
      };
    } catch {
      return null;
    }
  }
  connect = async () => {
    if (this.state.busy) return;
    const epoch = ++this.epoch;
    this.update({ ...initialState, busy: "connecting" });
    try {
      const identity = await this.adapter.connect();
      verifyIdentity(identity);
      if (!this.valid(epoch)) return;
      this.update({
        address: identity.address,
        receipt: this.restore(identity.address),
      });
      const account = await this.api.loadAccount(identity.address);
      if (this.valid(epoch))
        this.update({ account, accountMissing: !account, busy: null });
    } catch (error) {
      if (this.valid(epoch)) this.failure(error);
    }
  };
  disconnect = async () => {
    this.epoch++;
    this.update(initialState);
    try {
      await this.adapter.disconnect();
    } catch {
      /* Local session is cleared regardless of extension response. */
    }
  };
  refresh = async () => {
    const address = this.state.address;
    if (!address || this.state.busy) return;
    const epoch = this.epoch;
    this.update({ busy: "refreshing", error: null, quote: null });
    try {
      await this.identity(address);
      const receipt = this.state.receipt;
      if (receipt?.state === "pending") {
        const result = await this.api.transactionStatus(
          receipt.hash,
          receipt.expiresAt,
        );
        if (!this.valid(epoch)) return;
        const updated = { ...receipt, ...result };
        this.save(updated);
        this.update({ receipt: updated });
      }
      const account = await this.api.loadAccount(address);
      if (this.valid(epoch))
        this.update({ account, accountMissing: !account, busy: null });
    } catch (error) {
      if (this.valid(epoch)) this.failure(error);
    }
  };
  checkConnection = async () => {
    const address = this.state.address;
    if (!address || this.checking) return;
    this.checking = true;
    const epoch = this.epoch;
    try {
      await this.identity(address);
      if (
        this.valid(epoch) &&
        this.state.receipt?.state === "pending" &&
        !this.state.busy &&
        this.pollAttempts < 6
      ) {
        this.pollAttempts++;
        await this.refresh();
      }
    } catch (error) {
      if (this.valid(epoch)) this.failure(error);
    } finally {
      this.checking = false;
    }
  };
  prepare = async () => {
    const address = this.state.address;
    if (!address || this.state.busy || this.state.receipt?.state === "pending")
      return;
    const epoch = this.epoch;
    this.update({ busy: "preparing", error: null, quote: null });
    try {
      await this.identity(address);
      const quote = await this.api.prepareTrustline(address);
      if (this.valid(epoch)) this.update({ quote, busy: null });
    } catch (error) {
      if (this.valid(epoch)) this.failure(error);
    }
  };
  cancelQuote = () => {
    if (!this.state.busy) this.update({ quote: null });
  };
  confirm = async () => {
    const quote = this.state.quote;
    if (!quote || this.state.busy || this.state.receipt?.state === "pending")
      return;
    const epoch = this.epoch;
    this.update({ busy: "signing", error: null });
    try {
      if (Date.now() / 1000 >= quote.expiresAt)
        throw new StellarError(
          "TRANSACTION_FAILED",
          "This request expired. Prepare USDC access again to get a fresh network fee.",
        );
      await this.identity(quote.address);
      if (!this.valid(epoch)) return;
      const signedXdr = await this.adapter.sign(quote.xdr, quote.address);
      if (!this.valid(epoch)) return;
      await this.identity(quote.address);
      if (!this.valid(epoch)) return;
      const transaction = this.api.verifySignedTransaction(
        quote.xdr,
        signedXdr,
        quote.address,
      );
      const receipt: Receipt = {
        hash: transactionHash(transaction),
        state: "pending",
        address: quote.address,
        expiresAt: quote.expiresAt,
      };
      this.save(receipt);
      this.pollAttempts = 0;
      this.update({ busy: "submitting", quote: null, receipt });
      const result = await this.api.submitSignedTransaction(transaction);
      const updated = { ...receipt, ...result };
      this.save(updated);
      if (!this.valid(epoch)) return;
      this.update({ receipt: updated, busy: null });
      if (result.state === "confirmed") await this.refresh();
    } catch (error) {
      if (this.valid(epoch)) this.failure(error);
    }
  };
}
