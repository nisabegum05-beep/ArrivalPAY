import { network } from "@/config/network";
import { assertAddress } from "@/services/stellar/account";
import { StellarError } from "@/services/stellar/errors";

export type WalletIdentity = { address: string; networkPassphrase: string };
export interface WalletAdapter {
  connect(): Promise<WalletIdentity>;
  identity(): Promise<WalletIdentity>;
  sign(xdr: string, address: string): Promise<string>;
  disconnect(): Promise<void>;
}

async function walletResponse<T>(
  promise: Promise<T>,
  timeout = 12_000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new StellarError(
                "WALLET_CHANGED",
                "Freighter did not respond. Unlock the extension and reconnect.",
              ),
            ),
          timeout,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

let kitPromise:
  | Promise<
      typeof import("@creit-tech/stellar-wallets-kit/sdk").StellarWalletsKit
    >
  | undefined;

async function getKit() {
  if (typeof window === "undefined")
    throw new Error("Wallet access requires a browser.");
  kitPromise ??= Promise.all([
    import("@creit-tech/stellar-wallets-kit/sdk"),
    import("@creit-tech/stellar-wallets-kit/modules/freighter"),
    import("@creit-tech/stellar-wallets-kit/types"),
  ])
    .then(([{ StellarWalletsKit }, { FreighterModule }, { Networks }]) => {
      StellarWalletsKit.init({
        modules: [new FreighterModule()],
        network: Networks.TESTNET,
      });
      return StellarWalletsKit;
    })
    .catch((error) => {
      kitPromise = undefined;
      throw error;
    });
  return kitPromise;
}

export function verifyIdentity(
  identity: WalletIdentity,
  expectedAddress?: string,
) {
  if (identity.networkPassphrase !== network.passphrase)
    throw new StellarError(
      "WRONG_NETWORK",
      "Switch Freighter to Testnet, then connect again. ArrivalPay does not submit to Mainnet.",
    );
  assertAddress(identity.address);
  if (expectedAddress && expectedAddress !== identity.address)
    throw new StellarError(
      "WALLET_CHANGED",
      "The selected wallet account changed. Connect again to load the correct balance.",
    );
}

export const freighterAdapter: WalletAdapter = {
  async connect() {
    const api = await import("@stellar/freighter-api");
    const available = await api.isConnected();
    if (available.error || !available.isConnected)
      throw new StellarError(
        "WALLET_MISSING",
        "Freighter was not detected. Install or unlock its browser extension, then try again.",
      );
    const kit = await getKit();
    kit.setWallet("freighter");
    try {
      const { address } = await walletResponse(kit.fetchAddress(), 120_000);
      const { networkPassphrase } = await walletResponse(kit.getNetwork());
      const identity = { address, networkPassphrase };
      verifyIdentity(identity);
      return identity;
    } catch (error) {
      if (error instanceof StellarError) throw error;
      throw new StellarError(
        "WALLET_REJECTED",
        "Connection was not approved. Open Freighter, unlock it, and try connecting again.",
      );
    }
  },
  async identity() {
    const api = await import("@stellar/freighter-api");
    const [account, net] = await walletResponse(
      Promise.all([api.getAddress(), api.getNetwork()]),
    );
    if (account.error || net.error || !account.address)
      throw new StellarError(
        "WALLET_CHANGED",
        "Wallet access is no longer available. Unlock Freighter and reconnect.",
      );
    return {
      address: account.address,
      networkPassphrase: net.networkPassphrase,
    };
  },
  async sign(xdr, address) {
    const kit = await getKit();
    try {
      const result = await walletResponse(
        kit.signTransaction(xdr, {
          address,
          networkPassphrase: network.passphrase,
        }),
        180_000,
      );
      if (
        !result.signedTxXdr ||
        (result.signerAddress && result.signerAddress !== address)
      )
        throw new StellarError(
          "WALLET_CHANGED",
          "The selected account did not sign. Reconnect the correct account.",
        );
      return result.signedTxXdr;
    } catch (error) {
      if (error instanceof StellarError) throw error;
      throw new StellarError(
        "WALLET_REJECTED",
        "Signing was not approved. No transaction was submitted by ArrivalPay.",
      );
    }
  },
  async disconnect() {
    if (kitPromise) await (await kitPromise).disconnect();
  },
};
