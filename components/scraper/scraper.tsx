"use client"

import { useEffect, useRef, useState } from "react"
import React from "react"
import s from "@/styles/scraper.module.css"

import Form from "./form"
import ExcelSheetSection from "./excel-sheet-section"
import KPI from "./kpi-section"

export default function Scraper() {
  const [username, setUsername] = useState("")
  const [dateRange, setDateRange] = useState("all")
  const [limit, setLimit] = useState(100)

  const [inclSubs, setInclSubs] = useState(false)
  const [inclVote, setInclVote] = useState(false)
  const [inclComm, setInclComm] = useState(false)
  const [inclPER, setInclPER] = useState(false)
  const [inclExtraFreq, setInclExtraFreq] = useState(false)
  const [inclMed, setInclMed] = useState(false)

  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("Idle")
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [files, setFiles] = useState<Array<{ id: string; filename: string }>>([])
  const [preview, setPreview] = useState<any[]>([])
  const [spanDays, setSpanDays] = useState<number | null>(null)

  const sidRef = useRef(globalThis.crypto?.randomUUID?.() ? crypto.randomUUID() : String(Math.random()))
  const progRef = useRef<HTMLElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)

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
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
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
      await fetch(`/api/scrape?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      setFiles((arr) => arr.filter((f: { id: string; filename: string }) => f.id !== id))
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
            const r = await fetch(`/api/scrape?sid=${encodeURIComponent(sidRef.current)}&progress=1`, {
              cache: "no-store",
            })
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
          username,
          limit,
          dateRange,
          inclSubs: inclSubs ? 1 : 0,
          inclVote: inclVote ? 1 : 0,
          inclComm: inclComm ? 1 : 0,
          inclPER: inclPER ? 1 : 0,
          inclExtraFreq: inclExtraFreq ? 1 : 0,
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

  const hasTop10 = Array.isArray(preview) && preview.length > 0

  const previewWith30 = React.useMemo(() => {
    if (!Array.isArray(preview)) return []
    return preview.map((r: any) => {
      const total = Number(r?.Total_Posts ?? 0)
      const per30 = spanDays && spanDays > 0 ? Math.round((total / spanDays) * 30 * 100) / 100 : null
      return { ...r, Posts_Per_30Days: per30 }
    })
  }, [preview, spanDays])

  const cols: Array<{ key: string; label: string }> = [
    { key: "Subreddit", label: "subreddit name" },
    { key: "Total_Posts", label: "number of posts" },
    { key: "Avg_Upvotes_Per_Post", label: "av. upvotes (mean)" },
    { key: "Avg_Comments_Per_Post", label: "av. comments" },
    { key: "Posts_Per_30Days", label: "posts/30days" },
    { key: "LastDateTimeUTC", label: "last post date" },
  ]

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
            inclExtraFreq={inclExtraFreq}
            inclMed={inclMed}
            onSubmit={onSubmit}
            setUsername={setUsername}
            setDateRange={setDateRange}
            setLimit={setLimit}
            setInclVote={setInclVote}
            setInclSubs={setInclSubs}
            setInclComm={setInclComm}
            setInclPER={setInclPER}
            setInclExtraFreq={setInclExtraFreq}
            setInclMed={setInclMed}
            s={s}
          />
        </div>

        <KPI
          rows={preview}
          dateRange={dateRange}
          limit={limit}
          inclPER={inclPER}
        />

        <ExcelSheetSection
          hasTop10={hasTop10}
          username={username}
          cols={cols}
          previewWith30={previewWith30}
          fmtUTC={fmtUTC}
          files={files}
          historyRef={historyRef}
          handleDownload={handleDownload}
          handleDelete={handleDelete}
          msg={msg}
          s={s}
        />
      </div>
    </div>
  )
}
