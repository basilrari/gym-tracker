# E2E tests

Run all tests (no skips):

```bash
npm run test:e2e
```

- **Login & signup** specs run without auth.
- **Templates** specs (create routine, edit name, description, reorder, add set, edit set, edit exercise name) require a logged-in user.

**To run the full suite and have everything pass:**

1. Sign up once in the app (http://localhost:3000/signup) with a test account.
2. Complete onboarding if you’re redirected there.
3. In `.env.local` set:
   ```env
   E2E_TEST_EMAIL=that-account@example.com
   E2E_TEST_PASSWORD=your-password
   ```
4. Run `npm run test:e2e`.

The script loads `.env.local` via `dotenv-cli`, so the same credentials are used for the auth setup and the template tests.
