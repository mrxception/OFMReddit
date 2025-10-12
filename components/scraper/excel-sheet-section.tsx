"use client"

import React from "react"

type Msg = { type: string; text: string } | null

interface ExcelSheetSectionProps {
  hasTop10: boolean
  username: string
  username2?: string
  cols: Array<{ key: string; label: string }>
  rows: any[]
  rows2?: any[]
  fmtUTC: (iso: string) => string
  files: Array<{ id: string; filename: string }>
  historyRef: React.RefObject<HTMLDivElement | null>
  handleDownload: (id: string, filename: string) => void
  handleDelete: (id: string) => void
  msg: Msg
  s: { [key: string]: string }
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
  cols,
  rows,
  rows2,
  fmtUTC,
  files,
  historyRef,
  handleDownload,
  handleDelete,
  msg,
  s,
}: ExcelSheetSectionProps) {
  const compare = !!username2 && Array.isArray(rows2) && rows2.length > 0
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = React.useState(true)

  const nonSortableSingle = new Set(["Subreddit", "LastDateTimeUTC"])
  const nonSortableCompare = new Set(["Subreddit"])

  const [sortKeySingle, setSortKeySingle] = React.useState<string | null>(null)
  const [sortDirSingle, setSortDirSingle] = React.useState<"asc" | "desc">("desc")
  const [sortKeyComp, setSortKeyComp] = React.useState<string | null>(null)
  const [sortDirComp, setSortDirComp] = React.useState<"asc" | "desc">("desc")

  const [colMinPx, setColMinPx] = React.useState<number[]>([])
  const [gridCols, setGridCols] = React.useState<string>("")

  const labelWithArrowSingle = (key: string, label: string) =>
    sortKeySingle === key ? `${label} ${sortDirSingle === "desc" ? "▼" : "▲"}` : label
  const labelWithArrowComp = (key: string, label: string) =>
    sortKeyComp === key ? `${label} ${sortDirComp === "desc" ? "▼" : "▲"}` : label

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

  const unionSubs: string[] = React.useMemo(() => {
    const a = new Set<string>((rows || []).map((r: any) => r?.Subreddit).filter(Boolean))
    if (compare) for (const r of rows2 || []) if (r?.Subreddit) a.add(r.Subreddit)
    return Array.from(a).sort((x, y) => x.localeCompare(y))
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
      try {
        // @ts-ignore
        if (document.fonts?.ready) await (document as any).fonts.ready
      } catch {}
      const font =
        getComputedStyle(document.body).font ||
        "14px system-ui, -apple-system, Segoe UI, Arial, sans-serif"
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
          else if (
            c.key === "Total_Upvotes" ||
            c.key === "Total_Comments" ||
            c.key === "Subreddit_Subscribers" ||
            c.key === "WPI_Score"
          ) {
            const n = Number(v)
            v = Number.isFinite(n) ? n.toLocaleString() : (v ?? "")
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
    return () => {
      cancelled = true
    }
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
    if (!sortKeyComp) return unionSubs
    const [metric, who] = sortKeyComp.split("__")
    const arr = unionSubs.slice()
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
  }, [unionSubs, sortKeyComp, sortDirComp, bySub1, bySub2])

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

  const subHeaderLabels = React.useMemo(() => {
    if (!compare) return []
    const out: Array<{ key: string; label: string }> = []
    for (const m of metrics) {
      out.push({ key: `${m.key}__u1`, label: "user1" })
      out.push({ key: `${m.key}__u2`, label: "user2" })
    }
    return out
  }, [metrics, compare])

  const renderCellValue = (metricKey: string, rowObj: any) => {
    let v: any = rowObj ? rowObj[metricKey] : undefined
    if (metricKey === "LastDateTimeUTC") v = v ? fmtUTC(v) : ""
    else if (metricKey === "Total_Upvotes" || metricKey === "Total_Comments" || metricKey === "Subreddit_Subscribers" || metricKey === "WPI_Score") {
      const n = Number(v)
      v = Number.isFinite(n) ? n.toLocaleString() : (v ?? "")
    } else {
      v = v ?? ""
    }
    return v
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <header
        className="p-6 cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen}
        aria-controls="excel-content"
      >
        <h3 className="text-xl font-bold">
          Subreddit Performance Table{username ? ` for u/${username}` : ""}{compare && username2 ? ` vs u/${username2}` : ""}
        </h3>
        <svg
          className={`w-6 h-6 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </header>

      {isOpen && (
        <div id="excel-content" className="px-4 md:px-6 pb-4 md:pb-6">
          {hasTop10 && !compare && (
            <div>
              <div className="mb-4">
                <p className={s.hint}>Displaying {sortedRowsSingle.length} subreddits (scroll to view all)</p>
              </div>
              <div className={`${s.tableContainer} overflow-x-auto overflow-y-auto`} ref={containerRef}>
                <div
                  className={s.excel}
                  role="table"
                  aria-label="Subreddit Performance (single)"
                  style={{
                    gridTemplateColumns: gridCols || `48px repeat(${cols.length}, minmax(156px, 1fr))`,
                    minWidth: "860px",
                  }}
                >
                  <div className={`${s.cell} ${s.corner}`} aria-hidden="true"> </div>
                  {cols.map((c, i) => {
                    const clickable = !nonSortableSingle.has(c.key)
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
                        {labelWithArrowSingle(c.key, c.label)}
                      </div>
                    )
                  })}
                  {sortedRowsSingle.map((row: any, r: number) => (
                    <React.Fragment key={`row-${r}`}>
                      <div className={`${s.cell} ${s.rowhead}`} role="rowheader">
                        {r + 1}
                      </div>
                      {cols.map((c) => {
                        let val: any = row?.[c.key]
                        if (c.key === "LastDateTimeUTC") val = val ? fmtUTC(val) : ""
                        if (
                          c.key === "Total_Upvotes" ||
                          c.key === "Total_Comments" ||
                          c.key === "Subreddit_Subscribers" ||
                          c.key === "WPI_Score"
                        ) {
                          const n = Number(val)
                          val = Number.isFinite(n) ? n.toLocaleString() : (val ?? "")
                        }
                        return (
                          <div key={`${r}-${c.key}`} className={s.cell} role="cell" title={String(val ?? "")}>
                            {val ?? ""}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasTop10 && compare && (
            <div>
              <div className="mb-4">
                <p className={s.hint}>Displaying {unionSubs.length} subreddits (scroll to view all)</p>
              </div>
              <div className={`${s.tableContainer}`} ref={containerRef}>
                <div
                  className={s.excel}
                  style={{ gridTemplateColumns: gridTemplateColumnsComp, minWidth: "860px" }}
                  role="table"
                  aria-label="Subreddit Performance (compare)"
                >
                  <div className={`${s.cell} ${s.corner}`} />
                  <div className={`${s.cell} ${s.colhead}`} />
                  {metrics.map(m => (
                    <div
                      key={`parent-${m.key}`}
                      className={`${s.cell} ${s.colhead}`}
                      style={{ gridColumn: `span 2` }}
                    >
                      {m.label}
                    </div>
                  ))}

                  <div className={`${s.cell} ${s.colhead}`} />
                  <div className={`${s.cell} ${s.colhead}`}>Subreddit</div>
                  {metrics.map(m => (
                    <React.Fragment key={`subheads-${m.key}`}>
                      <div
                        className={`${s.cell} ${s.colhead}`}
                        onClick={() => onHeaderClickComp(`${m.key}__u1`)}
                        style={{ cursor: nonSortableCompare.has(m.key) ? "default" : "pointer" }}
                      >
                        {labelWithArrowComp(`${m.key}__u1`, "user1")}
                      </div>
                      <div
                        className={`${s.cell} ${s.colhead}`}
                        onClick={() => onHeaderClickComp(`${m.key}__u2`)}
                        style={{ cursor: nonSortableCompare.has(m.key) ? "default" : "pointer" }}
                      >
                        {labelWithArrowComp(`${m.key}__u2`, "user2")}
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
            </div>
          )}

          <div id="history" className={s.history} aria-live="polite" ref={historyRef}>
            {files.length === 0 ? (
              <div className={s.hint}>No files in this session yet.</div>
            ) : (
              files.map((f) => (
                <div key={f.id} className={s.histrow}>
                  <span className={s.fname} title={f.filename}>{f.filename}</span>
                  <span className={s.flex1} />
                  <button type="button" className={s.mini} onClick={() => handleDownload(f.id, f.filename)}>Download</button>
                  <button type="button" className={`${s.mini} ${s.subtle}`} onClick={() => handleDelete(f.id)}>Delete</button>
                </div>
              ))
            )}
          </div>

          {msg && <div className={`${s.alert} ${msg.type === "ok" ? s.ok : s.err}`}>{msg.text}</div>}

          <p className={s.hint}>Files are stored temporarily in memory for this page session and auto-expire after ~10 minutes or when you close/reload the page.</p>
        </div>
      )}
    </div>
  )
}
