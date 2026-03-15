"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type DataPoint = {
  date: string;
  weight: number;
  volume: number;
  reps: number;
};

export function ExerciseProgressionChart({
  data,
  exerciseName,
}: {
  data: DataPoint[];
  exerciseName: string;
}) {
  const displayData = data.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  if (displayData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No data for {exerciseName}
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
