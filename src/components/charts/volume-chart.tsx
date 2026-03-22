"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
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

export function VolumeChart({ data }: { data: DataPoint[] }) {
  const displayData = [...data].reverse().map((d) => ({
    ...d,
    week: d.weekStart.slice(5),
  }));

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={displayData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="volArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border) / 0.35)" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={tipStyle}
            formatter={(value: number, name: string) => {
              if (name === "volume") return [`${Math.round(value)} kg`, "Volume"];
              return [value, name];
            }}
            labelFormatter={(label) => `Week ${label}`}
          />
          <Area type="monotone" dataKey="volume" stroke="none" fill="url(#volArea)" />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
