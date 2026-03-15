import { createClient } from "@/lib/supabase/server";
import type { BodyMeasurement } from "./types";

export async function getMeasurements(
  userId: string,
  from?: Date,
  to?: Date
): Promise<BodyMeasurement[]> {
  const supabase = await createClient();
  let query = supabase
    .from("body_measurements")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (from) {
    query = query.gte("date", from.toISOString().slice(0, 10));
  }
  if (to) {
    query = query.lte("date", to.toISOString().slice(0, 10));
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BodyMeasurement[];
}

export async function upsertMeasurement(
  userId: string,
  date: string,
  data: Partial<
    Pick<
      BodyMeasurement,
      | "weight_kg"
      | "waist_cm"
      | "chest_cm"
      | "arm_cm"
      | "thigh_cm"
      | "bodyfat_percent"
    >
  >
): Promise<BodyMeasurement> {
  const supabase = await createClient();
  const { data: measurement, error } = await supabase
    .from("body_measurements")
    .upsert(
      { user_id: userId, date, ...data },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();

  if (error) throw error;
  return measurement as BodyMeasurement;
}
