"use server";

import { createClient } from "@/lib/supabase/server";
import { upsertBodyWeight, deleteBodyWeight } from "@/lib/db/body-weights";

export async function saveBodyWeightAction(date: string, weightKg: number, notes?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return upsertBodyWeight(user.id, date, weightKg, notes);
}

export async function deleteBodyWeightAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await deleteBodyWeight(id, user.id);
}
