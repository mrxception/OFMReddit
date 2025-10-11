"use client"

import React, { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from "recharts"

type AxisDomain = [number, number] | ["auto", number] | [number, "auto"] | ["auto", "auto"]

interface Props {
  rows: any[]
  domain: AxisDomain
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload
    return (
      <div className="bg-card/90 backdrop-blur p-3 rounded-md border border-border shadow-lg">
        <p className="font-bold text-[color:var(--sidebar-primary)]">{d.subreddit}</p>
        <ul className="text-sm space-y-1 mt-1">
          <li><span className="font-semibold">Max:</span> {d.max.toLocaleString()}</li>
          <li><span className="font-semibold">Q3:</span> {d.q3.toLocaleString()}</li>
          <li className="font-bold"><span className="font-semibold">Median:</span> {d.median.toLocaleString()}</li>
          <li><span className="font-semibold">Q1:</span> {d.q1.toLocaleString()}</li>
          <li><span className="font-semibold">Min:</span> {d.min.toLocaleString()}</li>
        </ul>
      </div>
    )
  }
  return null
}

const CustomBoxPlotShape = (props: any) => {
  const { x, y, width, height, payload } = props
  if (payload.max === 0 || payload.min === payload.max) return null

  const accent = "var(--sidebar-primary)"
  const whisker = "rgba(160,174,192,0.8)"

  const scale = width / payload.max

  const minX = x + payload.min * scale
  const q1X = x + payload.q1 * scale
  const medianX = x + payload.median * scale
  const q3X = x + payload.q3 * scale
  const maxX = x + width

  const boxY = y + height * 0.25
  const boxHeight = height * 0.5
  const whiskerY = y + height * 0.5

  return (
    <g>
      <line x1={minX} y1={whiskerY} x2={q1X} y2={whiskerY} stroke={whisker} />
      <line x1={q3X} y1={whiskerY} x2={maxX} y2={whiskerY} stroke={whisker} />
      <rect x={q1X} y={boxY} width={Math.max(0, q3X - q1X)} height={boxHeight} fill={accent} fillOpacity={0.65} stroke={accent} />
      <line x1={minX} y1={boxY} x2={minX} y2={boxY + boxHeight} stroke={whisker} />
      <line x1={maxX} y1={boxY} x2={maxX} y2={boxY + boxHeight} stroke={whisker} />
      <line x1={medianX} y1={boxY} x2={medianX} y2={boxY + boxHeight} stroke="oklch(0.8 0.12 60)" strokeWidth={2} />
    </g>
  )
}

export default function BoxPlot({ rows, domain }: Props) {
  const data = useMemo(() => {
    const arr = Array.isArray(rows) ? rows : []
    const mapped = arr.map((r: any) => ({
      subreddit: r?.Subreddit ?? "",
      min: Number(r?.Min_Upvotes ?? 0),
      q1: Number(r?.Q1_Upvotes ?? 0),
      median: Number(r?.Median_Upvotes ?? r?.Median_Upvotes_Per_Post ?? 0),
      q3: Number(r?.Q3_Upvotes ?? 0),
      max: Number(r?.Max_Upvotes ?? 0),
    }))
    return mapped.reverse()
  }, [rows])

  const tickColor = "var(--muted-foreground)"
  const gridStroke = "color-mix(in oklch, var(--muted-foreground) 15%, transparent)"

  const finalDomain: [number, number] = useMemo(() => {
    const values = data.length ? data.map((d) => d.max) : [0]
    const lo = typeof domain[0] === "number" ? domain[0] : 0
    const hi = typeof domain[1] === "number" ? domain[1] : Math.ceil((Math.max(...values) || 10) * 1.05)
    return [lo, hi]
  }, [data, domain])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 24, right: 40, left: 80, bottom: 32 }}
        barCategoryGap="35%"
        barGap={6}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis
          type="number"
          tick={{ fill: tickColor }}
          stroke={tickColor}
          domain={finalDomain}
          allowDataOverflow
          tickFormatter={(t) => t.toLocaleString()}
        >
          <Label value="Upvotes Distribution" offset={-15} position="insideBottom" fill={tickColor} />
        </XAxis>
        <YAxis
          dataKey="subreddit"
          type="category"
          tick={{ fill: tickColor }}
          stroke={tickColor}
          width={180}
          interval={0}
        />
        <Tooltip cursor={{ fill: "rgba(125,125,125,0.05)" }} content={<CustomTooltip />} />
        <Bar dataKey="max" fill="transparent" isAnimationActive={false} shape={<CustomBoxPlotShape />} />
      </BarChart>
    </ResponsiveContainer>
  )
}
