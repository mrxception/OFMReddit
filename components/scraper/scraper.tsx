"use client"

import { useEffect, useRef, useState } from "react"
import React from "react"
import s from "@/styles/scraper.module.css"

export default function Scraper() {
  const [username, setUsername] = useState("")
  const [dateRange, setDateRange] = useState("all")
  const [limit, setLimit] = useState(1000)
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
          <form onSubmit={onSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-foreground mb-2">
                  Reddit Username
                </label>
                <input
                  className={s.csvinput}
                  id="username"
                  name="username"
                  placeholder="e.g. spez"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="dateRange" className="block text-sm font-semibold text-foreground mb-2">
                  Date Range
                </label>
                <select
                  className={s.csvinput}
                  id="dateRange"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="year">Past Year</option>
                  <option value="month">Past Month</option>
                  <option value="week">Past Week</option>
                </select>
              </div>

              <div>
                <label htmlFor="limit" className="block text-sm font-semibold text-foreground mb-2">
                  Max posts (1–1000)
                </label>
                <input
                  className={s.csvinput}
                  id="limit"
                  name="limit"
                  type="number"
                  min="1"
                  max="1000"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value || 1000))}
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                <button className={`${s.btn} w-full`} type="submit" disabled={busy}>
                  {busy ? "Preparing…" : "Run Analysis"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className={s.setinput}
                  checked={inclVote}
                  onChange={(e) => setInclVote(e.target.checked)}
                />
                <span className="text-sm text-foreground">Total Upvotes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className={s.setinput}
                  checked={inclSubs}
                  onChange={(e) => setInclSubs(e.target.checked)}
                />
                <span className="text-sm text-foreground">Subreddit member count</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className={s.setinput}
                  checked={inclComm}
                  onChange={(e) => setInclComm(e.target.checked)}
                />
                <span className="text-sm text-foreground">Total Comments</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className={s.setinput}
                  checked={inclPER}
                  onChange={(e) => setInclPER(e.target.checked)}
                />
                <span className="text-sm text-foreground">Performance efficiency rating</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className={s.setinput}
                  checked={inclExtraFreq}
                  onChange={(e) => setInclExtraFreq(e.target.checked)}
                />
                <span className="text-sm text-foreground">Additional Post Frequency Data</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className={s.setinput}
                  checked={inclMed}
                  onChange={(e) => setInclMed(e.target.checked)}
                />
                <span className="text-sm text-foreground">Median average upvotes per post</span>
              </label>
            </div>

            <div className={s.bar} aria-hidden="true">
              <i id="progress" ref={progRef} />
            </div>
            <div id="status" className={`${s.hint} flex justify-center`}>
              <span>{status}</span>
            </div>
          </form>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 md:p-6">
          {hasTop10 && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg md:text-xl font-bold text-foreground">
                  Subreddit Performance {username ? ` for u/${username}` : ""}
                </h2>
                <p className={s.hint}>
                  Displaying {previewWith30.length} subreddits (scroll to view all)
                </p>
              </div>
              <div className={`${s.tableContainer} overflow-x-auto overflow-y-auto`}>
                <div
                  className={s.excel}
                  role="table"
                  aria-label="Subreddit Performance (all)"
                  style={{
                    gridTemplateColumns: `48px repeat(${cols.length}, minmax(140px, 1fr))`,
                    minWidth: "800px",
                  }}
                >
                  <div className={`${s.cell} ${s.corner}`} aria-hidden="true">
                    {" "}
                  </div>

                  {cols.map((c: { key: string; label: string }, i: number) => (
                    <div
                      key={`col-${c.key}`}
                      className={`${s.cell} ${s.colhead}`}
                      role="columnheader"
                      aria-colindex={i + 1}
                    >
                      {c.label}
                    </div>
                  ))}

                  {previewWith30.map((row: any, r: number) => (
                    <React.Fragment key={`row-${r}`}>
                      <div className={`${s.cell} ${s.rowhead}`} role="rowheader">
                        {r + 1}
                      </div>
                      <div className={s.cell} role="cell">
                        {row?.Subreddit ?? ""}
                      </div>
                      <div className={s.cell} role="cell">
                        {row?.Total_Posts ?? ""}
                      </div>
                      <div className={s.cell} role="cell">
                        {row?.Avg_Upvotes_Per_Post ?? ""}
                      </div>
                      <div className={s.cell} role="cell">
                        {row?.Avg_Comments_Per_Post != null ? Math.round(row.Avg_Comments_Per_Post) : ""}
                      </div>
                      <div className={s.cell} role="cell">
                        {row?.Posts_Per_30Days != null ? row.Posts_Per_30Days : ""}
                      </div>
                      <div className={s.cell} role="cell">
                        {row?.LastDateTimeUTC ? fmtUTC(row.LastDateTimeUTC) : ""}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div id="history" className={s.history} aria-live="polite" ref={historyRef}>
            {files.length === 0 ? (
              <div className={s.hint}>No files in this session yet.</div>
            ) : (
              files.map((f: { id: string; filename: string }) => (
                <div key={f.id} className={s.histrow}>
                  <span className={s.fname} title={f.filename}>
                    {f.filename}
                  </span>
                  <span className={s.flex1} />
                  <button type="button" className={s.mini} onClick={() => handleDownload(f.id, f.filename)}>
                    Download
                  </button>
                  <button type="button" className={`${s.mini} ${s.subtle}`} onClick={() => handleDelete(f.id)}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>

          {msg && <div className={`${s.alert} ${msg.type === "ok" ? s.ok : s.err}`}>{msg.text}</div>}

          <p className={s.hint}>
            Files are stored temporarily in memory for this page session and auto-expire after ~10 minutes or when you
            close/reload the page.
          </p>
        </div>
      </div>
    </div>
  )
}