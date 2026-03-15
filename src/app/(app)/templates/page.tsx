import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTemplatesForUser } from "@/lib/db/templates";
import Link from "next/link";
import { startWorkoutAction } from "@/app/actions/workouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Play } from "lucide-react";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const templates = await getTemplatesForUser(user.id);

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold">Templates</h1>

      <div className="space-y-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <Link
                href={`/templates/${template.id}`}
                className="flex-1 flex items-center gap-2"
              >
                <span className="font-medium">{template.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <form action={() => startWorkoutAction(template.id, template.name)}>
                <Button type="submit" size="icon" variant="ghost">
                  <Play className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No templates yet
          </p>
        )}
      </div>
    </div>
  );
}
