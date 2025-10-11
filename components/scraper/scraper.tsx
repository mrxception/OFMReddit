"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import React from "react"
import s from "@/styles/scraper.module.css"

import Form from "./form"
import ExcelSheetSection from "./excel-sheet-section"
import ScatterPlotSection from "./scatter-plot-section"
import BarChartSection from "./bar-chart-section"
import BoxPlotSection from "./box-plot-section"
import LineChartSection from "./line-chart-section";
import KeyInsightsSection from "./key-insights-section"
import KPI from "./kpi-section"

export default function Scraper() {
  const [showSecondUsername, setShowSecondUsername] = useState(false)
  const [username2, setUsername2] = useState("")

  const [username, setUsername] = useState("")
  const [runUsername, setRunUsername] = useState("")
  const [dateRange, setDateRange] = useState("all")
  const [limit, setLimit] = useState(100)

  const [inclSubs, setInclSubs] = useState(false)
  const [inclVote, setInclVote] = useState(false)
  const [inclComm, setInclComm] = useState(false)
  const [inclPER, setInclPER] = useState(false)
  const [inclMed, setInclMed] = useState(false)

  const [averageMetricKey, setAverageMetricKey] = React.useState<"avg" | "median">("avg")

  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("Idle")
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [files, setFiles] = useState<Array<{ id: string; filename: string }>>([])
  const [preview, setPreview] = useState<any[]>([])
  const [spanDays, setSpanDays] = useState<number | null>(null)

  const sidRef = useRef(globalThis.crypto?.randomUUID?.() ? crypto.randomUUID() : String(Math.random()))
  const progRef = useRef<HTMLElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)

  const [timeSeries, setTimeSeries] = useState<{
    upvotes: Array<{ date: string;[k: string]: number | string | null }>;
    comments: Array<{ date: string;[k: string]: number | string | null }>;
    subreddits: string[];
  } | null>(null);

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
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight
  }, [files.length])

  useEffect(() => {
    const cleanup = () => {
      fetch(`/api/scrape?sid=${encodeURIComponent(sidRef.current)}`, {
        method: "DELETE",
        keepalive: true,
      }).catch(() => { })
    }
    window.addEventListener("beforeunload", cleanup)
    return () => cleanup()
  }, [])

  async function handleDownload(id: string, filename: string) {
    try {
      const a = document.createElement("a")
      a.href = `/api/scrape?id=${encodeURIComponent(id)}`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      setMsg({ type: "err", text: "Failed to download file." })
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/scrape?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      setFiles((arr) => arr.filter((f) => f.id !== id))
    } catch {
      setMsg({ type: "err", text: "Failed to delete file." })
    }
  }

  function fmtUTC(iso: string) {
    if (!iso) return ""
    const d = new Date(iso)
    const dd = String(d.getUTCDate()).padStart(2, "0")
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
    const yy = String(d.getUTCFullYear()).slice(-2)
    const hh = String(d.getUTCHours()).padStart(2, "0")
    const min = String(d.getUTCMinutes()).padStart(2, "0")
    return `${dd}/${mm}/${yy} ${hh}:${min}`
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const frozen = (username || "").trim()
    setRunUsername(frozen)
    setBusy(true)
    setMsg(null)
    setStatus("Starting…")
    setProgress(0)
    setPreview([])
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
          username: frozen,
          limit,
          dateRange,
          inclSubs: inclSubs ? 1 : 0,
          inclVote: inclVote ? 1 : 0,
          inclComm: inclComm ? 1 : 0,
          inclPER: inclPER ? 1 : 0,
          inclMed: inclMed ? 1 : 0,
          format: "xlsx",
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
      setPreview(Array.isArray(payload.preview) ? payload.preview : []);
      setTimeSeries(payload.timeSeries ?? null);

      setSpanDays(
        typeof payload.datasetSpanDays === "number" && isFinite(payload.datasetSpanDays)
          ? payload.datasetSpanDays
          : null,
      )

      setPreview(Array.isArray(payload.preview) ? payload.preview : [])

      const staged = Array.isArray(payload.files) ? payload.files : payload.id ? [payload] : []
      setFiles((arr) => [...arr, ...staged])

      setProgress(1)
      setStatus("Ready.")
      setMsg({
        type: "ok",
        text:
          staged.length === 0
            ? "No files were staged."
            : `File${staged.length > 1 ? "s" : ""}: ${staged.map((f: { id: string; filename: string }) => f.filename).join(", ")}`,
      })
    } catch (err: any) {
      setProgress(0)
      setStatus("Failed.")
      setMsg({
        type: "err",
        text: `Failed: ${err.message.includes("User not found") ? "Reddit username not found." : err.message || "Unknown error"}`,
      })
    } finally {
      stopPoll = true
      setBusy(false)
    }
  }

  const cols = useMemo(() => {
    const list: Array<{ key: string; label: string }> = [
      { key: "Subreddit", label: "subreddit name" },
      { key: "Total_Posts", label: "number of posts" },
      { key: "Avg_Upvotes_Per_Post", label: "av. upvotes (mean)" },
      { key: "Avg_Comments_Per_Post", label: "av. comments" },
      { key: "Post_Frequency", label: "post frequency" },
    ]
    if (inclMed) list.splice(5, 0, { key: "Median_Upvotes", label: "median upvotes" })
    if (inclVote) list.push({ key: "Total_Upvotes", label: "total upvotes" })
    if (inclComm) list.push({ key: "Total_Comments", label: "total comments" })
    if (inclSubs) list.push({ key: "Subreddit_Subscribers", label: "subreddit member count" })
    if (inclPER) {
      list.push({ key: "WPI_Score", label: "wpi score" })
      list.push({ key: "WPI_Rating", label: "wpi rating" })
    }
    list.push({ key: "LastDateTimeUTC", label: "last post date" })
    return list
  }, [inclMed, inclVote, inclComm, inclSubs, inclPER])

  const hasRows = Array.isArray(preview) && preview.length > 0

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-lg border border-border bg-card p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Subreddit Performance Report</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-6">
            Enter the Reddit username you want to analyze for a quantitative performance comparison across subreddits.
          </p>

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

        <KPI rows={preview} dateRange={dateRange} limit={limit} inclPER={inclPER} />

        <ExcelSheetSection
          hasTop10={hasRows}
          username={runUsername}
          cols={cols}
          rows={preview}
          fmtUTC={fmtUTC}
          files={files}
          historyRef={historyRef}
          handleDownload={handleDownload}
          handleDelete={handleDelete}
          msg={msg}
          s={s}
        />

        <ScatterPlotSection rows={preview} username={runUsername} s={s} />

        <BarChartSection
          rows={preview}
          s={s}
          averageMetricKey={averageMetricKey}
          onMetricChange={setAverageMetricKey}
        />

        <BoxPlotSection
          rows={preview}
          s={s}
          averageMetricKey={averageMetricKey}
        />

        <LineChartSection
          rows={preview}
          username={runUsername}
          s={s}
          timeSeries={timeSeries ?? undefined}
        />

        <KeyInsightsSection rows={preview} />
      </div>
    </div>
  )
}
