"use client"

import React from "react"
import PerformanceLineChart, { TimeSeriesRow } from "./line-chart"

type TS = {
  upvotes: Array<{ date: string; [k: string]: number | string | null }>
  comments: Array<{ date: string; [k: string]: number | string | null }>
  subreddits: string[]
}

type Metric = "avg_upvotes" | "avg_comments" | "total_upvotes"

interface Props {
  username?: string
  username2?: string
  timeSeries?: TS
  timeSeries2?: TS
}

function summarize(base: Array<{ date: string; [k: string]: number | string | null }>, keys: string[], how: Metric): TimeSeriesRow[] {
  const out: TimeSeriesRow[] = []
  let lastAvg: number | null = null
  for (const r of base) {
    const nums: number[] = []
    for (const k of keys) {
      const v = r[k]
      if (typeof v === "number" && isFinite(v)) nums.push(v)
    }
    let val: number | null = null
    if (how === "total_upvotes") {
      val = nums.length ? nums.reduce((a, b) => a + b, 0) : null
    } else {
      const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
      val = mean
    }
    if ((how === "avg_upvotes" || how === "avg_comments") && val == null && lastAvg != null) val = lastAvg
    if (val != null) lastAvg = val
    out.push({ date: r.date, v: val })
  }
  return out
}

function yMax(data: TimeSeriesRow[]): number {
  let m = 0
  for (const r of data) {
    const v = Number(r.v ?? 0)
    if (isFinite(v)) m = Math.max(m, v)
  }
  return m || 0
}

export default function LineChartSection({ username, username2, timeSeries, timeSeries2 }: Props) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [metric, setMetric] = React.useState<Metric>("avg_upvotes")
  const [autoMax, setAutoMax] = React.useState(true)
  const [manualMax, setManualMax] = React.useState<number>(0)

  if (!timeSeries) return null

  const primaryName = `u/${username || "user1"}`
  const secondaryName = username2 ? `u/${username2}` : null

  const base1 = metric === "avg_comments" ? timeSeries.comments : timeSeries.upvotes
  const keys1 = timeSeries.subreddits || []
  const series1 = summarize(base1, keys1, metric)

  const base2 = timeSeries2 ? (metric === "avg_comments" ? timeSeries2.comments : timeSeries2.upvotes) : null
  const keys2 = timeSeries2?.subreddits || []
  const series2 = base2 ? summarize(base2, keys2, metric) : null

  const mergedDates = base1.map(r => r.date)
  const data: TimeSeriesRow[] = mergedDates.map((d, i) => {
    const a = series1[i]?.v ?? null
    const b = series2 ? (series2[i]?.v ?? null) : undefined
    const row: TimeSeriesRow = { date: d, [primaryName]: a }
    if (secondaryName) row[secondaryName] = b as any
    return row
  })

  const maxA = yMax(series1)
  const maxB = series2 ? yMax(series2) : 0
  const computedMax = Math.max(maxA, maxB)
  const finalMax = autoMax ? Math.ceil(computedMax || 0) : Math.max(0, Number(manualMax) || 0)
  const domain: [number, number] = [0, Math.max(10, finalMax)]
  const metricLabel =
    metric === "avg_upvotes" ? "Average Upvotes" :
    metric === "avg_comments" ? "Average Comments" :
    "Total Upvotes"

  return (
    <div className="rounded-lg border border-border bg-card">
      <header
        className="p-6 cursor-pointer flex justify-between items-start"
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen}
        aria-controls="linechart-content"
      >
        <div className="flex items-center gap-2 text-xl font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--sidebar-primary)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M5 14l4-4 4 4 4-6 3 4" />
          </svg>
          <h3>Performance Over Time</h3>
        </div>
        <svg className={`w-6 h-6 transition-transform duration-300 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </header>

      {isOpen && (
        <div id="linechart-content" className="px-6 pb-6">
          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Metric:</span>
                <div className="flex rounded-md bg-muted p-1">
                  <button
                    onClick={() => setMetric("avg_upvotes")}
                    className={`px-3 py-1 text-sm rounded ${metric === "avg_upvotes" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
                  >
                    Average Upvotes
                  </button>
                  <button
                    onClick={() => setMetric("avg_comments")}
                    className={`px-3 py-1 text-sm rounded ${metric === "avg_comments" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
                  >
                    Average Comments
                  </button>
                  <button
                    onClick={() => setMetric("total_upvotes")}
                    className={`px-3 py-1 text-sm rounded ${metric === "total_upvotes" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
                  >
                    Total Upvotes
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" className="accent-current" checked={autoMax} onChange={(e) => setAutoMax(e.target.checked)} />
                  Auto Max
                </label>
                {!autoMax && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Max:</span>
                    <input
                      type="number"
                      min={0}
                      value={manualMax}
                      onChange={(e) => setManualMax(Number(e.target.value))}
                      className="w-28 rounded-md border border-border bg-background px-2 py-1 text-sm"
                    />
                  </div>
                )}
              </div>
              {/*
              <div className="ml-auto flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "var(--sidebar-primary)" }} />
                  <span className="text-sm text-muted-foreground">{primaryName}</span>
                </div>
                {secondaryName && (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "rgb(20,184,166)" }} />
                    <span className="text-sm text-muted-foreground">{secondaryName}</span>
                  </div>
                )}
              </div>
              */}
            </div>
          </div>

          <div style={{ height: 400 }} className="mt-4">
            <PerformanceLineChart
              data={data}
              seriesKeys={[primaryName, ...(secondaryName ? [secondaryName] : [])]}
              metricLabel={metricLabel}
              domain={domain}
            />
          </div>
        </div>
      )}
    </div>
  )
}
