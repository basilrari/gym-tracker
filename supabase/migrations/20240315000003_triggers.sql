-- Function to compute total_volume_kg for a workout (sum of weight_kg * reps for non-warmup sets)
CREATE OR REPLACE FUNCTION compute_workout_volume(p_workout_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(weight_kg * reps), 0)
  FROM workout_sets
  WHERE workout_id = p_workout_id AND is_warmup = false;
$$ LANGUAGE SQL STABLE;

-- Trigger: when workout end_time is set, update total_volume_kg
CREATE OR REPLACE FUNCTION trigger_set_workout_volume()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL THEN
    NEW.total_volume_kg := compute_workout_volume(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workouts_before_update_volume
  BEFORE UPDATE ON workouts
  FOR EACH ROW
  WHEN (NEW.end_time IS NOT NULL AND (OLD.end_time IS NULL OR OLD.end_time IS DISTINCT FROM NEW.end_time))
  EXECUTE FUNCTION trigger_set_workout_volume();

-- Also update volume when sets are added/updated after workout is ended
CREATE OR REPLACE FUNCTION trigger_workout_sets_volume()
RETURNS TRIGGER AS $$
DECLARE
  v_workout_id UUID;
  v_end_time TIMESTAMPTZ;
BEGIN
  v_workout_id := COALESCE(NEW.workout_id, OLD.workout_id);
  SELECT end_time INTO v_end_time FROM workouts WHERE id = v_workout_id;
  IF v_end_time IS NOT NULL THEN
    UPDATE workouts
    SET total_volume_kg = compute_workout_volume(v_workout_id)
    WHERE id = v_workout_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workout_sets_after_change_volume
  AFTER INSERT OR UPDATE OR DELETE ON workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_workout_sets_volume();

-- Function to upsert leaderboard_metrics for a user and period
CREATE OR REPLACE FUNCTION upsert_leaderboard_metrics(
  p_user_id UUID,
  p_period TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS void AS $$
DECLARE
  v_workouts_count INTEGER;
  v_total_volume NUMERIC;
  v_total_sets INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER, COALESCE(SUM(total_volume_kg), 0)
  INTO v_workouts_count, v_total_volume
  FROM workouts
  WHERE user_id = p_user_id
    AND start_time::date >= p_start_date
    AND start_time::date <= p_end_date;

  SELECT COUNT(*)::INTEGER INTO v_total_sets
  FROM workout_sets ws
  JOIN workouts w ON w.id = ws.workout_id
  WHERE w.user_id = p_user_id
    AND w.start_time::date >= p_start_date
    AND w.start_time::date <= p_end_date;

  INSERT INTO leaderboard_metrics (user_id, period, start_date, end_date, workouts_count, total_volume_kg, total_sets, updated_at)
  VALUES (p_user_id, p_period, p_start_date, p_end_date, v_workouts_count, v_total_volume, COALESCE(v_total_sets, 0), NOW())
  ON CONFLICT (user_id, period)
  DO UPDATE SET
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    workouts_count = EXCLUDED.workouts_count,
    total_volume_kg = EXCLUDED.total_volume_kg,
    total_sets = EXCLUDED.total_sets,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
