import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { network } from "../../src/config/network";
import { walletFixture } from "../fixtures/wallet-fixture";

test("connected wallet reviews and signs canonical USDC access", async ({
  page,
}, info) => {
  const fixture = await walletFixture(page);
  await page.goto("/student");
  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  await expect(page.getByText(fixture.address, { exact: true })).toBeVisible();
  await expect(page.getByLabel("XLM balance 100.0000000")).toBeVisible();
  await page.getByRole("button", { name: "Enable USDC" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText(network.assetIssuer, { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("0.00001 XLM", { exact: true })).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: info.outputPath("trustline-review.png"),
    fullPage: false,
  });
  await dialog.getByRole("button", { name: "Sign with Freighter" }).click();
  await expect(
    page.getByText("Trustline transaction confirmed", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("USDC balance 0.0000000")).toBeVisible();
  expect(fixture.submissions()).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("wallet-confirmed.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(page.getByLabel("USDC balance unavailable")).toBeVisible();
});

test("wrong network is rejected without displaying a Testnet balance", async ({
  page,
}) => {
  await walletFixture(page, { wrongNetwork: true });
  await page.goto("/student");
  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  await expect(
    page.getByRole("complementary").getByRole("alert"),
  ).toContainText("Switch Freighter to Testnet");
  await expect(page.getByLabel("XLM balance unavailable")).toBeVisible();
});

test("rejected signing never submits a transaction", async ({ page }) => {
  const fixture = await walletFixture(page, { rejectSign: true });
  await page.goto("/student");
  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  await page.getByRole("button", { name: "Enable USDC" }).click();
  await page.getByRole("button", { name: "Sign with Freighter" }).click();
  await expect(
    page.getByRole("complementary").getByRole("alert"),
  ).toContainText("Signing was not approved");
  expect(fixture.submissions()).toBe(0);
});

test("new accounts receive a test funding link and no invented balance", async ({
  page,
}) => {
  await walletFixture(page, { missingAccount: true });
  await page.goto("/student");
  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Activate your Testnet account." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Get test XLM/ }),
  ).toHaveAttribute("href", /^https:\/\/friendbot\.stellar\.org\?addr=G/);
  await expect(page.getByLabel("XLM balance unavailable")).toBeVisible();
});

test("insufficient XLM stops before the signing prompt", async ({ page }) => {
  const fixture = await walletFixture(page, { lowReserve: true });
  await page.goto("/student");
  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  await page.getByRole("button", { name: "Enable USDC" }).click();
  await expect(
    page.getByRole("complementary").getByRole("alert"),
  ).toContainText("More Testnet XLM is needed");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(fixture.submissions()).toBe(0);
});

test("ambiguous submissions keep a hash and cannot be submitted twice", async ({
  page,
}) => {
  const fixture = await walletFixture(page, { pending: true });
  await page.goto("/student");
  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  await page.getByRole("button", { name: "Enable USDC" }).click();
  await page.getByRole("button", { name: "Sign with Freighter" }).click();
  await expect(
    page.getByText("Result not confirmed yet", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".wallet-hash")).toHaveAttribute(
    "href",
    /^https:\/\/stellar\.expert\/explorer\/testnet\/tx\/[a-f0-9]{64}$/,
  );
  await expect(
    page.getByRole("button", { name: "Enable USDC" }),
  ).toBeDisabled();
  await page.reload();
  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  await expect(
    page.getByText("Result not confirmed yet", { exact: true }),
  ).toBeVisible();
  expect(fixture.submissions()).toBe(1);
});
