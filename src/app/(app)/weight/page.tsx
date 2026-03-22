import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listBodyWeights } from "@/lib/db/body-weights";
import { WeightClient } from "@/components/weight-client";

export default async function WeightPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const entries = await listBodyWeights(user.id, 400);
  const chronological = [...entries].reverse();

  return <WeightClient initialEntries={chronological} />;
}
