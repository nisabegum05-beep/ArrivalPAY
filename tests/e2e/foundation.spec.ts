import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  "/",
  "/student",
  "/institution",
  "/transactions",
  "/arrival-services",
  `/intent/${"a".repeat(100)}`,
];

test("all screens are accessible and fit the viewport", async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  for (const [index, route] of routes.entries()) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`screen-${index}.png`),
      fullPage: true,
    });
  }
  expect(browserErrors).toEqual([]);
});

test("navigation works and a missing wallet is explained", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Open student demo" }).click();
  await expect(page).toHaveURL(/\/student$/);
  await page
    .getByRole("button", { name: "Connect Freighter", exact: true })
    .click();
  await expect(
    page.getByRole("complementary").getByRole("alert"),
  ).toContainText("Freighter was not detected");
  await expect(page.getByLabel("XLM balance unavailable")).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Institution", exact: true })
    .click();
  await expect(page.getByLabel("Student wallet address")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Create payment request" }),
  ).toBeDisabled();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Activity", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Connect a wallet to see payment activity." }),
  ).toBeVisible();
});

test("keyboard users can skip navigation and unknown pages give a route home", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
  await page.getByRole("link", { name: "Back to overview" }).click();
  await expect(page).toHaveURL("/");
});
