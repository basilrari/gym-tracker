-- Run this in Supabase Dashboard → SQL Editor → New query
-- Copy and paste the entire file, then click Run

-- ========== 1. Initial Schema ==========
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  bodyweight_kg NUMERIC,
  height_cm NUMERIC,
  units TEXT DEFAULT 'kg' CHECK (units IN ('kg', 'lb')),
  rest_timer_seconds INTEGER DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS muscle_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  primary_muscle_group_id INTEGER REFERENCES muscle_groups(id),
  equipment TEXT,
  is_default BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  scheduled_days INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  target_sets INTEGER NOT NULL DEFAULT 1,
  target_reps_min INTEGER,
  target_reps_max INTEGER,
  is_warmup BOOLEAN DEFAULT false,
  UNIQUE(template_id, order_index)
);

CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  notes TEXT,
  total_volume_kg NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  weight_kg NUMERIC NOT NULL,
  reps INTEGER NOT NULL,
  rpe NUMERIC,
  rest_seconds INTEGER,
  is_warmup BOOLEAN DEFAULT false,
  is_failure BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC,
  waist_cm NUMERIC,
  chest_cm NUMERIC,
  arm_cm NUMERIC,
  thigh_cm NUMERIC,
  bodyfat_percent NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leaderboard_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('7d', '30d', 'all_time')),
  start_date DATE,
  end_date DATE,
  workouts_count INTEGER DEFAULT 0,
  total_volume_kg NUMERIC DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_start_time ON workouts(start_time);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, date);
CREATE INDEX IF NOT EXISTS idx_leaderboard_metrics_period ON leaderboard_metrics(period);
CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id ON template_exercises(template_id);

-- ========== 2. RLS Policies ==========
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "muscle_groups_select" ON muscle_groups;
CREATE POLICY "muscle_groups_select" ON muscle_groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "exercises_select" ON exercises;
DROP POLICY IF EXISTS "exercises_insert_own" ON exercises;
DROP POLICY IF EXISTS "exercises_update_own" ON exercises;
CREATE POLICY "exercises_select" ON exercises FOR SELECT USING (true);
CREATE POLICY "exercises_insert_own" ON exercises FOR INSERT WITH CHECK (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "exercises_update_own" ON exercises FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "templates_select" ON workout_templates;
DROP POLICY IF EXISTS "templates_insert_own" ON workout_templates;
DROP POLICY IF EXISTS "templates_update_own" ON workout_templates;
DROP POLICY IF EXISTS "templates_delete_own" ON workout_templates;
CREATE POLICY "templates_select" ON workout_templates FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "templates_insert_own" ON workout_templates FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "templates_update_own" ON workout_templates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "templates_delete_own" ON workout_templates FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "template_exercises_select" ON template_exercises;
DROP POLICY IF EXISTS "template_exercises_insert" ON template_exercises;
DROP POLICY IF EXISTS "template_exercises_update" ON template_exercises;
DROP POLICY IF EXISTS "template_exercises_delete" ON template_exercises;
CREATE POLICY "template_exercises_select" ON template_exercises FOR SELECT USING (EXISTS (SELECT 1 FROM workout_templates t WHERE t.id = template_id AND (t.user_id = auth.uid() OR t.user_id IS NULL)));
CREATE POLICY "template_exercises_insert" ON template_exercises FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM workout_templates t WHERE t.id = template_id AND (t.user_id = auth.uid() OR t.user_id IS NULL)));
CREATE POLICY "template_exercises_update" ON template_exercises FOR UPDATE USING (EXISTS (SELECT 1 FROM workout_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));
CREATE POLICY "template_exercises_delete" ON template_exercises FOR DELETE USING (EXISTS (SELECT 1 FROM workout_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));

DROP POLICY IF EXISTS "workouts_all_own" ON workouts;
CREATE POLICY "workouts_all_own" ON workouts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "workout_sets_select" ON workout_sets;
DROP POLICY IF EXISTS "workout_sets_insert" ON workout_sets;
DROP POLICY IF EXISTS "workout_sets_update" ON workout_sets;
DROP POLICY IF EXISTS "workout_sets_delete" ON workout_sets;
CREATE POLICY "workout_sets_select" ON workout_sets FOR SELECT USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE POLICY "workout_sets_insert" ON workout_sets FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE POLICY "workout_sets_update" ON workout_sets FOR UPDATE USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE POLICY "workout_sets_delete" ON workout_sets FOR DELETE USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));

DROP POLICY IF EXISTS "body_measurements_all_own" ON body_measurements;
CREATE POLICY "body_measurements_all_own" ON body_measurements FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "achievements_select" ON achievements;
CREATE POLICY "achievements_select" ON achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_achievements_all_own" ON user_achievements;
CREATE POLICY "user_achievements_all_own" ON user_achievements FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "leaderboard_select" ON leaderboard_metrics;
DROP POLICY IF EXISTS "leaderboard_insert_own" ON leaderboard_metrics;
DROP POLICY IF EXISTS "leaderboard_update_own" ON leaderboard_metrics;
CREATE POLICY "leaderboard_select" ON leaderboard_metrics FOR SELECT USING (true);
CREATE POLICY "leaderboard_insert_own" ON leaderboard_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leaderboard_update_own" ON leaderboard_metrics FOR UPDATE USING (auth.uid() = user_id);

-- ========== 3. Triggers ==========
CREATE OR REPLACE FUNCTION compute_workout_volume(p_workout_id UUID) RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(weight_kg * reps), 0) FROM workout_sets WHERE workout_id = p_workout_id AND is_warmup = false;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION trigger_set_workout_volume() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL THEN NEW.total_volume_kg := compute_workout_volume(NEW.id); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workouts_before_update_volume ON workouts;
CREATE TRIGGER workouts_before_update_volume BEFORE UPDATE ON workouts
  FOR EACH ROW WHEN (NEW.end_time IS NOT NULL AND (OLD.end_time IS NULL OR OLD.end_time IS DISTINCT FROM NEW.end_time))
  EXECUTE FUNCTION trigger_set_workout_volume();

CREATE OR REPLACE FUNCTION trigger_workout_sets_volume() RETURNS TRIGGER AS $$
DECLARE v_workout_id UUID; v_end_time TIMESTAMPTZ;
BEGIN
  v_workout_id := COALESCE(NEW.workout_id, OLD.workout_id);
  SELECT end_time INTO v_end_time FROM workouts WHERE id = v_workout_id;
  IF v_end_time IS NOT NULL THEN UPDATE workouts SET total_volume_kg = compute_workout_volume(v_workout_id) WHERE id = v_workout_id; END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workout_sets_after_change_volume ON workout_sets;
CREATE TRIGGER workout_sets_after_change_volume AFTER INSERT OR UPDATE OR DELETE ON workout_sets FOR EACH ROW EXECUTE FUNCTION trigger_workout_sets_volume();

CREATE OR REPLACE FUNCTION upsert_leaderboard_metrics(p_user_id UUID, p_period TEXT, p_start_date DATE, p_end_date DATE) RETURNS void AS $$
DECLARE v_workouts_count INTEGER; v_total_volume NUMERIC; v_total_sets INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER, COALESCE(SUM(total_volume_kg), 0) INTO v_workouts_count, v_total_volume FROM workouts WHERE user_id = p_user_id AND start_time::date >= p_start_date AND start_time::date <= p_end_date;
  SELECT COUNT(*)::INTEGER INTO v_total_sets FROM workout_sets ws JOIN workouts w ON w.id = ws.workout_id WHERE w.user_id = p_user_id AND w.start_time::date >= p_start_date AND w.start_time::date <= p_end_date;
  INSERT INTO leaderboard_metrics (user_id, period, start_date, end_date, workouts_count, total_volume_kg, total_sets, updated_at)
  VALUES (p_user_id, p_period, p_start_date, p_end_date, v_workouts_count, v_total_volume, COALESCE(v_total_sets, 0), NOW())
  ON CONFLICT (user_id, period) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, workouts_count = EXCLUDED.workouts_count, total_volume_kg = EXCLUDED.total_volume_kg, total_sets = EXCLUDED.total_sets, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 4. Seed Data ==========
INSERT INTO muscle_groups (id, name) VALUES (1,'Chest'),(2,'Back'),(3,'Shoulders'),(4,'Quads'),(5,'Hamstrings'),(6,'Calves'),(7,'Biceps'),(8,'Triceps'),(9,'Abs'),(10,'Forearms') ON CONFLICT (id) DO NOTHING;
INSERT INTO exercises (id, name, slug, primary_muscle_group_id, equipment, is_default) VALUES
(1,'Pec Deck Fly','pec-deck-fly',1,'machine',true),(2,'Flat DB Bench Press','flat-db-bench-press',1,'dumbbell',true),(3,'Incline DB Press','incline-db-press',1,'dumbbell',true),(4,'DB Pullover','db-pullover',1,'dumbbell',true),
(5,'Cable Pushdown','cable-pushdown',8,'cable',true),(6,'Overhead Triceps Extension','overhead-triceps-extension',8,'cable',true),(7,'Skull Crusher','skull-crusher',8,'barbell',true),(8,'Extra Cable Extension','extra-cable-extension',8,'cable',true),
(9,'Straight-Arm Pulldown','straight-arm-pulldown',2,'cable',true),(10,'Lat Pulldown','lat-pulldown',2,'cable',true),(11,'Dependent Machine Row (P812)','dependent-machine-row-p812',2,'machine',true),(12,'Optional Upper-back Row','optional-upper-back-row',2,'machine',true),
(13,'Bar/EZ-Bar Curl','bar-ez-bar-curl',7,'barbell',true),(14,'Hammer Curl','hammer-curl',7,'dumbbell',true),(15,'Incline DB Curl','incline-db-curl',7,'dumbbell',true),(16,'Cable Curl','cable-curl',7,'cable',true),
(17,'Shoulder Press','shoulder-press',3,'dumbbell',true),(18,'Lateral Raise','lateral-raise',3,'dumbbell',true),(19,'Rear Delt Fly','rear-delt-fly',3,'machine',true),
(20,'Ab Crunch Machine','ab-crunch-machine',9,'machine',true),(21,'Wrist Curl','wrist-curl',10,'barbell',true),(22,'Reverse Wrist Curl','reverse-wrist-curl',10,'barbell',true),(23,'Reverse Curl','reverse-curl',10,'barbell',true),
(24,'Leg Extension','leg-extension',4,'machine',true),(25,'Goblet Squat','goblet-squat',4,'dumbbell',true),(26,'DB Lunges','db-lunges',4,'dumbbell',true),(27,'Leg Curl','leg-curl',5,'machine',true),(28,'Calf Raise','calf-raise',6,'machine',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO workout_templates (id, user_id, name, description, is_public) VALUES
('a0000001-0001-0001-0001-000000000001',NULL,'Day 1 – Chest + Triceps','Chest and triceps focus',false),
('a0000001-0001-0001-0001-000000000002',NULL,'Day 2 – Back + Biceps','Back and biceps focus',false),
('a0000001-0001-0001-0001-000000000003',NULL,'Day 3 – Shoulders + Abs','Shoulders and abs focus',false),
('a0000001-0001-0001-0001-000000000004',NULL,'Day 4 – Legs + Forearms','Legs and forearms focus',false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO template_exercises (template_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, is_warmup) VALUES
('a0000001-0001-0001-0001-000000000001',1,0,1,12,15,true),('a0000001-0001-0001-0001-000000000001',2,1,1,8,12,false),('a0000001-0001-0001-0001-000000000001',3,2,1,8,12,false),('a0000001-0001-0001-0001-000000000001',4,3,1,10,12,false),('a0000001-0001-0001-0001-000000000001',5,4,1,10,15,true),('a0000001-0001-0001-0001-000000000001',6,5,1,10,12,false),('a0000001-0001-0001-0001-000000000001',7,6,1,8,12,false),('a0000001-0001-0001-0001-000000000001',8,7,1,10,12,false),
('a0000001-0001-0001-0001-000000000002',9,0,1,12,15,true),('a0000001-0001-0001-0001-000000000002',10,1,1,8,12,false),('a0000001-0001-0001-0001-000000000002',11,2,1,8,12,false),('a0000001-0001-0001-0001-000000000002',12,3,1,8,12,false),('a0000001-0001-0001-0001-000000000002',13,4,1,8,12,false),('a0000001-0001-0001-0001-000000000002',14,5,1,8,12,false),('a0000001-0001-0001-0001-000000000002',15,6,1,8,12,false),('a0000001-0001-0001-0001-000000000002',16,7,1,10,12,false),
('a0000001-0001-0001-0001-000000000003',17,0,1,8,12,false),('a0000001-0001-0001-0001-000000000003',18,1,1,10,15,false),('a0000001-0001-0001-0001-000000000003',19,2,1,10,15,false),('a0000001-0001-0001-0001-000000000003',20,3,1,12,20,false),
('a0000001-0001-0001-0001-000000000004',24,0,1,12,15,true),('a0000001-0001-0001-0001-000000000004',25,1,1,8,12,false),('a0000001-0001-0001-0001-000000000004',26,2,1,8,12,false),('a0000001-0001-0001-0001-000000000004',27,3,1,10,12,false),('a0000001-0001-0001-0001-000000000004',28,4,1,12,20,false),('a0000001-0001-0001-0001-000000000004',21,5,1,12,15,false),('a0000001-0001-0001-0001-000000000004',22,6,1,12,15,false),('a0000001-0001-0001-0001-000000000004',23,7,1,10,12,false)
ON CONFLICT (template_id, order_index) DO NOTHING;

-- ========== 5. Auto-profile trigger (optional) ==========
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
DECLARE base_username TEXT; final_username TEXT;
BEGIN
  base_username := COALESCE(split_part(NEW.email, '@', 1), 'user');
  final_username := base_username || '_' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, final_username) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add scheduled_days if table was created before this column existed (1=Mon .. 7=Sun)
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS scheduled_days INTEGER[] DEFAULT '{}';

-- Add display_name to template_exercises for custom names per routine
ALTER TABLE template_exercises ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ========== 6. Template exercise sets (multi-set per exercise) ==========
CREATE TABLE IF NOT EXISTS template_exercise_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_exercise_id UUID NOT NULL REFERENCES template_exercises(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  reps_min INTEGER,
  reps_max INTEGER,
  weight_kg NUMERIC,
  tag TEXT NOT NULL DEFAULT 'warmup',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_exercise_id, set_index)
);

CREATE INDEX IF NOT EXISTS idx_template_exercise_sets_template_exercise_id ON template_exercise_sets(template_exercise_id);

ALTER TABLE template_exercise_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "template_exercise_sets_select" ON template_exercise_sets;
DROP POLICY IF EXISTS "template_exercise_sets_insert" ON template_exercise_sets;
DROP POLICY IF EXISTS "template_exercise_sets_update" ON template_exercise_sets;
DROP POLICY IF EXISTS "template_exercise_sets_delete" ON template_exercise_sets;
CREATE POLICY "template_exercise_sets_select" ON template_exercise_sets FOR SELECT USING (
  EXISTS (SELECT 1 FROM template_exercises te JOIN workout_templates t ON t.id = te.template_id WHERE te.id = template_exercise_id AND (t.user_id = auth.uid() OR t.user_id IS NULL))
);
CREATE POLICY "template_exercise_sets_insert" ON template_exercise_sets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM template_exercises te JOIN workout_templates t ON t.id = te.template_id WHERE te.id = template_exercise_id AND (t.user_id = auth.uid() OR t.user_id IS NULL))
);
CREATE POLICY "template_exercise_sets_update" ON template_exercise_sets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM template_exercises te JOIN workout_templates t ON t.id = te.template_id WHERE te.id = template_exercise_id AND t.user_id = auth.uid())
);
CREATE POLICY "template_exercise_sets_delete" ON template_exercise_sets FOR DELETE USING (
  EXISTS (SELECT 1 FROM template_exercises te JOIN workout_templates t ON t.id = te.template_id WHERE te.id = template_exercise_id AND t.user_id = auth.uid())
);

-- Backfill: one set per existing template_exercise from current target_* and is_warmup
INSERT INTO template_exercise_sets (template_exercise_id, set_index, reps_min, reps_max, weight_kg, tag)
SELECT id, 0, target_reps_min, target_reps_max, NULL, CASE WHEN is_warmup THEN 'warmup' ELSE 'light' END
FROM template_exercises
WHERE NOT EXISTS (SELECT 1 FROM template_exercise_sets tes WHERE tes.template_exercise_id = template_exercises.id);

-- Optional: store tag on completed workout sets for consistency
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS set_tag TEXT;

-- Allow custom tags: drop restrictive CHECK so any tag string is allowed (e.g. up to 50 chars)
ALTER TABLE template_exercise_sets DROP CONSTRAINT IF EXISTS template_exercise_sets_tag_check;
ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_set_tag_check;
-- Re-add optional length limit for custom tags (optional; omit to allow any length)
-- ALTER TABLE template_exercise_sets ADD CONSTRAINT template_exercise_sets_tag_len CHECK (char_length(tag) <= 50);
