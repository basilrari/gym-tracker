"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type DataPoint = {
  weekStart: string;
  volume: number;
  workouts: number;
  sets: number;
};

export function WorkoutsChart({ data }: { data: DataPoint[] }) {
  const displayData = [...data].reverse().map((d) => ({
    ...d,
    week: d.weekStart.slice(5),
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData}>
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [value, "Workouts"]}
            labelFormatter={(label) => `Week ${label}`}
          />
          <Bar
            dataKey="workouts"
            fill="hsl(var(--accent))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
