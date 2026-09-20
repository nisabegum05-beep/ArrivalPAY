import type { Page } from "@playwright/test";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { network } from "../../src/config/network";
import { usdcFixture } from "./stellar-account";

// Browser transport fixture only. No wallet bypass or test signing key is
// included in application code; signing happens in this Node test worker.
// Shared by wallet.spec.ts and anchor.spec.ts so both drive the same
// Freighter/Horizon simulation instead of two divergent copies.
export async function walletFixture(
  page: Page,
  options: {
    wrongNetwork?: boolean;
    rejectSign?: boolean;
    missingAccount?: boolean;
    lowReserve?: boolean;
    pending?: boolean;
    usdcEnabled?: boolean;
    usdcBalance?: string;
  } = {},
) {
  const key = Keypair.random();
  const address = key.publicKey();
  let enabled = !!options.usdcEnabled;
  let submissions = 0;
  await page.exposeFunction("fixtureSign", (xdr: string) => {
    const tx = TransactionBuilder.fromXDR(xdr, network.passphrase);
    tx.sign(key);
    return tx.toXDR();
  });
  await page.addInitScript(
    ({ address, passphrase, wrongNetwork, rejectSign }) => {
      window.addEventListener("message", async (event) => {
        if (
          event.source !== window ||
          event.data?.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST"
        )
          return;
        const request = event.data;
        let response: Record<string, unknown> = {};
        if (request.type === "REQUEST_CONNECTION_STATUS")
          response = { isConnected: true };
        if (["REQUEST_ACCESS", "REQUEST_PUBLIC_KEY"].includes(request.type))
          response = { publicKey: address };
        if (request.type === "REQUEST_NETWORK_DETAILS")
          response = {
            networkDetails: {
              network: wrongNetwork ? "PUBLIC" : "TESTNET",
              networkPassphrase: wrongNetwork
                ? "Public Global Stellar Network ; September 2015"
                : passphrase,
            },
          };
        if (request.type === "SUBMIT_TRANSACTION") {
          response = rejectSign
            ? { apiError: { code: -4, message: "Rejected by test fixture" } }
            : {
                signedTransaction: await (
                  window as unknown as {
                    fixtureSign(xdr: string): Promise<string>;
                  }
                ).fixtureSign(request.transactionXdr),
                signerAddress: address,
              };
        }
        window.postMessage(
          {
            source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
            messagedId: request.messageId,
            ...response,
          },
          window.location.origin,
        );
      });
    },
    {
      address,
      passphrase: network.passphrase,
      wrongNetwork: options.wrongNetwork,
      rejectSign: options.rejectSign,
    },
  );
  await page.route("https://horizon-testnet.stellar.org/**", async (route) => {
    const url = new URL(route.request().url());
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    const respond = (json: unknown, status = 200) =>
      route.fulfill({ status, json, headers });
    if (url.pathname === `/accounts/${address}`) {
      if (options.missingAccount)
        return respond({ status: 404, title: "Resource Missing" }, 404);
      return respond({
        _links: {},
        account_id: address,
        id: address,
        paging_token: "1",
        sequence: enabled ? "101" : "100",
        subentry_count: enabled ? 1 : 0,
        num_sponsoring: 0,
        num_sponsored: 0,
        last_modified_ledger: 1,
        last_modified_time: new Date().toISOString(),
        data: {},
        thresholds: { low_threshold: 1, med_threshold: 1, high_threshold: 1 },
        flags: {},
        signers: [{ key: address, weight: 1, type: "ed25519_public_key" }],
        balances: [
          {
            asset_type: "native",
            balance: options.lowReserve ? "1.0000000" : "100.0000000",
            buying_liabilities: "0.0000000",
            selling_liabilities: "0.0000000",
          },
          ...(enabled
            ? [usdcFixture(network.assetIssuer, { balance: options.usdcBalance ?? "0.0000000" })]
            : []),
        ],
      });
    }
    if (url.pathname === "/ledgers")
      return respond({
        _links: {},
        _embedded: {
          records: [
            {
              _links: {},
              base_reserve_in_stroops: 5_000_000,
              closed_at: new Date().toISOString(),
            },
          ],
        },
      });
    if (url.pathname === "/fee_stats")
      return respond({ last_ledger_base_fee: "100" });
    if (
      url.pathname === "/transactions" &&
      route.request().method() === "POST"
    ) {
      submissions++;
      const xdr = new URLSearchParams(route.request().postData() || "").get(
        "tx",
      )!;
      const tx = TransactionBuilder.fromXDR(xdr, network.passphrase);
      const hash = Array.from(tx.hash(), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      if (options.pending) return respond({ status: 504 }, 504);
      enabled = true;
      return respond({ hash, successful: true, ledger: 2 });
    }
    if (url.pathname.startsWith("/transactions/"))
      return respond({ status: 404 }, 404);
    return respond({ message: "Unexpected test fixture request" }, 500);
  });
  return { address, key, submissions: () => submissions };
}
