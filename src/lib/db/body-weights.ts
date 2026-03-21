import { createClient } from "@/lib/supabase/server";
import type { BodyWeightEntry } from "./types";

export async function listBodyWeights(userId: string, limit = 365): Promise<BodyWeightEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_weights")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as BodyWeightEntry[];
}

export async function upsertBodyWeight(
  userId: string,
  date: string,
  weightKg: number,
  notes?: string | null
): Promise<BodyWeightEntry> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_weights")
    .upsert(
      { user_id: userId, date, weight_kg: weightKg, notes: notes ?? null },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as BodyWeightEntry;
}

export async function deleteBodyWeight(id: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("body_weights").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
