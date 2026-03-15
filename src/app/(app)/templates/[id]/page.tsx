import { notFound } from "next/navigation";
import { getTemplateWithExercises } from "@/lib/db/templates";
import { startWorkoutAction } from "@/app/actions/workouts";
import { TemplateDetailClient } from "@/components/template-detail-client";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplateWithExercises(id);

  if (!template) {
    notFound();
  }

  return (
    <TemplateDetailClient
      template={template}
      startWorkoutAction={startWorkoutAction}
    />
  );
}
