import { test, expect } from "@playwright/test";
import { Keypair } from "@stellar/stellar-sdk";
import { walletFixture } from "../fixtures/wallet-fixture";
import { usdcFixture } from "../fixtures/stellar-account";
import { network } from "../../src/config/network";

function request(recipient: string, patch = {}) {
  return { version: 1, network: "testnet", asset: "USDC", issuer: network.assetIssuer, recipient, amount: "2.5000000", reference: "AP-0123456789abcdef0123", expiresAt: Math.floor(Date.now() / 1000) + 3600, ...patch };
}

test("a recipient can generate and download a QR, with full address visible", async ({ page }, info) => {
  const fixture = await walletFixture(page, { usdcEnabled: true });
  await page.goto("/arrival-services");
  await page.getByRole("button", { name: "Connect Freighter", exact: true }).click();
  await page.getByLabel("Request amount (USDC)").fill("2.50");
  await page.getByRole("button", { name: "Create QR request" }).click();
  await expect(page.getByRole("img", { name: /QR payment request/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download QR" })).toHaveAttribute("href", /^data:image\/png/);
  await expect(page.getByText(`To: ${fixture.address}`)).toBeVisible();
  expect(fixture.submissions()).toBe(0);
  await page.screenshot({ path: info.outputPath("arrival-qr-fixture.png"), fullPage: true });
});

test("a scanned request reviews exact amount and fee before requesting a signature", async ({ page }) => {
  const fixture = await walletFixture(page, { usdcEnabled: true, usdcBalance: "10.0000000" });
  const recipient = Keypair.random().publicKey();
  await page.route(`https://horizon-testnet.stellar.org/accounts/${recipient}`, route => route.fulfill({ json: {
    _links: {}, account_id: recipient, sequence: "10", subentry_count: 1, num_sponsoring: 0, num_sponsored: 0,
    balances: [{ asset_type: "native", balance: "100.0000000", buying_liabilities: "0.0000000", selling_liabilities: "0.0000000" }, usdcFixture(network.assetIssuer, { balance: "0.0000000" })],
  } }));
  await page.goto(`/arrival-services#${new URLSearchParams({ pay: JSON.stringify(request(recipient)) })}`);
  await page.getByRole("button", { name: "Connect Freighter", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review your arrival payment." })).toBeVisible();
  await page.getByRole("button", { name: "Review payment and fee" }).click();
  await expect(page.getByText("0.0000100 XLM")).toBeVisible();
  expect(fixture.submissions()).toBe(0);
  await page.getByRole("button", { name: "Confirm payment in Freighter" }).click();
  await expect(page.getByText("Payment confirmed", { exact: true })).toBeVisible();
  expect(fixture.submissions()).toBe(1);
  await expect(page.getByRole("button", { name: "Confirm payment in Freighter" })).toHaveCount(0);
});

test("a QR for mainnet is rejected without payment controls", async ({ page }) => {
  await page.goto(`/arrival-services#${new URLSearchParams({ pay: JSON.stringify(request(Keypair.random().publicKey(), { network: "public" })) })}`);
  await expect(page.getByText("Only ArrivalPay Testnet requests are supported.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review payment and fee" })).toHaveCount(0);
});
