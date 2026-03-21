import { test, expect } from "@playwright/test";

test.describe("Signup page", () => {
  test("shows Gym Tracker and create account form", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /gym tracker/i })).toBeVisible();
    await expect(page.getByText(/create your account/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign up/i })).toBeVisible();
  });
});
