"use client"

import { useEffect, useRef, useState } from "react"
import React from "react"
import s from "@/styles/scraper.module.css"

import Form from "./form"
import ExcelSheetSection from "./excel-sheet-section"
import ScatterPlotSection from "./scatter-plot-section"
import BarChartSection from "./bar-chart-section"
import BoxPlotSection from "./box-plot-section"
import LineChartSection from "./line-chart-section"
import KeyInsightsSection from "./key-insights-section"
import KPI from "./kpi-section"
import PdfSection from "./pdf-section"

type RawPostRow = {
  Subreddit: string
  Upvotes: number
  Comments: number
  Subreddit_Subscribers?: number
  LastDate: string | Date
}

export default function Scraper() {
  const [showSecondUsername, setShowSecondUsername] = useState(false)
  const [username2, setUsername2] = useState("")
  const [runUsername2, setRunUsername2] = useState("")

  const [username, setUsername] = useState("")
  const [runUsername, setRunUsername] = useState("")
  const [dateRange, setDateRange] = useState("all")
  const [limit, setLimit] = useState(100)
  const [runLimit, setRunLimit] = useState<number>(100)

  const [inclSubs, setInclSubs] = useState(false)
  const [inclVote, setInclVote] = useState(false)
  const [inclComm, setInclComm] = useState(false)
  const [inclPER, setInclPER] = useState(false)
  const [inclMed, setInclMed] = useState(false)

  const [runDefaults, setRunDefaults] = useState({ inclVote: false, inclComm: false, inclMed: false, inclSubs: false, inclPER: false })

  const [averageMetricKey, setAverageMetricKey] = React.useState<"avg" | "median">("avg")

  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("Idle")
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [preview2, setPreview2] = useState<any[] | null>(null)
  const [rawRows, setRawRows] = useState<any[] | null>(null)
  const [rawRows2, setRawRows2] = useState<any[] | null>(null)
  const [spanDays, setSpanDays] = useState<number | null>(null)

  const sidRef = useRef(globalThis.crypto?.randomUUID?.() ? crypto.randomUUID() : String(Math.random()))
  const progRef = useRef<HTMLElement>(null)

  const [timeSeries, setTimeSeries] = useState<{ upvotes: Array<{ date: string;[k: string]: number | string | null }>; comments: Array<{ date: string;[k: string]: number | string | null }>; subreddits: string[] } | null>(null)
  const [timeSeries2, setTimeSeries2] = useState<{ upvotes: Array<{ date: string;[k: string]: number | string | null }>; comments: Array<{ date: string;[k: string]: number | string | null }>; subreddits: string[] } | null>(null)

  const [insights, setInsights] = useState<string[]>([])

  function setProgress(frac: number) {
    if (!progRef.current) return
    const clamped = Math.max(0, Math.min(1, frac))
    progRef.current.style.width = clamped * 100 + "%"
    const bar = progRef.current.parentElement
    if (bar) {
      bar.setAttribute("role", "progressbar")
      bar.setAttribute("aria-valuemin", "0")
      bar.setAttribute("aria-valuemax", "100")
      bar.setAttribute("aria-valuenow", String(Math.round(clamped * 100)))
    }
  }

  useEffect(() => {
    const cleanup = () => {
      fetch(`/api/scrape?sid=${encodeURIComponent(sidRef.current)}`, { method: "DELETE", keepalive: true }).catch(() => { })
    }
    window.addEventListener("beforeunload", cleanup)
    return () => cleanup()
  }, [])

  async function downloadExport(kind: "data" | "raw", target: "u1" | "u2", opts: { inclVote: boolean; inclComm: boolean; inclMed: boolean; inclSubs: boolean; inclPER: boolean }) {
    try {
      const payload: any = {
        kind,
        username: target === "u2" ? runUsername2 : runUsername,
        inclSubs: opts.inclSubs ? 1 : 0,
        inclVote: opts.inclVote ? 1 : 0,
        inclComm: opts.inclComm ? 1 : 0,
        inclPER: opts.inclPER ? 1 : 0,
        inclMed: opts.inclMed ? 1 : 0,
      }
      if (kind === "data") {
        payload.rows = target === "u2" ? (preview2 || []) : preview
      } else {
        payload.rawRows = target === "u2" ? (rawRows2 || []) : (rawRows || [])
      }
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const cd = res.headers.get("content-disposition") || ""
      const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(cd)
      const fname = decodeURIComponent(m?.[1] || m?.[2] || `${payload.username}_${kind}.xlsx`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fname
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setMsg({ type: "err", text: "Failed to export file." })
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const frozen1 = (username || "").trim()
    const frozen2 = showSecondUsername ? (username2 || "").trim() : ""
    setRunUsername(frozen1)
    setRunUsername2(frozen2)
    setRunLimit(limit)
    setRunDefaults({ inclVote, inclComm, inclMed, inclSubs, inclPER: inclSubs ? inclPER : false })
    setBusy(true)
    setMsg(null)
    setStatus("Starting…")
    setProgress(0)
    setPreview([])
    setPreview2(null)
    setRawRows(null)
    setRawRows2(null)
    setSpanDays(null)

    let stopPoll = false
      ; (async function poll() {
        while (!stopPoll) {
          try {
            const r = await fetch(`/api/scrape?sid=${encodeURIComponent(sidRef.current)}&progress=1`, { cache: "no-store" })
            if (r.ok) {
              const p = await r.json()
              const total = p.total || limit || 1
              const fetched = p.fetched || 0
              const frac = Math.max(0, Math.min(1, total ? fetched / total : 0))
              setProgress(frac)
              setStatus(`${p.phase || "Working…"} ${fetched}/${total}`)
              if (p.done && frac < 1) setProgress(1)
            }
          } catch { }
          await new Promise((r) => setTimeout(r, 400))
        }
      })()

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: frozen1,
          username2: frozen2 || undefined,
          limit,
          dateRange,
          inclSubs: inclSubs ? 1 : 0,
          inclVote: inclVote ? 1 : 0,
          inclComm: inclComm ? 1 : 0,
          inclPER: inclPER ? 1 : 0,
          inclMed: inclMed ? 1 : 0,
          sid: sidRef.current,
        }),
      })

      if (!res.ok) {
        let reason = res.statusText
        try {
          const j = await res.json()
          reason = j?.error || reason
        } catch { }
        throw new Error(reason || `HTTP ${res.status}`)
      }

      const payload = await res.json()
      setPreview(Array.isArray(payload.preview) ? payload.preview : [])
      setPreview2(Array.isArray(payload.preview2) ? payload.preview2 : null)
      setRawRows(Array.isArray(payload.rawRows) ? payload.rawRows : null)
      setRawRows2(Array.isArray(payload.rawRows2) ? payload.rawRows2 : null)
      setTimeSeries(payload.timeSeries ?? null)
      setTimeSeries2(payload.timeSeries2 ?? null)
      setSpanDays(typeof payload.datasetSpanDays === "number" && isFinite(payload.datasetSpanDays) ? payload.datasetSpanDays : null)

      setProgress(1)
      setStatus("Ready.")
    } catch (err: any) {
      setProgress(0)
      setStatus("Failed.")
      setMsg({ type: "err", text: `Failed: ${err.message.includes("User not found") ? "Reddit username not found." : err.message || "Unknown error"}` })
    } finally {
      stopPoll = true
      setBusy(false)
    }
  }

  const hasRows = Array.isArray(preview) && preview.length > 0

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-lg border border-border bg-card p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Subreddit Performance Analysis (SPA)</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-6">Enter the Reddit username you want to analyze for a quantitative performance comparison across subreddits.</p>
          <Form
            progRef={progRef}
            status={status}
            busy={busy}
            username={username}
            dateRange={dateRange}
            limit={limit}
            inclVote={inclVote}
            inclSubs={inclSubs}
            inclComm={inclComm}
            inclPER={inclPER}
            inclMed={inclMed}
            onSubmit={onSubmit}
            setUsername={setUsername}
            setDateRange={setDateRange}
            setLimit={setLimit}
            setInclVote={setInclVote}
            setInclSubs={setInclSubs}
            setInclComm={setInclComm}
            setInclPER={setInclPER}
            setInclMed={setInclMed}
            showSecondUsername={showSecondUsername}
            setShowSecondUsername={setShowSecondUsername}
            username2={username2}
            setUsername2={setUsername2}
            s={s}
          />
        </div>

        <KPI rows={preview} rows2={preview2 ?? undefined} dateRange={dateRange} limit={runLimit} inclPER={runDefaults.inclPER} username={runUsername} username2={runUsername2} />

        <ExcelSheetSection
          hasTop10={hasRows}
          username={runUsername}
          username2={runUsername2}
          rows={preview}
          rows2={preview2 ?? undefined}
          fmtUTC={(iso) => {
            if (!iso) return ""
            const d = new Date(iso)
            const dd = String(d.getUTCDate()).padStart(2, "0")
            const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
            const yy = String(d.getUTCFullYear()).slice(-2)
            const hh = String(d.getUTCHours()).padStart(2, "0")
            const min = String(d.getUTCMinutes()).padStart(2, "0")
            return `${dd}/${mm}/${yy} ${hh}:${min}`
          }}
          s={s}
          defaults={runDefaults}
          subsAvailable={runDefaults.inclSubs}
          onExport={(kind, target, opts) => downloadExport(kind, target, opts)}
        />

        <ScatterPlotSection rows={preview} rows2={preview2 ?? undefined} username={runUsername} username2={runUsername2} s={s} />

        <BarChartSection rows={preview} rows2={preview2 ?? undefined} username={runUsername} username2={runUsername2} s={s} averageMetricKey={averageMetricKey} onMetricChange={setAverageMetricKey} />

        <BoxPlotSection rows={preview} rows2={preview2 ?? undefined} username={runUsername} username2={runUsername2} s={s} averageMetricKey={averageMetricKey} />

        <LineChartSection username={runUsername} username2={runUsername2} timeSeries={timeSeries ?? undefined} timeSeries2={timeSeries2 ?? undefined} />

        <KeyInsightsSection rows={preview} onInsights={setInsights}/>

        <PdfSection
          username={runUsername}
          username2={runUsername2}
          dateRange={dateRange}
          rows={preview}
          rows2={preview2 ?? []}
          excelFlags={runDefaults}
          timeSeries={timeSeries ?? undefined}
          timeSeries2={timeSeries2 ?? undefined}
          lineMetric="avg_upvotes"
          lineGranularity="day"
          insights={insights}
          selectors={{
            kpi: "#kpi-section",
            table: "#excel-table",
            scatter: "#scatter-mean-vs-posts",
            bar: "#bar-top25-upvotes",
            line: "#line-performance-over-time",
            insights: "#key-insights-section",
          }}
        />
      </div>
    </div>
  )
}
