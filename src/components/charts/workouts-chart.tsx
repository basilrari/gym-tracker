"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

type DataPoint = {
  weekStart: string;
  volume: number;
  workouts: number;
  sets: number;
};

const tipStyle = {
  borderRadius: 12,
  background: "hsl(var(--card) / 0.95)",
  border: "1px solid hsl(var(--border) / 0.6)",
  backdropFilter: "blur(12px)",
};

export function WorkoutsChart({ data }: { data: DataPoint[] }) {
  const displayData = [...data].reverse().map((d) => ({
    ...d,
    week: d.weekStart.slice(5),
  }));
  const maxW = Math.max(1, ...displayData.map((d) => d.workouts));

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border) / 0.35)" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tipStyle}
            formatter={(value: number) => [value, "Workouts"]}
            labelFormatter={(label) => `Week ${label}`}
          />
          <Bar dataKey="workouts" radius={[6, 6, 2, 2]}>
            {displayData.map((entry, i) => (
              <Cell
                key={i}
                fill="url(#barGrad)"
                opacity={0.4 + (0.55 * entry.workouts) / maxW}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
