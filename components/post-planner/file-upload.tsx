"use client"

import React, { useCallback, useMemo, useState } from "react"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"
import PostingPlanner from "@/components/post-planner/posting-planner"

type PostRow = {
  subreddit: string
  upvotes: number
  comments: number
  subscribers: number
  post_date_utc: string | number | Date
}

export type Tier = "High" | "Medium" | "Low"
export type AverageMetricKey = "mean_upvotes_all" | "mean_comments_all"

export type SubredditAnalysisData = {
  subreddit: string
  avg_upvotes_all: number
  avg_comments_all: number
  members: number
  total_post_count: number
  days_since_last_post: number
  tier?: Tier
}

const HEADER_MAPPING: Record<string, keyof PostRow> = {
  "subreddit": "subreddit",
  "upvotes": "upvotes",
  "comments": "comments",
  "last post date (utc)": "post_date_utc",
  "subreddit subscribers": "subscribers",
}

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[\s_]+/g, " ").trim()

const toDaysSinceUtc = (raw: unknown): number => {
  if (raw == null) return 999

  const daysDiffFromUTCDate = (d: Date) => {
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth()
    const day = d.getUTCDate()
    const utcPost = Date.UTC(y, m, day, 0, 0, 0)
    const now = new Date()
    const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
    const diff = utcNow - utcPost
    return diff >= 0 ? Math.floor(diff / 86400000) : 0
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = Math.round((raw - 25569) * 86400000)
    return daysDiffFromUTCDate(new Date(ms))
  }

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return daysDiffFromUTCDate(raw)
  }

  if (typeof raw === "string") {
    const s = raw.trim()
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) {
      const y = Number(m[1])
      const mo = Number(m[2]) - 1
      const d = Number(m[3])
      const utcPost = Date.UTC(y, mo, d, 0, 0, 0)
      const now = new Date()
      const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
      const diff = utcNow - utcPost
      return diff >= 0 ? Math.floor(diff / 86400000) : 0
    }
  }

  return 999
}

export default function FileUpload() {
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [data, setData] = useState<SubredditAnalysisData[] | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) {
      setErrorMessage("File type not accepted.")
      return
    }
    setErrorMessage("")
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const bytes = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(bytes, { type: "array", cellDates: true  })
        const sheetName = wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const json: any[] = XLSX.utils.sheet_to_json(ws, { raw: true, defval: "" })
        if (!json.length) throw new Error("The uploaded file is empty or invalid.")

        const mappedHeaders: Record<string, keyof PostRow> = {}
        Object.keys(json[0]).forEach(raw => {
          const norm = normalizeHeader(raw)
          if (HEADER_MAPPING[norm]) mappedHeaders[raw] = HEADER_MAPPING[norm]
        })

        const required: (keyof PostRow)[] = ["subreddit", "upvotes", "comments", "subscribers", "post_date_utc"]
        const found = new Set(Object.values(mappedHeaders))
        const missing = required.filter(k => !found.has(k))
        if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`)

        const parsed: PostRow[] = json.map(row => {
          const o: any = {}
          for (const rawKey in row) {
            const k = mappedHeaders[rawKey]
            if (!k) continue
            const v = row[rawKey]
            if (k === "upvotes" || k === "comments" || k === "subscribers") {
              o[k] = typeof v === "number" ? v : Number(v ?? 0)
            } else {
              o[k] = v
            }
          }
          return o as PostRow
        })

        const mapped: SubredditAnalysisData[] = parsed.map(r => ({
          subreddit: String(r.subreddit ?? "").trim(),
          avg_upvotes_all: Number(r.upvotes ?? 0),
          avg_comments_all: Number(r.comments ?? 0),
          members: Number(r.subscribers ?? 0),
          total_post_count: 1,
          days_since_last_post: toDaysSinceUtc(r.post_date_utc),
        }))

        const sorted = [...mapped].sort((a, b) => b.avg_upvotes_all - a.avg_upvotes_all)
        const n = sorted.length
        const hiCut = Math.floor(n * 0.3)
        const mdCut = Math.floor(n * 0.7)
        sorted.forEach((s, i) => { s.tier = i < hiCut ? "High" : i < mdCut ? "Medium" : "Low" })

        const byName = new Map(sorted.map(s => [s.subreddit.toLowerCase(), s as SubredditAnalysisData]))
        const deduped = mapped.map(m => byName.get(m.subreddit.toLowerCase())!).filter(Boolean)

        setData(deduped)
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to process file.")
        setData(null)
      }
    }
    reader.onerror = () => {
      setErrorMessage("Failed to read the file.")
      setData(null)
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    multiple: false,
  })

  const uploader = useMemo(() => (
    <div className="max-w-3xl mx-auto md:p-6">
      <div className="rounded-lg border border-border bg-card p-6 mb-6">
        <h1 className="text-xl font-semibold text-foreground mb-2">Upload Post Data</h1>
        <p className="text-sm text-muted-foreground mb-4">Upload the exported XLSX to build your posting plan.</p>
        <div
          {...getRootProps()}
          className={`mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${isDragActive ? "border-[color:var(--sidebar-primary)] bg-muted/50" : "border-border hover:border-[color:var(--sidebar-primary)]/70"}`}
        >
          <input {...getInputProps()} />
          <div className="space-y-2 text-center">
            <svg className="mx-auto h-12 w-12 text-muted-foreground/70" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-muted-foreground">
              {isDragActive ? "Drop the file here…" : "Drag & drop an .xlsx here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground/70">XLSX up to 10MB</p>
          </div>
        </div>
        {errorMessage && <p className="mt-4 text-sm text-destructive">{errorMessage}</p>}
      </div>

      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">Welcome!</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          To get started, upload an Excel (.xlsx) file containing your post data. The file must have the exact column headers:
          &nbsp;'Subreddit', 'Upvotes', 'Comments', 'Subreddit Subscribers', and 'Last Post Date (UTC)'.
        </p>
      </div>
    </div>
  ), [getRootProps, getInputProps, isDragActive, errorMessage])

  if (!data) return uploader
  return <PostingPlanner allSubredditData={data} />
}
