import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getExerciseProgression } from "@/lib/db/analytics";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const exerciseId = searchParams.get("exerciseId");
  const range = (searchParams.get("range") as "7d" | "30d" | "all") ?? "30d";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !exerciseId) {
    return NextResponse.json(
      { error: "Missing user or exerciseId" },
      { status: 400 }
    );
  }

  const data = await getExerciseProgression(
    user.id,
    parseInt(exerciseId, 10),
    range
  );
  return NextResponse.json(data);
}
