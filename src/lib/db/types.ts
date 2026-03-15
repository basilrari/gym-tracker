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

export type TemplateWithExercises = WorkoutTemplate & {
  exercises: (TemplateExercise & { exercise: Exercise })[];
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
  created_at: string;
};

export type WorkoutWithSets = Workout & {
  sets: WorkoutSet[];
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
