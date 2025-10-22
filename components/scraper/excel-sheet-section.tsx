"use client"

import React from "react"
import { Checkbox } from '@/components/ui/checkbox'

interface ExcelSheetSectionProps {
  hasTop10: boolean
  username: string
  username2?: string
  rows: any[]
  rows2?: any[]
  fmtUTC: (iso: string) => string
  s: { [key: string]: string }
  defaults: { inclVote: boolean; inclComm: boolean; inclMed: boolean; inclSubs: boolean; inclPER: boolean }
  subsAvailable: boolean
  onExport: (kind: "data" | "raw", target: "u1" | "u2", opts: { inclVote: boolean; inclComm: boolean; inclMed: boolean; inclSubs: boolean; inclPER: boolean }) => void
}

function measureTextPx(text: string, font: string) {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!
  ctx.font = font
  return Math.ceil(ctx.measureText(text || "").width)
}

function parsePostFrequency(val: string) {
  if (!val) return 0
  const dayMatch = val.match(/([\d.]+)\s*posts?\s*per\s*day/i)
  if (dayMatch) return parseFloat(dayMatch[1])
  const perMatch = val.match(/1\s*post\s*per\s*(\d+)/i)
  if (perMatch) {
    const d = parseFloat(perMatch[1])
    return d > 0 ? 1 / d : 0
  }
  return 0
}

function ratingWeight(val: string) {
  const map: Record<string, number> = { Excellent: 5, Good: 4, Average: 3, Underperforming: 2, Poor: 1 }
  return map[String(val)] ?? 0
}

export default function ExcelSheetSection({
  hasTop10,
  username,
  username2,
  rows,
  rows2,
  fmtUTC,
  s,
  defaults,
  subsAvailable,
  onExport,
}: ExcelSheetSectionProps) {
  const compare = !!username2 && Array.isArray(rows2) && rows2.length > 0
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = React.useState(true)

  const [inclVote, setInclVote] = React.useState(defaults.inclVote)
  const [inclComm, setInclComm] = React.useState(defaults.inclComm)
  const [inclMed, setInclMed] = React.useState(defaults.inclMed)
  const [inclSubs, setInclSubs] = React.useState(subsAvailable ? defaults.inclSubs : false)
  const [inclPER, setInclPER] = React.useState(subsAvailable ? defaults.inclPER : false)

  const nonSortableSingle = new Set(["Subreddit", "LastDateTimeUTC"])
  const nonSortableCompare = new Set(["Subreddit"])

  const [sortKeySingle, setSortKeySingle] = React.useState<string | null>(null)
  const [sortDirSingle, setSortDirSingle] = React.useState<"asc" | "desc">("desc")
  const [sortKeyComp, setSortKeyComp] = React.useState<string | null>(null)
  const [sortDirComp, setSortDirComp] = React.useState<"asc" | "desc">("desc")

  const [colMinPx, setColMinPx] = React.useState<number[]>([])
  const [gridCols, setGridCols] = React.useState<string>("")

  const cols = React.useMemo(() => {
    const list: Array<{ key: string; label: string }> = [
      { key: "Subreddit", label: "subreddit name" },
      { key: "Total_Posts", label: "number of posts" },
      { key: "Avg_Upvotes_Per_Post", label: "av. upvotes (mean)" },
      { key: "Avg_Comments_Per_Post", label: "av. root comments" },
      { key: "Post_Frequency", label: "post frequency" },
    ]
    if (inclMed) list.splice(5, 0, { key: "Median_Upvotes", label: "median upvotes" })
    if (inclVote) list.push({ key: "Total_Upvotes", label: "total upvotes" })
    if (inclComm) list.push({ key: "Total_Comments", label: "total root comments" })
    if (subsAvailable && inclSubs) list.push({ key: "Subreddit_Subscribers", label: "subreddit member count" })
    if (subsAvailable && inclPER) { list.push({ key: "WPI_Score", label: "wpi score" }); list.push({ key: "WPI_Rating", label: "wpi rating" }) }
    list.push({ key: "LastDateTimeUTC", label: "last post date UTC" })
    return list
  }, [inclMed, inclVote, inclComm, inclSubs, inclPER, subsAvailable])

  const metrics = React.useMemo(() => cols.filter(c => c.key !== "Subreddit"), [cols])

  const bySub1 = React.useMemo(() => {
    const m = new Map<string, any>()
    for (const r of rows || []) if (r?.Subreddit) m.set(r.Subreddit, r)
    return m
  }, [rows])

  const bySub2 = React.useMemo(() => {
    const m = new Map<string, any>()
    for (const r of rows2 || []) if (r?.Subreddit) m.set(r.Subreddit, r)
    return m
  }, [rows2])

  const overlapSubs: string[] = React.useMemo(() => {
    if (!compare) return []
    const a = new Set<string>((rows || []).map((r: any) => r?.Subreddit).filter(Boolean))
    const b = new Set<string>((rows2 || []).map((r: any) => r?.Subreddit).filter(Boolean))
    const inter: string[] = []
    a.forEach(s => { if (b.has(s)) inter.push(s) })
    inter.sort((x, y) => x.localeCompare(y))
    return inter
  }, [rows, rows2, compare])

  const sortedRowsSingle = React.useMemo(() => {
    if (!Array.isArray(rows) || !sortKeySingle || nonSortableSingle.has(sortKeySingle)) return rows
    const arr = rows.slice()
    const getVal = (r: any) => {
      const v = r?.[sortKeySingle as string]
      if (sortKeySingle === "Post_Frequency") return parsePostFrequency(String(v || ""))
      if (sortKeySingle === "WPI_Rating") return ratingWeight(String(v || ""))
      if (typeof v === "number") return v
      if (v == null) return -Infinity
      const num = Number(String(v).replace(/,/g, ""))
      if (!Number.isNaN(num) && String(v).trim() !== "") return num
      return String(v)
    }
    arr.sort((a, b) => {
      const va = getVal(a)
      const vb = getVal(b)
      if (typeof va === "number" && typeof vb === "number") {
        return sortDirSingle === "asc" ? va - vb : vb - va
      }
      const sa = String(va)
      const sb = String(vb)
      const cmp = sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" })
      return sortDirSingle === "asc" ? cmp : -cmp
    })
    return arr
  }, [rows, sortKeySingle, sortDirSingle])

  const onHeaderClickSingle = (key: string) => {
    if (nonSortableSingle.has(key)) return
    if (sortKeySingle !== key) {
      setSortKeySingle(key)
      setSortDirSingle("desc")
      return
    }
    setSortDirSingle(d => (d === "desc" ? "asc" : "desc"))
  }

  React.useEffect(() => {
    if (compare) return
    let cancelled = false
    const run = async () => {
      try { if ((document as any).fonts?.ready) await (document as any).fonts.ready } catch {}
      const font = getComputedStyle(document.body).font || "14px system-ui, -apple-system, Segoe UI, Arial, sans-serif"
      const PADDING = 16
      const ICON_PAD = 16
      const MIN = 104
      const MAX = 380
      const SAMPLE_ROWS = 50
      const mins = cols.map((c) => {
        let need = measureTextPx(c.label, font) + ICON_PAD
        const limit = Math.min(sortedRowsSingle.length, SAMPLE_ROWS)
        for (let i = 0; i < limit; i++) {
          const r = sortedRowsSingle[i]
          let v: any = r?.[c.key]
          if (c.key === "LastDateTimeUTC") v = v ? fmtUTC(v) : ""
          else if (c.key === "Total_Upvotes" || c.key === "Total_Comments" || c.key === "Subreddit_Subscribers" || c.key === "WPI_Score") {
            const n = Number(v)
            v = Number.isFinite(n) ? n.toLocaleString() : (v ?? "")
          } else if (c.key === "Avg_Upvotes_Per_Post" || c.key === "Avg_Comments_Per_Post") {
            const n = Number(v)
            v = Number.isFinite(n) ? Math.round(n).toLocaleString() : (v ?? "")
          } else {
            v = v ?? ""
          }
          const w = measureTextPx(String(v), font)
          if (w > need) need = w
        }
        return Math.max(MIN, Math.min(MAX, need + PADDING))
      })
      if (!cancelled) setColMinPx(mins)
    }
    run()
    return () => { cancelled = true }
  }, [
    compare,
    cols.map((c) => c.key + ":" + c.label).join("|"),
    sortedRowsSingle.slice(0, 50).map((r) => JSON.stringify(r)).join("|"),
  ])

  React.useEffect(() => {
    if (compare) return
    if (!containerRef.current || colMinPx.length === 0) return
    const el = containerRef.current
    const compute = () => {
      const contentWidth = Math.floor(el.clientWidth)
      const sum = colMinPx.reduce((t, x) => t + x, 48)
      if (sum <= contentWidth) {
        setGridCols(`48px ${colMinPx.map((w) => `minmax(${w}px, 1fr)`).join(" ")}`)
      } else {
        setGridCols(`48px ${colMinPx.map((w) => `${w}px`).join(" ")}`)
      }
    }
    compute()
    const ro = new ResizeObserver(() => compute())
    ro.observe(el)
    return () => ro.disconnect()
  }, [compare, colMinPx])

  const sortedSubsComp = React.useMemo(() => {
    const base = overlapSubs
    if (!sortKeyComp) return base
    const [metric, who] = sortKeyComp.split("__")
    const arr = base.slice()
    const getVal = (sub: string) => {
      const src = who === "u2" ? bySub2.get(sub) : bySub1.get(sub)
      const v = src ? src[metric] : null
      if (metric === "Post_Frequency") return parsePostFrequency(String(v || ""))
      if (metric === "WPI_Rating") return ratingWeight(String(v || ""))
      if (typeof v === "number") return v
      if (v == null) return -Infinity
      const num = Number(String(v).replace(/,/g, ""))
      if (!Number.isNaN(num) && String(v).trim() !== "") return num
      return String(v)
    }
    arr.sort((a, b) => {
      const va = getVal(a)
      const vb = getVal(b)
      if (typeof va === "number" && typeof vb === "number") {
        return sortDirComp === "asc" ? va - vb : vb - va
      }
      const sa = String(va)
      const sb = String(vb)
      const cmp = sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" })
      return sortDirComp === "asc" ? cmp : -cmp
    })
    return arr
  }, [overlapSubs, sortKeyComp, sortDirComp, bySub1, bySub2])

  const onHeaderClickComp = (compoundKey: string) => {
    const [metric] = compoundKey.split("__")
    if (nonSortableCompare.has(metric)) return
    if (sortKeyComp !== compoundKey) {
      setSortKeyComp(compoundKey)
      setSortDirComp("desc")
      return
    }
    setSortDirComp(d => (d === "desc" ? "asc" : "desc"))
  }

  const gridTemplateColumnsComp = React.useMemo(() => {
    const num = "48px"
    const left = "minmax(200px, 280px)"
    const each = "minmax(140px, 1fr)"
    const segs: string[] = [num, left]
    for (const _ of metrics) segs.push(each, each)
    return segs.join(" ")
  }, [metrics])

  const renderCellValue = (metricKey: string, rowObj: any) => {
    let v: any = rowObj ? rowObj[metricKey] : undefined
    if (metricKey === "LastDateTimeUTC") v = v ? fmtUTC(v) : ""
    else if (metricKey === "Total_Upvotes" || metricKey === "Total_Comments" || metricKey === "Subreddit_Subscribers" || metricKey === "WPI_Score") {
      const n = Number(v)
      v = Number.isFinite(n) ? n.toLocaleString() : (v ?? "")
    } else if (metricKey === "Avg_Upvotes_Per_Post" || metricKey === "Avg_Comments_Per_Post") {
      const n = Number(v)
      v = Number.isFinite(n) ? Math.round(n).toLocaleString() : (v ?? "")
    } else {
      v = v ?? ""
    }
    return v
  }

  if (!rows || rows.length === 0) return null

  const CheckboxRow = () => (
    <div className="mt-1 mb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <label htmlFor="inclVote" className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          id="inclVote"
          checked={inclVote}
          onCheckedChange={(v) => setInclVote(Boolean(v))}
          className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]"
        />
        <span className="text-sm text-foreground">Total upvotes</span>
      </label>
      <label htmlFor="inclComm" className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          id="inclComm"
          checked={inclComm}
          onCheckedChange={(v) => setInclComm(Boolean(v))}
          className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]"
        />
        <span className="text-sm text-foreground">Total comments</span>
      </label>
      <label htmlFor="inclMed" className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          id="inclMed"
          checked={inclMed}
          onCheckedChange={(v) => setInclMed(Boolean(v))}
          className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]"
        />
        <span className="text-sm text-foreground">Median average upvotes per post</span>
      </label>
      {subsAvailable && (
        <>
          <label htmlFor="inclSubs" className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              id="inclSubs"
              checked={inclSubs}
              onCheckedChange={(v) => setInclSubs(Boolean(v))}
              className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]"
            />
            <span className="text-sm text-foreground">Subreddit member count</span>
          </label>
          <label htmlFor="inclPER" className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              id="inclPER"
              checked={inclPER}
              onCheckedChange={(v) => setInclPER(Boolean(v))}
              className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]"
            />
            <span className="text-sm text-foreground">Performance rating</span>
          </label>
        </>
      )}
    </div>
  )

  return (
    <div className="rounded-lg border border-border bg-card">
      <header className="p-6 cursor-pointer flex justify-between items-center" onClick={() => setIsOpen(v => !v)} aria-expanded={isOpen} aria-controls="excel-content">
        <h3 className="text-xl font-bold">
          Subreddit Performance Table{username ? ` for u/${username}` : ""}{compare && username2 ? ` vs u/${username2}` : ""}
        </h3>
        <svg className={`w-6 h-6 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </header>

      {isOpen && (
        <div id="excel-content" className="px-4 md:px-6 pb-4 md:pb-6">
          {!compare && (
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className={s.hint}>Displaying {rows.length} subreddits (scroll to view all)</p>
            </div>
          )}
          {compare && (
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className={s.hint}>Displaying {overlapSubs.length} overlapping subreddits {overlapSubs.length === 0 ? "(none)" : "(scroll to view all)"}</p>
            </div>
          )}

          <CheckboxRow />

          {hasTop10 && !compare && (
            <div className={`${s.tableContainer} overflow-x-auto overflow-y-auto`} ref={containerRef}>
              <div
                className={s.excel}
                role="table"
                aria-label="Subreddit Performance (single)"
                style={{ gridTemplateColumns: gridCols || `48px repeat(${cols.length}, minmax(156px, 1fr))`, minWidth: "860px" }}
              >
                <div className={`${s.cell} ${s.corner}`} aria-hidden="true"> </div>
                {cols.map((c, i) => {
                  const clickable = !nonSortableSingle.has(c.key)
                  const label = (() => {
                    if (sortKeySingle === c.key) return `${c.label} ${sortDirSingle === "desc" ? "▼" : "▲"}`
                    return c.label
                  })()
                  return (
                    <div
                      key={`col-${c.key}`}
                      className={`${s.cell} ${s.colhead}`}
                      role="columnheader"
                      aria-colindex={i + 1}
                      title={c.label}
                      onClick={() => clickable && onHeaderClickSingle(c.key)}
                      style={{ cursor: clickable ? "pointer" : "default" }}
                    >
                      {label}
                    </div>
                  )
                })}
                {sortedRowsSingle.map((row: any, r: number) => (
                  <React.Fragment key={`row-${r}`}>
                    <div className={`${s.cell} ${s.rowhead}`} role="rowheader">{r + 1}</div>
                    {cols.map((c) => {
                      let val: any = row?.[c.key]
                      if (c.key === "LastDateTimeUTC") val = val ? fmtUTC(val) : ""
                      if (c.key === "Total_Upvotes" || c.key === "Total_Comments" || c.key === "Subreddit_Subscribers" || c.key === "WPI_Score") {
                        const n = Number(val)
                        val = Number.isFinite(n) ? n.toLocaleString() : (val ?? "")
                      }
                      if (c.key === "Avg_Upvotes_Per_Post" || c.key === "Avg_Comments_Per_Post") {
                        const n = Number(val)
                        val = Number.isFinite(n) ? Math.round(n).toLocaleString() : (val ?? "")
                      }
                      return (
                        <div key={`${r}-${c.key}`} className={s.cell} role="cell" title={String(val ?? "")}>{val ?? ""}</div>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {hasTop10 && compare && overlapSubs.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No Subreddits overlap</div>
          )}

          {hasTop10 && compare && overlapSubs.length > 0 && (
            <div className={s.tableContainer} ref={containerRef}>
              <div className={s.excel} style={{ gridTemplateColumns: (() => {
                const num = "48px"
                const left = "minmax(200px, 280px)"
                const each = "minmax(140px, 1fr)"
                const segs: string[] = [num, left]
                for (const _ of metrics) segs.push(each, each)
                return segs.join(" ")
              })(), minWidth: "860px" }} role="table" aria-label="Subreddit Performance (compare)">
                <div className={`${s.cell} ${s.corner}`} />
                <div className={`${s.cell} ${s.colhead}`} />
                {metrics.map(m => (
                  <div key={`parent-${m.key}`} className={`${s.cell} ${s.colhead}`} style={{ gridColumn: `span 2` }}>{m.label}</div>
                ))}
                <div className={`${s.cell} ${s.colhead}`} />
                <div className={`${s.cell} ${s.colhead}`}>Subreddit</div>
                {metrics.map(m => (
                  <React.Fragment key={`subheads-${m.key}`}>
                    <div className={`${s.cell} ${s.colhead}`} onClick={() => onHeaderClickComp(`${m.key}__u1`)} style={{ cursor: nonSortableCompare.has(m.key) ? "default" : "pointer" }}>
                      {sortKeyComp === `${m.key}__u1` ? `user1 ${sortDirComp === "desc" ? "▼" : "▲"}` : "user1"}
                    </div>
                    <div className={`${s.cell} ${s.colhead}`} onClick={() => onHeaderClickComp(`${m.key}__u2`)} style={{ cursor: nonSortableCompare.has(m.key) ? "default" : "pointer" }}>
                      {sortKeyComp === `${m.key}__u2` ? `user2 ${sortDirComp === "desc" ? "▼" : "▲"}` : "user2"}
                    </div>
                  </React.Fragment>
                ))}
                {sortedSubsComp.map((sub, rIndex) => {
                  const r1 = bySub1.get(sub)
                  const r2 = bySub2.get(sub)
                  return (
                    <React.Fragment key={`row-${sub}`}>
                      <div className={`${s.cell} ${s.rowhead}`}>{rIndex + 1}</div>
                      <div className={`${s.cell} ${s.rowhead}`} style={{ textAlign: "left", fontWeight: 600 }}>{sub}</div>
                      {metrics.map(m => {
                        const v1 = renderCellValue(m.key, r1)
                        const v2 = renderCellValue(m.key, r2)
                        return (
                          <React.Fragment key={`${sub}-${m.key}`}>
                            <div className={s.cell} role="cell" title={String(v1 ?? "")}>{v1 ?? ""}</div>
                            <div className={s.cell} role="cell" title={String(v2 ?? "")}>{v2 ?? ""}</div>
                          </React.Fragment>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
            {!compare && (
              <>
                <button type="button" className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ${s.mini}`} onClick={() => onExport("data", "u1", { inclVote, inclComm, inclMed, inclSubs: subsAvailable && inclSubs, inclPER: subsAvailable && inclPER })}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 3v12m0 0 4-4m-4 4-4-4" /></svg>
                  Export Data to Excel
                </button>
                <button type="button" className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ${s.mini}`} onClick={() => onExport("raw", "u1", { inclVote, inclComm, inclMed, inclSubs: subsAvailable, inclPER: subsAvailable && inclPER })}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 3v12m0 0 4-4m-4 4-4-4" /></svg>
                  Export Individual Post Data to Excel
                </button>
              </>
            )}
            {compare && (
              <>
                <button type="button" className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ${s.mini}`} onClick={() => onExport("data", "u1", { inclVote, inclComm, inclMed, inclSubs: subsAvailable && inclSubs, inclPER: subsAvailable && inclPER })}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 3v12m0 0 4-4m-4 4-4-4" /></svg>
                  Export Data to Excel (u1)
                </button>
                <button type="button" className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ${s.mini}`} onClick={() => onExport("raw", "u1", { inclVote, inclComm, inclMed, inclSubs: subsAvailable, inclPER: subsAvailable && inclPER })}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 3v12m0 0 4-4m-4 4-4-4" /></svg>
                  Export Individual Post Data to Excel (u1)
                </button>
                <button type="button" className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ${s.mini}`} onClick={() => onExport("data", "u2", { inclVote, inclComm, inclMed, inclSubs: subsAvailable && inclSubs, inclPER: subsAvailable && inclPER })}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 3v12m0 0 4-4m-4 4-4-4" /></svg>
                  Export Data to Excel (u2)
                </button>
                <button type="button" className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ${s.mini}`} onClick={() => onExport("raw", "u2", { inclVote, inclComm, inclMed, inclSubs: subsAvailable, inclPER: subsAvailable && inclPER })}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 3v12m0 0 4-4m-4 4-4-4" /></svg>
                  Export Individual Post Data to Excel (u2)
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
