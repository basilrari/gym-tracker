"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, ChevronLeft, GripVertical, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TemplateWithExercises } from "@/lib/db/types";
import { updateTemplateAction } from "@/app/actions/templates";

const DAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

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
  const [scheduledDays, setScheduledDays] = useState<number[]>(
    template.scheduled_days ?? []
  );

  async function toggleDay(day: number) {
    const next = scheduledDays.includes(day)
      ? scheduledDays.filter((d) => d !== day)
      : [...scheduledDays, day].sort((a, b) => a - b);
    setScheduledDays(next);
    await updateTemplateAction(template.id, { scheduled_days: next });
  }

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-32">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/templates">
          <Button variant="ghost" size="icon" className="rounded-full shadow-neu-extruded active:shadow-neu-pressed h-12 w-12">
            <ChevronLeft className="h-6 w-6 text-primary" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight flex-1">{template.name}</h1>
      </div>

      <div className="flex justify-center py-4">
        <Button
          size="icon-lg"
          className="rounded-full h-[88px] w-[88px] shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.6)] animate-pulse-slow"
          onClick={() => startWorkoutAction(template.id, template.name)}
        >
          <Play className="h-10 w-10 ml-1" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Scheduled days
          </h2>
        </div>
        <div className="p-5 rounded-3xl bg-card shadow-neu-extruded">
          <div className="flex flex-wrap gap-2 justify-center">
            {DAY_LABELS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleDay(value)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                  scheduledDays.includes(value)
                    ? "bg-primary text-primary-foreground shadow-neu-extruded drop-shadow-[0_0_5px_rgba(255,100,0,0.5)]"
                    : "text-muted-foreground shadow-neu-inset bg-card active:scale-95"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-4">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">Exercises</h2>
        <div className="p-4 rounded-3xl bg-card shadow-neu-extruded space-y-3">
          {exercises.map((te, i) => (
            <motion.div
              key={te.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-2xl shadow-neu-inset bg-card"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg leading-tight truncate">{te.exercise.name}</p>
                <p className="text-xs font-medium text-primary mt-1 tracking-wide uppercase">
                  {te.target_sets} SETS × {te.target_reps_min ?? "?"}–{te.target_reps_max ?? "?"} REPS
                  {te.is_warmup && " (WARMUP)"}
                </p>
              </div>
            </motion.div>
          ))}
          {exercises.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No exercises added.</p>
          )}
        </div>
      </div>
    </div>
  );
}
