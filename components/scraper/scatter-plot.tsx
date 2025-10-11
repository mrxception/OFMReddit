// components/scraper/scatter-plot.tsx
"use client"

import React, { useMemo } from "react"
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis, Label, Legend } from "recharts"

type AxisKey =
  | "Total_Posts"
  | "Avg_Upvotes_Per_Post"
  | "Median_Upvotes"
  | "Avg_Comments_Per_Post"
  | "Total_Upvotes"
  | "Total_Comments"
  | "WPI_Score"
  | "Subreddit_Subscribers"

type AxisDomain = [number, number] | ["auto", number] | [number, "auto"] | ["auto", "auto"]

interface Props {
  datasets: { label?: string; data: any[] }[]
  xAxis: AxisKey
  yAxis: AxisKey
  xDomain: AxisDomain
  yDomain: AxisDomain
  xAxisLabel: string
  yAxisLabel: string
  height?: number
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0]?.payload || {}
    const showMembers = Number(d.members ?? d.Subscriber_Members ?? 0) > 0
    return (
      <div className="bg-white/80 dark:bg-gray-900/80 p-3 rounded-md border border-border shadow-lg">
        <p className="font-bold" style={{ color: payload[0]?.fill }}>{d.subreddit}</p>
        {payload[0] && <p className="text-sm">{`${payload[0].name}: ${Number(payload[0].value).toLocaleString()}`}</p>}
        {payload[1] && <p className="text-sm">{`${payload[1].name}: ${Number(payload[1].value).toLocaleString()}`}</p>}
        {showMembers && <p className="text-sm">{`Subscribers: ${Number(d.members ?? 0).toLocaleString()}`}</p>}
      </div>
    )
  }
  return null
}

export default function ScatterPlot({
  datasets,
  xAxis,
  yAxis,
  xDomain,
  yDomain,
  xAxisLabel,
  yAxisLabel,
  height = 500,
}: Props) {
  const all = useMemo(() => datasets.flatMap((d) => d.data || []), [datasets])
  const hasMembers = useMemo(() => all.some((p) => Number(p?.members ?? p?.Subreddit_Subscribers ?? 0) > 0), [all])

  const toFinalDomain = (dom: AxisDomain, key: AxisKey): [number, number] => {
    const values = all.length ? all.map((p) => Number(p[key] ?? 0)) : [0]
    const min = dom[0] === "auto" ? 0 : Number(dom[0])
    const max = dom[1] === "auto" ? Math.ceil((Math.max(...values) || 10) * 1.05) : Number(dom[1])
    return [min, max]
  }

  const finalX = toFinalDomain(xDomain, xAxis)
  const finalY = toFinalDomain(yDomain, yAxis)

  const filtered = useMemo(
    () =>
      datasets.map((ds) => ({
        ...ds,
        data: (ds.data || []).filter((p) => {
          const xv = Number(p?.[xAxis] ?? 0)
          const yv = Number(p?.[yAxis] ?? 0)
          return xv >= finalX[0] && xv <= finalX[1] && yv >= finalY[0] && yv <= finalY[1]
        }),
      })),
    [datasets, xAxis, yAxis, finalX, finalY]
  )

  const tickColor = "var(--muted-foreground)"
  const gridStroke = "color-mix(in oklch, var(--muted-foreground) 15%, transparent)"

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke as any} />
        <XAxis
          type="number"
          dataKey={xAxis}
          name={xAxisLabel}
          tick={{ fill: tickColor }}
          stroke={tickColor}
          domain={finalX}
          allowDataOverflow={false}
          tickCount={8}
          tickFormatter={(t) => Number(t).toLocaleString()}
        >
          <Label value={xAxisLabel} offset={-30} position="insideBottom" fill={tickColor} style={{ textAnchor: "middle" }} />
        </XAxis>
        <YAxis
          type="number"
          dataKey={yAxis}
          name={yAxisLabel}
          tick={{ fill: tickColor }}
          stroke={tickColor}
          domain={finalY}
          allowDataOverflow={false}
          width={80}
          tickCount={8}
          tickFormatter={(t) => Number(t).toLocaleString()}
        >
          <Label value={yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: "middle", fill: tickColor }} />
        </YAxis>
        {hasMembers && <ZAxis dataKey="members" range={[50, 800]} name="Subscribers" />}
        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<CustomTooltip />} />
        {datasets.length > 1 && <Legend verticalAlign="top" height={36} iconSize={10} />}
        {filtered.map((ds, i) => (
          <Scatter key={i} data={ds.data} fill="var(--sidebar-primary)" fillOpacity={0.75} />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  )
}
