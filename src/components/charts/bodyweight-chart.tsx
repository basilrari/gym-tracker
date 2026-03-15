"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { BodyMeasurement } from "@/lib/db/types";

export function BodyweightChart({ data }: { data: BodyMeasurement[] }) {
  const displayData = data
    .filter((d) => d.weight_kg != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      label: d.date.slice(5),
      weight: Number(d.weight_kg),
    }));

  if (displayData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No bodyweight data yet
      </p>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayData}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v) => `${v}kg`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value} kg`, "Weight"]}
            labelFormatter={(label) => label}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
