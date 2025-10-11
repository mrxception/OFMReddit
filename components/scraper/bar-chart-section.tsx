"use client"

import React from "react"
import BarChartView from "./bar-chart"

type MetricKey =
  | "Avg_Upvotes_Per_Post"
  | "Median_Upvotes"
  | "Total_Upvotes"
  | "Total_Comments"
  | "WPI_Score"

interface Props {
  rows: any[]
  s: { [k: string]: string }
  averageMetricKey: "avg" | "median"
  onMetricChange: (key: "avg" | "median") => void
  title?: string
}

export default function BarChartSection({
  rows,
  s,
  averageMetricKey,
  onMetricChange,
  title = "Top 25 Subreddits by Upvotes",
}: Props) {
  const [open, setOpen] = React.useState(true)

  const metric: MetricKey =
    averageMetricKey === "median" ? "Median_Upvotes" : "Avg_Upvotes_Per_Post"

  const label = metric === "Median_Upvotes" ? "Median Upvotes" : "Average Upvotes (Mean)"

  const sortedTop = React.useMemo(() => {
    const arr = Array.isArray(rows) ? rows : []
    return [...arr]
      .filter((r) => Number.isFinite(Number(r?.[metric])))
      .sort((a, b) => Number(b?.[metric] ?? 0) - Number(a?.[metric] ?? 0))
      .slice(0, 25)
  }, [rows, metric])

  const autoMax = React.useMemo(() => {
    const vals = sortedTop.map((r) => Number(r?.[metric] ?? 0))
    const m = vals.length ? Math.max(...vals) : 0
    return Math.ceil(m * 1.05) || 10
  }, [sortedTop, metric])

  const [domain, setDomain] = React.useState<[number, number]>([0, autoMax])
  React.useEffect(() => {
    setDomain(([min]) => [min, autoMax])
  }, [autoMax])

  const [maxInput, setMaxInput] = React.useState<string>("")
  React.useEffect(() => {
    setMaxInput("")
  }, [metric])

  const applyMax = (v: string) => {
    if (v === "") {
      setDomain(([min]) => [min, autoMax])
      return
    }
    const n = Number(v)
    if (!Number.isFinite(n) || n <= 0) return
    setDomain(([min]) => [min, n])
  }

  const onMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => setMaxInput(e.target.value)
  const onMaxBlur = () => applyMax(maxInput)
  const onMaxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur()
  }

  if (!rows || rows.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card">
      <header
        className="p-6 cursor-pointer flex justify-between items-start"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="barchart-content"
      >
        <div className="flex items-center gap-2 text-xl font-bold">
          <svg xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none" stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ color: "var(--sidebar-primary)" }}>
            <path d="M3 21h18 M7 18v-8h3v8H7Z M12.5 18V6h3v12h-3Z M18 18v-5h3v5h-3Z" />
          </svg>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <svg
          className={`w-6 h-6 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </header>

      {open && (
        <div id="barchart-content" className="px-6 pb-6">
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-4 flex-wrap justify-end mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Average Type:</span>
                <div className="flex rounded bg-muted p-1">
                  <button
                    onClick={() => onMetricChange("avg")}
                    className={`px-3 py-1 text-sm rounded ${averageMetricKey === "avg"
                      ? "bg-card text-foreground font-semibold shadow"
                      : "text-muted-foreground"
                      }`}
                  >
                    Mean Average
                  </button>
                  <button
                    onClick={() => onMetricChange("median")}
                    className={`px-3 py-1 text-sm rounded ${averageMetricKey === "median"
                      ? "bg-card text-foreground font-semibold shadow"
                      : "text-muted-foreground"
                      }`}
                  >
                    Median Average
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Upvotes Max:</span>
                <input
                  type="number"
                  placeholder={`Auto (${autoMax.toLocaleString()})`}
                  value={maxInput}
                  onChange={onMaxChange}
                  onBlur={onMaxBlur}
                  onKeyDown={onMaxKeyDown}
                  className="w-36 bg-muted border border-border rounded text-sm py-1 pr-1 pl-2 text-foreground"
                />
              </div>
            </div>

            <div style={{ height: "450px" }}>
              <BarChartView data={sortedTop} domain={domain} metric={metric} label={label} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
