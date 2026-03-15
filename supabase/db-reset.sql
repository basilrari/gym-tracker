-- WARNING: This deletes ALL data. Run in Supabase SQL Editor only when you want a clean DB.
-- After running this, run full-migration.sql (or npm run db:migrate) to recreate schema and seed data.

DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS leaderboard_metrics CASCADE;
DROP TABLE IF EXISTS workout_sets CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS template_exercises CASCADE;
DROP TABLE IF EXISTS workout_templates CASCADE;
DROP TABLE IF EXISTS body_measurements CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS muscle_groups CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Do not drop auth.users (Supabase managed). Re-run full-migration.sql to recreate app tables and seed.