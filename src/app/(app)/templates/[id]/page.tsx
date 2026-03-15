import { notFound } from "next/navigation";
import { getTemplateWithExercises } from "@/lib/db/templates";
import { getExercises } from "@/lib/db/exercises";
import { startWorkoutAction } from "@/app/actions/workouts";
import { TemplateDetailClient } from "@/components/template-detail-client";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [template, allExercises] = await Promise.all([
    getTemplateWithExercises(id),
    getExercises(),
  ]);

  if (!template) {
    notFound();
  }

  return (
    <TemplateDetailClient
      template={template}
      allExercises={allExercises}
      startWorkoutAction={startWorkoutAction}
    />
  );
}
