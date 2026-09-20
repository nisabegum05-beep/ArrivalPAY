import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { walletFixture } from "../fixtures/wallet-fixture";

// Full create/fund/approve signing round trips are proven against the real
// deployed contract in tests/live/soroban-intent.test.ts, using this app's
// own service code. Soroban RPC's JSON-RPC surface (one POST endpoint
// multiplexing many methods) is not mocked here; these tests cover what a
// browser fixture can verify cheaply and reliably: role gating, and that an
// unreachable/failed contract read degrades to a visible error rather than a
// crash or a silently empty list.

test("the institution request form is gated behind a connected wallet", async ({
  page,
}) => {
  await walletFixture(page, { usdcEnabled: true });
  await page.goto("/institution");
  await expect(
    page.getByRole("heading", { name: "Payment requests" }),
  ).toBeVisible();
  const submit = page.getByRole("button", { name: "Create payment request" });
  await expect(submit).toBeDisabled();
  await expect(
    page.getByText("Connect your institution’s wallet to see your requests."),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  await expect(submit).toBeEnabled();
});

test("the student deposits section asks for a wallet before showing requests", async ({
  page,
}) => {
  await page.goto("/student");
  await expect(
    page.getByText(
      "Connect your wallet above to see enrollment deposits assigned to you.",
    ),
  ).toBeVisible();
});

test("a contract read failure (unfunded account) shows a readable error, not a crash", async ({
  page,
}) => {
  // The wallet fixture's address is a real-format keypair with no Testnet
  // account behind it, so the Soroban RPC read genuinely fails — this
  // exercises the real error path against the real network, not a mock.
  await walletFixture(page, { usdcEnabled: true });
  await page.goto("/student");
  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Could not load requests." }),
  ).toBeVisible({ timeout: 20_000 });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
