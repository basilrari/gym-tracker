# Database Migration Instructions

The automated migration script may fail due to network/DNS restrictions. Run the migration manually:

## Steps

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** → **New query**
4. Open `supabase/full-migration.sql` in this project
5. Copy the **entire** file contents
6. Paste into the SQL Editor
7. Click **Run**

The migration creates all tables, RLS policies, triggers, seed data, and the auto-profile trigger.

## Verify

After running, check that these tables exist: `profiles`, `muscle_groups`, `exercises`, `workout_templates`, `template_exercises`, `workouts`, `workout_sets`, `body_measurements`, `leaderboard_metrics`.
