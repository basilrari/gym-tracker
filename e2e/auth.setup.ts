import * as fs from "fs";
import * as path from "path";
import { test as setup, expect } from "@playwright/test";

// Load .env.local in worker so E2E_TEST_* are available (worker cwd may differ)
const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const loginEmail = process.env.E2E_TEST_EMAIL;
  const loginPassword = process.env.E2E_TEST_PASSWORD;

  if (loginEmail && loginPassword) {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(loginEmail);
    await page.locator("#password").fill(loginPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/onboarding|\/templates|^http:\/\/localhost:3000\/?$/, { timeout: 15000 });
    if (page.url().includes("/onboarding")) {
      await page.getByLabel(/username/i).fill("e2etest");
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page).toHaveURL(/\/(templates|$)/, { timeout: 10000 });
    }
  } else {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "E2ETestPassword123!";
    await page.goto("/signup");
    await page.getByLabel(/email/i).fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /sign up/i }).click();
    const redirected = await page.waitForURL(/\/onboarding|\/(templates|$)/, { timeout: 15000 }).then(() => true).catch(() => false);
    if (!redirected) {
      throw new Error(
        "Signup did not redirect (Supabase may require email confirmation). Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in .env.local with a real test account, then run npm run test:e2e."
      );
    }
    if (page.url().includes("/onboarding")) {
      await page.getByLabel(/username/i).fill("e2etest");
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page).toHaveURL(/\/(templates|$)/, { timeout: 10000 });
    }
  }

  await page.goto("/templates");
  await expect(page).toHaveURL(/\/templates/);
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
