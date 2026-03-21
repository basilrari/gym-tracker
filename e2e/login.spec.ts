import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("shows Gym Tracker title and sign in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /gym tracker/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("has email and password inputs", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });
});
