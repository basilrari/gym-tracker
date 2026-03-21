import { createClient } from "@/lib/supabase/server";
import type { Workout, WorkoutWithSets, WorkoutSet } from "./types";
import { getTemplateWithExercises } from "./templates";
import {
  createWorkoutSession,
  getWorkoutSession,
  getWorkoutSessionWithLogs,
  seedExerciseLogsFromTemplate,
} from "./workout-sessions";

export type WorkoutRange = "7d" | "30d" | "all";

function sessionToWorkout(s: {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  total_volume_kg: number | null;
  created_at: string;
}): Workout {
  return {
    id: s.id,
    user_id: s.user_id,
    template_id: s.template_id,
    name: s.name,
    start_time: s.started_at,
    end_time: s.ended_at,
    notes: s.notes,
    total_volume_kg: s.total_volume_kg,
    created_at: s.created_at,
  };
}

function logsToWorkoutSets(sessionId: string, detail: Awaited<ReturnType<typeof getWorkoutSessionWithLogs>>): WorkoutSet[] {
  if (!detail) return [];
  const ordered = [...detail.logs].sort((a, b) => a.order_index - b.order_index);
  const out: WorkoutSet[] = [];
  for (const log of ordered) {
    for (const s of log.sets) {
      const tags = s.tags ?? [];
      out.push({
        id: s.id,
        workout_id: sessionId,
        exercise_id: log.exercise_id,
        set_index: s.set_number - 1,
        weight_kg: s.weight_kg ?? 0,
        reps: s.reps ?? 0,
        rpe: null,
        rest_seconds: s.rest_seconds,
        is_warmup: tags.includes("warmup"),
        is_failure: tags.includes("failure"),
        created_at: s.created_at,
        set_tag: tags[0] ?? null,
      });
    }
  }
  return out;
}

export async function createWorkout(
  userId: string,
  templateId?: string | null,
  name?: string
): Promise<Workout> {
  const supabase = await createClient();
  let workoutName = name ?? "Workout";

  if (templateId && !name) {
    const { data: template } = await supabase
      .from("workout_templates")
      .select("name")
      .eq("id", templateId)
      .single();
    if (template) workoutName = (template as { name: string }).name;
  }

  const session = await createWorkoutSession(userId, templateId ?? null, workoutName);

  if (templateId) {
    const tpl = await getTemplateWithExercises(templateId);
    if (tpl?.exercises?.length) {
      const ordered = [...tpl.exercises].sort((a, b) => a.order_index - b.order_index);
      const ids = ordered.map((te) => te.exercise_id);
      await seedExerciseLogsFromTemplate(session.id, ids);
    }
  }

  return sessionToWorkout(session);
}

export async function getWorkout(workoutId: string): Promise<Workout | null> {
  const session = await getWorkoutSession(workoutId);
  if (session) {
    return sessionToWorkout(session);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", workoutId)
    .single();

  if (error || !data) return null;
  return data as Workout;
}

export async function getWorkoutWithSets(
  workoutId: string
): Promise<WorkoutWithSets | null> {
  const sessionDetail = await getWorkoutSessionWithLogs(workoutId);
  if (sessionDetail) {
    const workout = sessionToWorkout(sessionDetail);
    return { ...workout, sets: logsToWorkoutSets(workoutId, sessionDetail) };
  }

  const workout = await getWorkout(workoutId);
  if (!workout) return null;

  const supabase = await createClient();
  const { data: sets, error } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("workout_id", workoutId)
    .order("exercise_id")
    .order("set_index");

  if (error) throw error;
  return { ...workout, sets: (sets ?? []) as WorkoutWithSets["sets"] };
}

export async function getUserWorkouts(
  userId: string,
  range: WorkoutRange = "30d"
): Promise<Workout[]> {
  const { getUserWorkoutSessions } = await import("./workout-sessions");
  const sessions = await getUserWorkoutSessions(userId, true, 300);
  const days = range === "7d" ? 7 : range === "30d" ? 30 : null;
  const fromCut = days
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.getTime();
      })()
    : null;

  const fromSessions = sessions
    .filter((s) => s.ended_at)
    .filter((s) => (fromCut ? new Date(s.started_at).getTime() >= fromCut : true))
    .map((s) => sessionToWorkout(s));

  const supabase = await createClient();
  let query = supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .not("end_time", "is", null)
    .order("start_time", { ascending: false });

  if (range !== "all" && fromCut) {
    query = query.gte("start_time", new Date(fromCut).toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  const legacy = (data ?? []) as Workout[];

  const merged = [...fromSessions, ...legacy].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );
  return merged;
}

export async function endWorkout(workoutId: string): Promise<void> {
  const { endWorkoutSession, getWorkoutSession } = await import("./workout-sessions");
  const s = await getWorkoutSession(workoutId);
  if (s) {
    await endWorkoutSession(workoutId);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .update({ end_time: new Date().toISOString() })
    .eq("id", workoutId);

  if (error) throw error;
}

export async function updateWorkout(
  workoutId: string,
  data: Partial<Pick<Workout, "name" | "notes">>
): Promise<void> {
  const { getWorkoutSession, updateSessionName } = await import("./workout-sessions");
  const s = await getWorkoutSession(workoutId);
  if (s) {
    if (data.name != null) await updateSessionName(workoutId, data.name);
    if (data.notes != null) {
      const supabase = await createClient();
      await supabase.from("workout_sessions").update({ notes: data.notes }).eq("id", workoutId);
    }
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .update(data)
    .eq("id", workoutId);
  if (error) throw error;
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  const { getWorkoutSession, deleteWorkoutSession } = await import("./workout-sessions");
  const s = await getWorkoutSession(workoutId);
  if (s) {
    await deleteWorkoutSession(workoutId);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
  if (error) throw error;
}
