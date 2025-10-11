"use client";

import React from "react";
import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Label,
} from "recharts";

export type TimeSeriesRow = { date: string; [series: string]: number | string | null | undefined };

interface PerformanceLineChartProps {
  data: TimeSeriesRow[];
  subreddits: string[];
  metricLabel: string;
  domain: [number, number];
}

const COLORS = [
  "#4F46E5", "#06B6D4", "#22C55E", "#F59E0B", "#EF4444",
  "#14B8A6", "#8B5CF6", "#0EA5E9", "#84CC16", "#E11D48",
  "#10B981", "#F97316", "#A855F7", "#3B82F6", "#64748B",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-md border border-border bg-card/90 p-3 shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {payload
          .slice()
          .sort((a: any, b: any) => (b?.value ?? 0) - (a?.value ?? 0))
          .map((pld: any, i: number) => (
            <li key={i} style={{ color: pld?.color ?? "inherit" }}>
              {`${pld.name}: ${Number(pld.value ?? 0).toLocaleString()}`}
            </li>
          ))}
      </ul>
    </div>
  );
};

const PerformanceLineChart: React.FC<PerformanceLineChartProps> = ({
  data,
  subreddits,
  metricLabel,
  domain,
}) => {
  const cs = getComputedStyle(document.documentElement);
  const tickColor = cs.getPropertyValue("--muted-foreground")?.trim() || "#6b7280";
  const gridStrokeColor = "rgba(127,127,127,0.15)";
  const overallAvgColor = cs.getPropertyValue("--foreground")?.trim() || "#ffffff";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RLineChart data={data} margin={{ top: 6, right: 24, left: 40, bottom: 6 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
        <XAxis dataKey="date" tick={{ fill: tickColor }} stroke={tickColor} />
        <YAxis
          tick={{ fill: tickColor }}
          stroke={tickColor}
          tickFormatter={(tick) => Number(tick).toLocaleString()}
          domain={domain}
          allowDataOverflow
        >
          <Label
            value={metricLabel}
            angle={-90}
            position="insideLeft"
            style={{ textAnchor: "middle", fill: tickColor }}
          />
        </YAxis>
        <Tooltip content={<CustomTooltip />} />
        <Legend iconSize={10} />
        {subreddits.map((sub, idx) => {
          const isOverall = sub === "Overall Average";
          const color = isOverall ? overallAvgColor : COLORS[idx % COLORS.length];
          return (
            <Line
              key={sub}
              type="monotone"
              dataKey={sub}
              name={sub}
              stroke={color}
              strokeWidth={2}
              strokeDasharray={isOverall ? "5 5" : "0"}
              // Always show dots & color them so they’re visible in dark mode
              dot={{ r: 2, stroke: color, fill: color }}
              activeDot={{ r: 4, stroke: color, fill: color }}
              connectNulls
              isAnimationActive={false}
            />
          );
        })}
      </RLineChart>
    </ResponsiveContainer>
  );
};

export default PerformanceLineChart;
