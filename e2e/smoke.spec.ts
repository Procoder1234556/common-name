import { expect, test } from "playwright/test";

test.describe("home check smoke", () => {
  test("submit ACME → EXACT_TAKEN signal + MCA verify link", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByText("Common Name").first()).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /see how unique your company name/i,
      }),
    ).toBeVisible();

    const nameInput = page.getByLabel(/proposed company name/i);
    await nameInput.fill("ACME Private Limited");

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/check") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: /check uniqueness/i }).click();
    const response = await responsePromise;
    expect(response.ok(), `check status ${response.status()}`).toBe(true);

    const results = page.locator("#results");
    const signal = results.getByTestId("signal-block");
    await expect(signal).toBeVisible();
    await expect(signal).toContainText(/exact matches|appears taken/i);

    const mca = page.getByTestId("mca-verify-link");
    await expect(mca).toBeVisible();
    await expect(mca).toHaveAttribute("href", /mca\.gov\.in/i);
    await expect(mca).toHaveAttribute("target", "_blank");
    await expect(mca).toHaveAttribute("rel", /noopener/);

    await expect(
      results.getByText(/snapshot uniqueness signal/i),
    ).toBeVisible();
  });

  test("keyboard: fill field and submit via Enter", async ({ page }) => {
    await page.goto("/");

    const nameInput = page.getByLabel(/proposed company name/i);
    await nameInput.focus();
    await nameInput.fill("Xylophone Nebula Trading Works");

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/check") && res.request().method() === "POST",
    );
    await nameInput.press("Enter");
    const response = await responsePromise;
    expect(response.ok(), `check status ${response.status()}`).toBe(true);

    const results = page.locator("#results");
    await expect(results.getByTestId("signal-block")).toBeVisible();
    await expect(results.getByTestId("signal-block")).toContainText(
      /likely unique/i,
    );
    await expect(page.getByTestId("mca-verify-link")).toBeVisible();
  });
});
