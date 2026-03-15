import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTemplatesForUser } from "@/lib/db/templates";
import Link from "next/link";
import { startWorkoutFromForm, startWorkoutEmptyForm } from "@/app/actions/workouts";
import { createTemplateFormAction } from "@/app/actions/templates";
import { Button } from "@/components/ui/button";
import { ChevronRight, Play, AlertCircle, Plus } from "lucide-react";
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
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-8">
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

      <div className="flex flex-col gap-3">
        <form action={createTemplateFormAction} className="block touch-manipulation">
          <Button 
            type="submit" 
            variant="outline" 
            className="w-full rounded-full h-14 font-medium gap-2 text-base min-h-[56px] touch-manipulation active:scale-[0.98] transition-transform cursor-pointer"
          >
            <Plus className="h-5 w-5 flex-shrink-0" />
            Create new routine
          </Button>
        </form>
        <form action={startWorkoutEmptyForm} className="block touch-manipulation">
          <Button 
            type="submit" 
            variant="ghost" 
            className="w-full rounded-full h-12 text-muted-foreground hover:text-foreground text-sm min-h-[48px] touch-manipulation active:scale-[0.98] transition-transform cursor-pointer"
          >
            Start empty workout
          </Button>
        </form>
      </div>

      <div className="space-y-4">
        {templates.map((template) => (
          <div key={template.id} className="flex items-center justify-between gap-4 p-5 rounded-3xl bg-card shadow-neu-extruded group min-h-[80px]">
            <Link
              href={`/templates/${template.id}`}
              className="flex-1 flex flex-col justify-center gap-1 min-w-0 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg break-words group-hover:text-primary transition-colors leading-tight">{template.name}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider break-words mt-1">{template.description || "Custom workout"}</span>
            </Link>
            <form action={startWorkoutFromForm} className="ml-2 flex-shrink-0">
              <input type="hidden" name="templateId" value={template.id} />
              <input type="hidden" name="templateName" value={template.name} />
              <Button 
                type="submit" 
                size="icon" 
                variant="ghost" 
                className="rounded-full h-14 w-14 shadow-neu-inset bg-card group-hover:shadow-neu-extruded active:shadow-neu-pressed transition-all min-h-[56px] min-w-[56px] touch-manipulation"
                aria-label={`Start ${template.name} workout`}
              >
                <Play className="h-6 w-6 text-primary ml-0.5 group-hover:drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)]" />
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
