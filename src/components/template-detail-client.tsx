"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, ChevronLeft, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TemplateWithExercises } from "@/lib/db/types";

type TemplateDetailClientProps = {
  template: TemplateWithExercises;
  startWorkoutAction: (
    templateId?: string | null,
    name?: string
  ) => Promise<void>;
};

export function TemplateDetailClient({
  template,
  startWorkoutAction,
}: TemplateDetailClientProps) {
  const [exercises, setExercises] = useState(template.exercises);

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/templates">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold flex-1">{template.name}</h1>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={() => startWorkoutAction(template.id, template.name)}
      >
        <Play className="h-5 w-5 mr-2" />
        Start Workout
      </Button>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Exercises</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {exercises.map((te, i) => (
              <motion.div
                key={te.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{te.exercise.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {te.target_sets} set(s) × {te.target_reps_min ?? "?"}–
                    {te.target_reps_max ?? "?"} reps
                    {te.is_warmup && " (warmup)"}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
