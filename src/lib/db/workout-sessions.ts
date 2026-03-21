import { createClient } from "@/lib/supabase/server";
import type {
  ExerciseLog,
  ExerciseLogWithSets,
  WorkoutSession,
  WorkoutSessionSetRow,
  WorkoutSessionWithLogs,
} from "./types";

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t));
  if (raw && typeof raw === "object" && "length" in (raw as object)) {
    return Array.from(raw as unknown[]).map((t) => String(t));
  }
  return [];
}

export async function isWorkoutSessionId(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("workout_sessions").select("id").eq("id", id).maybeSingle();
  return !!data;
}

export async function createWorkoutSession(
  userId: string,
  templateId: string | null,
  name: string
): Promise<WorkoutSession> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      template_id: templateId,
      name,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as WorkoutSession;
}

export async function seedExerciseLogsFromTemplate(
  sessionId: string,
  exerciseIdsInOrder: number[]
): Promise<void> {
  if (exerciseIdsInOrder.length === 0) return;
  const supabase = await createClient();
  const rows = exerciseIdsInOrder.map((exercise_id, order_index) => ({
    session_id: sessionId,
    exercise_id,
    order_index,
  }));
  const { error } = await supabase.from("exercise_logs").insert(rows);
  if (error) throw error;
}

export async function getWorkoutSession(sessionId: string): Promise<WorkoutSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workout_sessions").select("*").eq("id", sessionId).single();
  if (error || !data) return null;
  return data as WorkoutSession;
}

export async function getWorkoutSessionWithLogs(
  sessionId: string
): Promise<WorkoutSessionWithLogs | null> {
  const session = await getWorkoutSession(sessionId);
  if (!session) return null;

  const supabase = await createClient();
  const { data: logs, error: logErr } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("session_id", sessionId)
    .order("order_index");

  if (logErr) throw logErr;
  const logRows = (logs ?? []) as ExerciseLog[];
  if (logRows.length === 0) {
    return { ...session, logs: [] };
  }

  const logIds = logRows.map((l) => l.id);
  const { data: setRows, error: setErr } = await supabase
    .from("sets")
    .select("*")
    .in("exercise_log_id", logIds)
    .order("set_number");

  if (setErr) throw setErr;

  const setsByLog = new Map<string, WorkoutSessionSetRow[]>();
  for (const row of setRows ?? []) {
    const r = row as Record<string, unknown>;
    const mapped: WorkoutSessionSetRow = {
      id: r.id as string,
      exercise_log_id: r.exercise_log_id as string,
      set_number: Number(r.set_number),
      reps: r.reps != null ? Number(r.reps) : null,
      weight_kg: r.weight_kg != null ? Number(r.weight_kg) : null,
      tags: parseTags(r.tags),
      remarks: (r.remarks as string) ?? null,
      rest_seconds: r.rest_seconds != null ? Number(r.rest_seconds) : null,
      created_at: r.created_at as string,
    };
    const list = setsByLog.get(mapped.exercise_log_id) ?? [];
    list.push(mapped);
    setsByLog.set(mapped.exercise_log_id, list);
  }

  const exerciseIds = [...new Set(logRows.map((l) => l.exercise_id))];
  const { data: exercises } = await supabase.from("exercises").select("*").in("id", exerciseIds);
  const exMap = new Map((exercises ?? []).map((e) => [e.id as number, e]));

  const logsWithSets: ExerciseLogWithSets[] = logRows.map((log) => ({
    ...log,
    sets: (setsByLog.get(log.id) ?? []).sort((a, b) => a.set_number - b.set_number),
    exercise: exMap.get(log.exercise_id) as ExerciseLogWithSets["exercise"],
  }));

  return { ...session, logs: logsWithSets };
}

export async function addExerciseLog(
  sessionId: string,
  exerciseId: number,
  orderIndex: number
): Promise<ExerciseLog> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercise_logs")
    .insert({ session_id: sessionId, exercise_id: exerciseId, order_index: orderIndex })
    .select()
    .single();
  if (error) throw error;
  return data as ExerciseLog;
}

export async function reorderExerciseLogs(sessionId: string, orderedLogIds: string[]): Promise<void> {
  const supabase = await createClient();
  const offset = 10000;
  for (let i = 0; i < orderedLogIds.length; i++) {
    const { error } = await supabase
      .from("exercise_logs")
      .update({ order_index: offset + i })
      .eq("id", orderedLogIds[i])
      .eq("session_id", sessionId);
    if (error) throw error;
  }
  for (let i = 0; i < orderedLogIds.length; i++) {
    const { error } = await supabase
      .from("exercise_logs")
      .update({ order_index: i })
      .eq("id", orderedLogIds[i])
      .eq("session_id", sessionId);
    if (error) throw error;
  }
}

export async function insertSessionSet(
  exerciseLogId: string,
  setNumber: number,
  reps: number,
  weightKg: number,
  opts?: { tags?: string[]; remarks?: string | null; restSeconds?: number | null }
): Promise<WorkoutSessionSetRow> {
  const supabase = await createClient();
  const tags = opts?.tags ?? [];
  const { data, error } = await supabase
    .from("sets")
    .insert({
      exercise_log_id: exerciseLogId,
      set_number: setNumber,
      reps,
      weight_kg: weightKg,
      tags,
      remarks: opts?.remarks ?? null,
      rest_seconds: opts?.restSeconds ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    exercise_log_id: r.exercise_log_id as string,
    set_number: Number(r.set_number),
    reps: r.reps != null ? Number(r.reps) : null,
    weight_kg: r.weight_kg != null ? Number(r.weight_kg) : null,
    tags: parseTags(r.tags),
    remarks: (r.remarks as string) ?? null,
    rest_seconds: r.rest_seconds != null ? Number(r.rest_seconds) : null,
    created_at: r.created_at as string,
  };
}

export async function updateSessionSet(
  setId: string,
  patch: {
    reps?: number | null;
    weight_kg?: number | null;
    tags?: string[];
    remarks?: string | null;
    rest_seconds?: number | null;
    set_number?: number;
  }
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("sets").update(patch).eq("id", setId);
  if (error) throw error;
}

export async function deleteSessionSet(setId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("sets").delete().eq("id", setId);
  if (error) throw error;
}

export async function reorderSessionSets(exerciseLogId: string, orderedSetIds: string[]): Promise<void> {
  const supabase = await createClient();
  const offset = 10000;
  for (let i = 0; i < orderedSetIds.length; i++) {
    const { error } = await supabase
      .from("sets")
      .update({ set_number: offset + i })
      .eq("id", orderedSetIds[i])
      .eq("exercise_log_id", exerciseLogId);
    if (error) throw error;
  }
  for (let i = 0; i < orderedSetIds.length; i++) {
    const { error } = await supabase
      .from("sets")
      .update({ set_number: i + 1 })
      .eq("id", orderedSetIds[i])
      .eq("exercise_log_id", exerciseLogId);
    if (error) throw error;
  }
}

export async function updateSessionName(sessionId: string, name: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_sessions").update({ name }).eq("id", sessionId);
  if (error) throw error;
}

export async function endWorkoutSession(sessionId: string): Promise<void> {
  const supabase = await createClient();
  const detail = await getWorkoutSessionWithLogs(sessionId);
  if (!detail) return;

  let volume = 0;
  for (const log of detail.logs) {
    for (const s of log.sets) {
      const w = s.weight_kg ?? 0;
      const r = s.reps ?? 0;
      volume += w * r;
    }
  }
  const start = new Date(detail.started_at).getTime();
  const durationMin = Math.max(1, Math.round((Date.now() - start) / 60000));

  const { error } = await supabase
    .from("workout_sessions")
    .update({
      ended_at: new Date().toISOString(),
      duration_minutes: durationMin,
      total_volume_kg: Math.round(volume * 100) / 100,
    })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function deleteWorkoutSession(sessionId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

export async function getUserWorkoutSessions(
  userId: string,
  completedOnly: boolean,
  limit = 100
): Promise<WorkoutSession[]> {
  const supabase = await createClient();
  let q = supabase.from("workout_sessions").select("*").eq("user_id", userId).order("started_at", { ascending: false }).limit(limit);
  if (completedOnly) {
    q = q.not("ended_at", "is", null);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WorkoutSession[];
}
