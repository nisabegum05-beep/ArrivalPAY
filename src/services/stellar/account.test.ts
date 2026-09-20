import { Keypair } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { network } from "@/config/network";
import {
  accountFixture,
  usdcFixture,
} from "../../../tests/fixtures/stellar-account";
import { readAccount } from "./account";

describe("account balances", () => {
  const address = Keypair.random().publicKey();
  it("never mistakes same-code tokens or pool shares for the configured USDC", () => {
    const account = accountFixture(address);
    account.balances.push(usdcFixture(Keypair.random().publicKey()));
    expect(readAccount(account).usdcAccess).toBe("missing");
    expect(readAccount(account).usdc).toBeNull();
    account.balances.push(usdcFixture(network.assetIssuer));
    expect(readAccount(account).usdc).toBe("12.1234567");
  });
  it("separates issuer restrictions and exhausted receiving capacity", () => {
    const account = accountFixture(address);
    account.balances.push(
      usdcFixture(network.assetIssuer, { is_authorized: false }),
    );
    expect(readAccount(account).usdcAccess).toBe("restricted");
    account.balances[1] = usdcFixture(network.assetIssuer, {
      balance: "999999.0000000",
      buying_liabilities: "1.0000000",
    });
    expect(readAccount(account).usdcAccess).toBe("full");
  });
});
