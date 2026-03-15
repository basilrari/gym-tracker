-- Enable RLS on all tables
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

-- Profiles: anyone can read (for leaderboards), only own row for update
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Muscle groups: read for all (reference data)
CREATE POLICY "muscle_groups_select" ON muscle_groups FOR SELECT USING (true);

-- Exercises: read for all; insert/update only for own user-created or service role
CREATE POLICY "exercises_select" ON exercises FOR SELECT USING (true);
CREATE POLICY "exercises_insert_own" ON exercises FOR INSERT WITH CHECK (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "exercises_update_own" ON exercises FOR UPDATE USING (created_by = auth.uid());

-- Workout templates: select own or global (user_id is null)
CREATE POLICY "templates_select" ON workout_templates FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "templates_insert_own" ON workout_templates FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "templates_update_own" ON workout_templates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "templates_delete_own" ON workout_templates FOR DELETE USING (user_id = auth.uid());

-- Template exercises: via template ownership
CREATE POLICY "template_exercises_select" ON template_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_templates t
      WHERE t.id = template_id AND (t.user_id = auth.uid() OR t.user_id IS NULL)
    )
  );
CREATE POLICY "template_exercises_insert" ON template_exercises FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM workout_templates t
    WHERE t.id = template_id AND (t.user_id = auth.uid() OR t.user_id IS NULL)
  )
);
CREATE POLICY "template_exercises_update" ON template_exercises FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM workout_templates t
    WHERE t.id = template_id AND t.user_id = auth.uid()
  )
);
CREATE POLICY "template_exercises_delete" ON template_exercises FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM workout_templates t
    WHERE t.id = template_id AND t.user_id = auth.uid()
  )
);

-- Workouts: full CRUD only for own
CREATE POLICY "workouts_all_own" ON workouts FOR ALL USING (auth.uid() = user_id);

-- Workout sets: full CRUD only for own (via workout ownership)
CREATE POLICY "workout_sets_select" ON workout_sets FOR SELECT
  USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE POLICY "workout_sets_insert" ON workout_sets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
);
CREATE POLICY "workout_sets_update" ON workout_sets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
);
CREATE POLICY "workout_sets_delete" ON workout_sets FOR DELETE USING (
  EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
);

-- Body measurements: full CRUD only for own
CREATE POLICY "body_measurements_all_own" ON body_measurements FOR ALL USING (auth.uid() = user_id);

-- Achievements: read for all
CREATE POLICY "achievements_select" ON achievements FOR SELECT USING (true);

-- User achievements: full CRUD only for own
CREATE POLICY "user_achievements_all_own" ON user_achievements FOR ALL USING (auth.uid() = user_id);

-- Leaderboard metrics: select for all (leaderboards), insert/update for own
CREATE POLICY "leaderboard_select" ON leaderboard_metrics FOR SELECT USING (true);
CREATE POLICY "leaderboard_insert_own" ON leaderboard_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leaderboard_update_own" ON leaderboard_metrics FOR UPDATE USING (auth.uid() = user_id);
