export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  bodyweight_kg: number | null;
  height_cm: number | null;
  units: "kg" | "lb";
  rest_timer_seconds: number;
  created_at: string;
};

export type MuscleGroup = {
  id: number;
  name: string;
};

export type Exercise = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  primary_muscle_group_id: number | null;
  equipment: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
};

/** Day of week: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun. Empty = any day. */
export type WorkoutTemplate = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  is_public: boolean;
  /** 1=Mon .. 7=Sun; empty = no specific days */
  scheduled_days?: number[];
  created_at: string;
};

/** Preset tag values; custom tags are also allowed (any string). */
export type SetTag = "hard" | "failure" | "warmup" | "light";

export type TemplateExerciseSet = {
  id: string;
  template_exercise_id: string;
  set_index: number;
  reps_min: number | null;
  reps_max: number | null;
  weight_kg: number | null;
  tag: string;
  created_at: string;
};

export type TemplateExercise = {
  id: string;
  template_id: string;
  exercise_id: number;
  order_index: number;
  target_sets: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  is_warmup: boolean;
  display_name?: string | null;
};

export type TemplateExerciseWithSets = TemplateExercise & {
  exercise: Exercise;
  sets: TemplateExerciseSet[];
};

export type TemplateWithExercises = WorkoutTemplate & {
  exercises: TemplateExerciseWithSets[];
};

export type Workout = {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  start_time: string;
  end_time: string | null;
  notes: string | null;
  total_volume_kg: number | null;
  created_at: string;
  /** `session` = row in `workout_sessions` (v2); `legacy` = `workouts` table */
  source?: "session" | "legacy";
};

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_id: number;
  set_index: number;
  weight_kg: number;
  reps: number;
  rpe: number | null;
  rest_seconds: number | null;
  is_warmup: boolean;
  is_failure: boolean;
  set_tag?: string | null;
  created_at: string;
  /** Session `sets` table: full tag list (warmup, failure, pr, …) */
  session_tags?: string[];
  remarks?: string | null;
};

export type WorkoutWithSets = Workout & {
  sets: WorkoutSet[];
  /** Present when workout is a `workout_sessions` row (v2). */
  sessionExerciseLogOrder?: { logId: string; exerciseId: number }[];
};

export type BodyMeasurement = {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  bodyfat_percent: number | null;
  created_at: string;
};

export type LeaderboardRow = {
  user_id: string;
  username: string;
  display_name: string | null;
  workouts_count: number;
  total_volume_kg: number;
  total_sets: number;
  rank: number;
};

export type LeaderboardPeriod = "7d" | "30d" | "all_time";

/** workout_sessions — v2 active workout */
export type WorkoutSession = {
  id: string;
  user_id: string;
  name: string;
  template_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  total_volume_kg: number | null;
  notes: string | null;
  created_at: string;
};

/** exercise_logs — one row per exercise instance in a session */
export type ExerciseLog = {
  id: string;
  session_id: string;
  exercise_id: number;
  order_index: number;
  remarks: string | null;
  created_at: string;
};

/** sets — per exercise_log (table name: sets) */
export type WorkoutSessionSetRow = {
  id: string;
  exercise_log_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  tags: string[];
  remarks: string | null;
  rest_seconds: number | null;
  created_at: string;
};

export type BodyWeightEntry = {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
};

export type ExerciseLogWithSets = ExerciseLog & {
  sets: WorkoutSessionSetRow[];
  exercise: Exercise;
};

export type WorkoutSessionWithLogs = WorkoutSession & {
  logs: ExerciseLogWithSets[];
};
