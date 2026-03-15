import { createClient } from "@/lib/supabase/server";
import type { Profile } from "./types";

export async function getProfile(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function upsertProfile(
  id: string,
  data: Partial<Omit<Profile, "id" | "created_at">>
): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert(
      { id, ...data },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) throw error;
  return profile as Profile;
}

export async function getProfileByUsername(
  username: string
): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) return null;
  return data as Profile;
}
