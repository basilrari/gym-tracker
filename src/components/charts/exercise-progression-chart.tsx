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
  date: string;
  weight: number;
  volume: number;
  reps: number;
};

function epley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return weight;
  return Math.round((weight * (1 + reps / 30)) * 10) / 10;
}

const tipStyle = {
  borderRadius: 12,
  background: "hsl(var(--card) / 0.95)",
  border: "1px solid hsl(var(--border) / 0.6)",
  backdropFilter: "blur(12px)",
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
    label: d.date,
    short: d.date.slice(5),
    est1rm: epley(d.weight, d.reps),
  }));

  if (displayData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">No data for {exerciseName}</p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={displayData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="exArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border) / 0.35)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(_, i) => displayData[i]?.short ?? ""}
          />
          <YAxis
            yAxisId="w"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            width={36}
          />
          <YAxis
            yAxisId="1rm"
            orientation="right"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.85)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            width={32}
          />
          <Tooltip
            contentStyle={tipStyle}
            formatter={(value: number, name: string) => {
              if (name === "weight") return [`${value} kg`, "Weight"];
              if (name === "est1rm") return [`${value} kg`, "Est. 1RM (Epley)"];
              if (name === "reps") return [value, "Reps"];
              return [value, name];
            }}
            labelFormatter={(label) => label}
          />
          <Area yAxisId="w" type="monotone" dataKey="weight" stroke="none" fill="url(#exArea)" />
          <Line
            yAxisId="w"
            type="monotone"
            dataKey="weight"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
          />
          <Line
            yAxisId="1rm"
            type="monotone"
            dataKey="est1rm"
            stroke="hsl(280 65% 55%)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-center text-muted-foreground mt-1">
        Solid: logged weight · Dashed: Epley 1RM estimate
      </p>
    </div>
  );
}
