# Database Migration Instructions

## Option A: From the terminal

**Fix the connection string first.** The direct DB host (`db.xxx.supabase.co`) often does not resolve from your network. Use the **Session pooler** URL instead:

1. In Supabase: **Project Settings** → **Database** → **Connection string**.
2. Open the **URI** tab and select **Session pooler** (not "Direct connection"). The URL should use port **6543** and a host like `aws-0-xx.pooler.supabase.com`.
3. Copy that URI and put it in `.env.local`:
   ```env
   DATABASE_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
4. Run:

```bash
npm run db:migrate
```

## Option B: From the Supabase Dashboard

If the terminal script fails (e.g. network/DNS), run the migration manually:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** → **New query**
4. Open `supabase/full-migration.sql` in this project
5. Copy the **entire** file contents
6. Paste into the SQL Editor
7. Click **Run**

The migration creates all tables, RLS policies, triggers, seed data, and the auto-profile trigger.

### Adding the `scheduled_days` column (if you already ran the migration earlier)

To enable "scheduled days" per template (Mon–Sun), run this once in SQL Editor:

```sql
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS scheduled_days INTEGER[] DEFAULT '{}';
```

Or fix `DATABASE_URL` (Session pooler, see Option A) and run `npm run db:migrate` to apply new migrations.

## Clean DB (reset everything)

To wipe all app data and start fresh:

1. In Supabase **SQL Editor**, run the contents of `supabase/db-reset.sql` (drops all app tables).
2. Then run the full migration: paste and run `supabase/full-migration.sql`, or run `npm run db:migrate` if `DATABASE_URL` is set (Session pooler).

## Verify

After running, check that these tables exist: `profiles`, `muscle_groups`, `exercises`, `workout_templates`, `template_exercises`, `workouts`, `workout_sets`, `body_measurements`, `leaderboard_metrics`.
