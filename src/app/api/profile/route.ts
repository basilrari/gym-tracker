import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertProfile } from "@/lib/db/profiles";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { username, display_name, units, height_cm, bodyweight_kg, rest_timer_seconds } = body;

    if (!username?.trim()) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    await upsertProfile(user.id, {
      username: username.trim(),
      display_name: display_name?.trim() || null,
      units: units === "lb" ? "lb" : "kg",
      height_cm: height_cm ?? null,
      bodyweight_kg: bodyweight_kg ?? null,
      rest_timer_seconds: rest_timer_seconds ?? 90,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save profile" },
      { status: 500 }
    );
  }
}
