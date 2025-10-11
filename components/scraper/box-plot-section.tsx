"use client"

import React from "react"
import BoxPlot from "./box-plot"

type AxisDomain = [number, number] | ["auto", number] | [number, "auto"] | ["auto", "auto"]

interface Props {
  rows: any[]
  s: { [k: string]: string }
  averageMetricKey: "avg" | "median"
}

// --- your tooltip stays exactly the same ---

const Tooltip: React.FC<{ text: React.ReactNode; children: React.ReactNode }> = ({ text, children }) => {
  const [open, setOpen] = React.useState(false)
  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      <div
        className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-card border border-border text-sm p-3 rounded-md shadow-md transition-opacity duration-200 pointer-events-none"
        style={{ opacity: open ? 1 : 0 }}
      >
        {text}
      </div>
    </div>
  )
}

export default function BoxPlotSection({ rows, averageMetricKey }: Props) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [domain, setDomain] = React.useState<AxisDomain>([0, "auto"])
  const [localMax, setLocalMax] = React.useState("")

  const metricField = averageMetricKey === "median" ? "Median_Upvotes" : "Avg_Upvotes_Per_Post"

  const top25 = React.useMemo(() => {
    return [...(rows || [])]
      .filter((r) => Number.isFinite(Number(r?.[metricField])))
      .sort((a, b) => Number(b?.[metricField] ?? 0) - Number(a?.[metricField] ?? 0))
      .slice(0, 25)
  }, [rows, metricField])

  const autoMax = React.useMemo(() => {
    const vals = top25.map((r) => Number(r?.Max_Upvotes ?? 0))
    return Math.ceil((Math.max(...vals) || 10) * 1.05)
  }, [top25])

  const commit = () => {
    if (localMax === "") setDomain([domain[0], "auto"])
    else {
      const n = Number(localMax)
      if (Number.isFinite(n) && n >= 0) setDomain([domain[0], n])
    }
  }

  if (!top25.length) return null

  return (
    <div className="rounded-lg border border-border bg-card">
      <header
        className="p-6 cursor-pointer flex justify-between items-start"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls="boxplot-content"
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ color: "var(--sidebar-primary)" }}>
            <path d="M6 6v12 M18 8v8 M8 9h8v6H8Z M8 12h8" />
          </svg>

          <h3 className="text-xl font-bold">
            Upvote Predictability Box Plot ({averageMetricKey === "avg" ? "Average" : "Median"})
          </h3>
          <Tooltip
            text={
              <div className="space-y-2 text-left">
                <p>This chart visualizes the upvote consistency for the same top 25 subreddits in the bar chart. A shorter box means more predictable performance.</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li><span className="font-bold">Whiskers (lines):</span> Min and max upvotes</li>
                  <li><span className="font-bold">Box:</span> Middle 50% (IQR)</li>
                  <li><span className="font-bold">Line inside box:</span> Median upvote count</li>
                </ul>
              </div>
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Tooltip>
        </div>
        <svg className={`w-6 h-6 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </header>

      {isOpen && (
        <div id="boxplot-content" className="px-6 pb-6">
          <div className="border-t border-border pt-4">
            <div className="flex justify-end items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Max:</span>
              <input
                type="number"
                placeholder={`Auto (${autoMax.toLocaleString()})`}
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                className="w-32 bg-muted border border-border rounded text-sm py-1 pr-1 pl-2 text-foreground"
              />
            </div>
            <div style={{ height: "500px" }}>
              <BoxPlot rows={top25} domain={domain} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
