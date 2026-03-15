import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTemplatesForUser } from "@/lib/db/templates";
import Link from "next/link";
import { startWorkoutFromForm } from "@/app/actions/workouts";
import { Button } from "@/components/ui/button";
import { ChevronRight, Play, AlertCircle } from "lucide-react";
import type { WorkoutTemplate } from "@/lib/db/types";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let templates: WorkoutTemplate[] = [];
  let loadError = false;
  try {
    templates = await getTemplatesForUser(user.id);
  } catch {
    loadError = true;
  }

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-32">
      <div className="text-center space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Routines</h1>
        <p className="text-muted-foreground text-xs uppercase tracking-wider">Your workout templates</p>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>Couldn’t load routines. Check your connection and try again.</span>
        </div>
      )}

      <div className="space-y-4">
        {templates.map((template) => (
          <div key={template.id} className="flex items-center justify-between p-4 rounded-3xl bg-card shadow-neu-extruded group">
            <Link
              href={`/templates/${template.id}`}
              className="flex-1 flex flex-col justify-center gap-1 min-w-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg truncate group-hover:text-primary transition-colors">{template.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{template.description || "Custom workout"}</span>
            </Link>
            <form action={startWorkoutFromForm} className="ml-4">
              <input type="hidden" name="templateId" value={template.id} />
              <input type="hidden" name="templateName" value={template.name} />
              <Button type="submit" size="icon" variant="ghost" className="rounded-full h-12 w-12 shadow-neu-inset bg-card group-hover:shadow-neu-extruded active:shadow-neu-pressed transition-all">
                <Play className="h-5 w-5 text-primary ml-0.5 group-hover:drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)]" />
              </Button>
            </form>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="p-8 rounded-3xl shadow-neu-inset text-center text-sm font-medium text-muted-foreground">
            No routines yet. Create one or start an empty workout.
          </div>
        )}
      </div>
    </div>
  );
}
