import { Account, type Horizon } from "@stellar/stellar-sdk";

export function accountFixture(
  address: string,
  balances?: Horizon.HorizonApi.BalanceLine[],
): Horizon.AccountResponse {
  return Object.assign(new Account(address, "100"), {
    account_id: address,
    subentry_count: 0,
    num_sponsoring: 0,
    num_sponsored: 0,
    last_modified_ledger: 1,
    balances: balances ?? [
      {
        asset_type: "native",
        balance: "100.0000000",
        buying_liabilities: "0.0000000",
        selling_liabilities: "0.0000000",
      },
    ],
  }) as unknown as Horizon.AccountResponse;
}

export function usdcFixture(
  issuer: string,
  overrides: Partial<Horizon.HorizonApi.BalanceLineAsset> = {},
): Horizon.HorizonApi.BalanceLineAsset {
  return {
    asset_type: "credit_alphanum4",
    asset_code: "USDC",
    asset_issuer: issuer,
    balance: "12.1234567",
    limit: "1000000.0000000",
    buying_liabilities: "0.0000000",
    selling_liabilities: "0.0000000",
    is_authorized: true,
    is_authorized_to_maintain_liabilities: true,
    is_clawback_enabled: false,
    last_modified_ledger: 1,
    ...overrides,
  };
}
