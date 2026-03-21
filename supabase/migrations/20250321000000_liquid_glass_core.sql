-- Liquid Glass v2 core tables (coexists with legacy schema until you drop old tables).
-- Uses existing public.profiles and public.exercises.

CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  total_volume_kg NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, order_index)
);

CREATE TABLE IF NOT EXISTS sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_log_id UUID NOT NULL REFERENCES exercise_logs(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight_kg NUMERIC,
  tags JSONB DEFAULT '[]'::jsonb,
  remarks TEXT,
  rest_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exercise_log_id, set_number)
);

CREATE TABLE IF NOT EXISTS body_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_started ON workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_session ON exercise_logs(session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sets_exercise_log ON sets(exercise_log_id, set_number);
CREATE INDEX IF NOT EXISTS idx_body_weights_user_date ON body_weights(user_id, date DESC);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_sessions_all_own" ON workout_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "exercise_logs_select_own" ON exercise_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM workout_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "exercise_logs_insert_own" ON exercise_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workout_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
);
CREATE POLICY "exercise_logs_update_own" ON exercise_logs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM workout_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
);
CREATE POLICY "exercise_logs_delete_own" ON exercise_logs FOR DELETE USING (
  EXISTS (SELECT 1 FROM workout_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
);

CREATE POLICY "sets_select_own" ON sets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM exercise_logs el
    JOIN workout_sessions s ON s.id = el.session_id
    WHERE el.id = exercise_log_id AND s.user_id = auth.uid()
  ));
CREATE POLICY "sets_insert_own" ON sets FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM exercise_logs el
    JOIN workout_sessions s ON s.id = el.session_id
    WHERE el.id = exercise_log_id AND s.user_id = auth.uid()
  )
);
CREATE POLICY "sets_update_own" ON sets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM exercise_logs el
    JOIN workout_sessions s ON s.id = el.session_id
    WHERE el.id = exercise_log_id AND s.user_id = auth.uid()
  )
);
CREATE POLICY "sets_delete_own" ON sets FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM exercise_logs el
    JOIN workout_sessions s ON s.id = el.session_id
    WHERE el.id = exercise_log_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "body_weights_all_own" ON body_weights FOR ALL USING (auth.uid() = user_id);
