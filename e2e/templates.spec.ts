import { test, expect } from "@playwright/test";

test.describe("Templates (authenticated)", () => {
  test("templates list shows Routines and Create new routine", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: /routines/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create new routine/i })).toBeVisible();
  });

  test("create new routine and edit name", async ({ page }) => {
    await page.goto("/templates");
    await page.getByRole("button", { name: /create new routine/i }).click();
    await expect(page).toHaveURL(/\/templates\/[a-f0-9-]+/);
    await expect(page.getByRole("heading", { name: /new routine/i })).toBeVisible();

    await page.getByRole("button", { name: /tap to edit/i }).click();
    await page.getByRole("textbox").fill("E2E Test Routine");
    await page.getByRole("button", { name: /^Save$/ }).first().click();
    await expect(page.getByRole("heading", { name: /e2e test routine/i })).toBeVisible();
  });

  test("add and save description", async ({ page }) => {
    await page.goto("/templates");
    await page.getByRole("button", { name: /create new routine/i }).click();
    await expect(page).toHaveURL(/\/templates\/[a-f0-9-]+/);

    await page.getByRole("button", { name: /add description/i }).click();
    await page.getByPlaceholder(/description/i).fill("E2E description");
    await page.getByRole("button", { name: /^Save$/ }).first().click();
    await expect(page.getByText("E2E description")).toBeVisible();
  });

  test("add exercise, add set, edit set", async ({ page }) => {
    await page.goto("/templates");
    await page.getByRole("button", { name: /create new routine/i }).click();
    await expect(page).toHaveURL(/\/templates\/[a-f0-9-]+/);

    await page.getByRole("button", { name: /add exercise/i }).click();
    await page.getByPlaceholder(/search exercises/i).fill("Bench");
    await page.getByRole("button", { name: /bench/i }).first().click();

    await expect(page.getByText(/no sets — tap to add/i)).toBeVisible();
    await page.getByRole("button", { name: /no sets — tap to add/i }).click();
    await page.getByRole("button", { name: /add set/i }).click();
    await expect(page.getByRole("button", { name: /add set/i })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /edit set/i }).first().click();
    await page.getByPlaceholder(/min/i).fill("8");
    await page.getByPlaceholder(/max/i).fill("12");
    await page.getByRole("button", { name: /^Save$/ }).first().click();
    await expect(page.getByText(/8–12 reps/i)).toBeVisible();
  });

  test("edit exercise name", async ({ page }) => {
    await page.goto("/templates");
    await page.getByRole("button", { name: /create new routine/i }).click();
    await page.getByRole("button", { name: /add exercise/i }).click();
    await page.getByPlaceholder(/search exercises/i).fill("Squat");
    await page.getByRole("button", { name: /squat/i }).first().click();

    await page.getByRole("button", { name: /squat/i }).first().click();
    await page.getByPlaceholder(/exercise name/i).fill("E2E Squat");
    await page.getByRole("button", { name: /^Save$/ }).first().click();
    await expect(page.getByText("E2E Squat")).toBeVisible();
  });

  test("reorder exercises", async ({ page }) => {
    await page.goto("/templates");
    await page.getByRole("button", { name: /create new routine/i }).click();
    await page.getByRole("button", { name: /add exercise/i }).click();
    await page.getByPlaceholder(/search exercises/i).fill("Bench");
    await page.getByRole("button", { name: /bench/i }).first().click();
    await page.getByRole("button", { name: /add exercise/i }).click();
    await page.getByPlaceholder(/search exercises/i).fill("Squat");
    await page.getByRole("button", { name: /squat/i }).first().click();

    await page.getByRole("button", { name: "Move down" }).first().click();
    await expect(page.locator("p.font-bold").first()).toContainText(/squat/i);
    await page.reload();
    await expect(page.locator("p.font-bold").first()).toContainText(/squat/i);
  });
});
