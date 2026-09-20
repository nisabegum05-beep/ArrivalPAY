import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { network } from "../../src/config/network";
import { walletFixture } from "../fixtures/wallet-fixture";

// The anchor's SEP-10 signing key is a hardcoded constant this app verifies
// (src/config/network.ts, src/services/anchor/discovery.ts) as an
// anti-phishing safeguard — a mock anchor cannot forge a valid challenge
// signature for it without that real private key. So this suite tests what
// a browser fixture honestly can: gating, discovery, and its safety checks.
// The full discover -> auth -> quote -> deposit -> simulate chain is proven
// against the real anchor in tests/live/anchor-deposit.test.ts instead.
function tomlFixture(overrides: Partial<Record<string, string>> = {}) {
  const base: Record<string, string> = {
    VERSION: "2.7.0",
    NETWORK_PASSPHRASE: network.passphrase,
    SIGNING_KEY: network.anchorSigningKey,
    WEB_AUTH_ENDPOINT: `https://${network.anchorHomeDomain}/auth`,
    TRANSFER_SERVER: `https://${network.anchorHomeDomain}/sep6`,
    KYC_SERVER: `https://${network.anchorHomeDomain}/sep12`,
    ANCHOR_QUOTE_SERVER: `https://${network.anchorHomeDomain}/sep38`,
    ...overrides,
  };
  const lines = Object.entries(base).map(([key, value]) => `${key}="${value}"`);
  lines.push(
    "[[CURRENCIES]]",
    `code="${network.assetCode}"`,
    `issuer="${network.assetIssuer}"`,
    'status="test"',
  );
  return lines.join("\n");
}

async function mockAnchorToml(
  page: import("@playwright/test").Page,
  toml: string,
) {
  await page.route(
    `https://${network.anchorHomeDomain}/.well-known/stellar.toml`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: toml,
        headers: { "access-control-allow-origin": "*" },
      }),
  );
}

test("the anchor connect action is gated behind an active USDC trustline", async ({
  page,
}) => {
  await walletFixture(page, { usdcEnabled: false });
  await page.goto("/student");
  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  await expect(page.getByText("TR Mock Anchor")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Connect to TR Mock Anchor" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Enable USDC on your wallet above"),
  ).toBeVisible();
});

test("a signing key that does not match the expected anchor is rejected before any signature is requested", async ({
  page,
}) => {
  await walletFixture(page, { usdcEnabled: true });
  await mockAnchorToml(
    page,
    tomlFixture({ SIGNING_KEY: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }),
  );
  await page.goto("/student");
  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  const connect = page.getByRole("button", { name: "Connect to TR Mock Anchor" });
  await expect(connect).toBeVisible();
  await connect.click();
  await expect(
    page.getByText("The anchor's signing key does not match"),
  ).toBeVisible();
});

test("an anchor endpoint published outside its own domain is rejected", async ({
  page,
}) => {
  await walletFixture(page, { usdcEnabled: true });
  await mockAnchorToml(
    page,
    tomlFixture({ TRANSFER_SERVER: "https://attacker.example/sep6" }),
  );
  await page.goto("/student");
  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Connect to TR Mock Anchor" })
    .click();
  await expect(
    page.getByText("do not stay on its own domain"),
  ).toBeVisible();
});

test("the anchor section stays accessible once visible", async ({ page }) => {
  await walletFixture(page, { usdcEnabled: true });
  await mockAnchorToml(page, tomlFixture());
  await page.goto("/student");
  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Connect to TR Mock Anchor" }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
