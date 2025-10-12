"use client"

import React, { useMemo, useState } from "react"
import type { SubredditAnalysisData } from "./file-upload"

type Tier = "High" | "Medium" | "Low"
type AverageMetricKey = "mean_upvotes_all" | "median_upvotes_all"

const METRICS: Record<AverageMetricKey, { label: string; pick: (r: SubredditAnalysisData) => number }> = {
  mean_upvotes_all: { label: "Mean Upvotes", pick: r => Number((r as any).avg_upvotes_all ?? 0) },
  median_upvotes_all: { label: "Median Upvotes", pick: r => Number((r as any).median_upvotes_all ?? (r as any).avg_upvotes_all ?? 0) },
}

type TierLists = Record<Tier, SubredditAnalysisData[]>
type JunkList = SubredditAnalysisData[]

const tierStyle = (t: Tier) =>
  t === "High" ? { border: "border-emerald-500", text: "text-emerald-400" } :
  t === "Medium" ? { border: "border-amber-500", text: "text-amber-400" } :
  { border: "border-rose-500", text: "text-rose-400" }

const Tooltip: React.FC<{ text: React.ReactNode; children: React.ReactNode }> = ({ text, children }) => (
  <div className="relative inline-flex items-center group">
    {children}
    <div className="absolute bottom-full mb-2 w-72 bg-card text-xs rounded py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-border shadow-lg z-20">
      {text}
    </div>
  </div>
)

export default function OneDayPicker({ allSubredditData }: { allSubredditData: SubredditAnalysisData[] }) {
  const [cooldownDays, setCooldownDays] = useState(2)
  const [priorityDays, setPriorityDays] = useState(5)
  const [metricKey, setMetricKey] = useState<AverageMetricKey>("mean_upvotes_all")
  const [generated, setGenerated] = useState<{ tiers: TierLists; junk: JunkList } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copyLabel, setCopyLabel] = useState("Copy List")

  const cleaned = useMemo(() => {
    const by = new Map<string, SubredditAnalysisData>()
    for (const r of allSubredditData || []) {
      const key = String(r.subreddit || "").trim().toLowerCase()
      if (!key) continue
      const prev = by.get(key)
      if (!prev || Number((r as any).avg_upvotes_all ?? 0) > Number((prev as any).avg_upvotes_all ?? 0)) {
        by.set(key, { ...r, subreddit: r.subreddit?.trim?.() ?? r.subreddit })
      }
    }
    return Array.from(by.values())
  }, [allSubredditData])

  const junk = useMemo(() => {
    return cleaned.filter(s =>
      Number((s as any).total_post_count ?? 0) > 5 &&
      Number((s as any).avg_upvotes_all ?? 0) < 60 &&
      Number((s as any).members ?? 0) < 100000
    )
  }, [cleaned])

  const nonJunk = useMemo(() => {
    const junkSet = new Set(junk.map(j => (j as any).subreddit))
    return cleaned.filter(s => !junkSet.has((s as any).subreddit))
  }, [cleaned, junk])

  const computedTierOf = useMemo(() => {
    const sorted = [...nonJunk].sort((a, b) => Number((b as any).avg_upvotes_all ?? 0) - Number((a as any).avg_upvotes_all ?? 0))
    const n = sorted.length
    const hiCount = Math.floor(n * 0.3)
    const mdCount = Math.floor(n * 0.4)
    const map = new Map<string, Tier>()
    sorted.forEach((s, i) => {
      const t: Tier = i < hiCount ? "High" : i < hiCount + mdCount ? "Medium" : "Low"
      map.set((s as any).subreddit, t)
    })
    return map
  }, [nonJunk])

  const handleGenerate = () => {
    const eligibility = cooldownDays + 1
    const pick = METRICS[metricKey].pick

    const eligible = nonJunk
      .filter(s => Number((s as any).days_since_last_post ?? 0) >= eligibility)
      .map(s => ({ ...s, tier: computedTierOf.get((s as any).subreddit) as Tier }))
      .sort((a: any, b: any) => {
        const d = Number(b.days_since_last_post ?? 0) - Number(a.days_since_last_post ?? 0)
        if (d !== 0) return d
        return pick(b) - pick(a)
      })

    const tiers: TierLists = { High: [], Medium: [], Low: [] }
    for (const s of eligible as any[]) {
      if (s.tier) (tiers as any)[s.tier].push(s)
    }

    setGenerated({ tiers, junk })
    setSelected(new Set())
  }

  const toggle = (sub: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(sub)) next.delete(sub)
      else next.add(sub)
      return next
    })
  }

  const copy = () => {
    const text = [...selected].join("\n")
    navigator.clipboard.writeText(text).then(() => {
      setCopyLabel("Copied!")
      setTimeout(() => setCopyLabel("Copy List"), 1500)
    })
  }

  const clear = () => setSelected(new Set())

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center max-w-xl mx-auto">
          <div className="flex items-center gap-3">
            <Tooltip text="Minimum full days to wait after posting before eligible again. 2 means eligible on day 3.">
              <label htmlFor="cooldown" className="font-medium text-foreground/90 flex items-center gap-1.5 cursor-help">
                Cooldown (Days)
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </label>
            </Tooltip>
            <input id="cooldown" type="number" value={cooldownDays} min={1} onChange={e => setCooldownDays(Math.max(1, Number(e.target.value)))} className="w-20 bg-muted border border-border rounded-md text-center p-1.5 focus:ring-ring" />
          </div>

          <div className="flex items-center gap-3">
            <Tooltip text="Highlights subs not posted in for this many days.">
              <label htmlFor="priority" className="font-medium text-foreground/90 flex items-center gap-1.5 cursor-help">
                Priority Window (Days)
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </label>
            </Tooltip>
            <input id="priority" type="number" value={priorityDays} min={cooldownDays + 1} onChange={e => setPriorityDays(Math.max(cooldownDays + 1, Number(e.target.value)))} className="w-20 bg-muted border border-border rounded-md text-center p-1.5 focus:ring-ring" />
          </div>
        </div>

        <div className="flex items-center gap-2 justify-center">
          <span className="text-sm font-medium text-muted-foreground">Metric:</span>
          <div className="flex rounded-md bg-muted p-1">
            {Object.entries(METRICS).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setMetricKey(key as AverageMetricKey)}
                className={`px-3 py-1 text-sm rounded ${metricKey === key ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button onClick={handleGenerate} className="px-5 py-2 rounded-lg bg-[color:var(--sidebar-primary)] text-white font-semibold hover:opacity-90">
            Generate List
          </button>
        </div>
      </div>

      {generated && (
        <div className="space-y-4">
          {selected.size > 0 && (
            <div className="p-4 rounded-lg border border-[color:var(--sidebar-primary)]/40 bg-card sticky top-[70px] z-10">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[color:var(--sidebar-primary)] font-bold">Final Plan ({selected.size})</h3>
                <div className="flex items-center gap-3">
                  <button onClick={clear} className="text-sm text-muted-foreground hover:text-foreground">Clear</button>
                  <button onClick={copy} className="text-sm px-3 py-1 rounded-md bg-[color:var(--sidebar-primary)] text-white">{copyLabel}</button>
                </div>
              </div>
              <div className="max-h-24 overflow-y-auto pr-2">
                <ul className="columns-2 sm:columns-3 md:columns-4 gap-x-4 text-sm">
                  {[...selected].sort().map(s => <li key={s} className="truncate text-foreground/90">{s}</li>)}
                </ul>
              </div>
            </div>
          )}

          {(["High", "Medium", "Low"] as Tier[]).map(tier => {
            const { border, text } = tierStyle(tier)
            const list = generated.tiers[tier]
            return (
              <details key={tier} className="rounded-lg border border-border bg-card group" open>
                <summary className={`text-lg font-bold p-3 flex justify-between items-center cursor-pointer ${border} border-l-4`}>
                  <span className={text}>{tier} Tier ({list.length})</span>
                  <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div className="p-3 border-t border-border">
                  {list.length ? (
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground uppercase">
                        <tr>
                          <th className="py-2 px-2 w-8"></th>
                          <th className="py-2 px-2">Subreddit</th>
                          <th className="py-2 px-2 text-center">Days Since Last Post</th>
                          <th className="py-2 px-2 text-center">{METRICS[metricKey].label}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((s: any) => (
                          <tr key={s.subreddit} className="border-b border-border/60 hover:bg-muted/40">
                            <td className="py-2 px-2 text-center">
                              <input type="checkbox" checked={selected.has(s.subreddit)} onChange={() => toggle(s.subreddit)} className="w-4 h-4 accent-[color:var(--sidebar-primary)]" />
                            </td>
                            <td className="py-2 px-2 font-medium text-foreground flex items-center gap-2">
                              {Number(s.days_since_last_post ?? 0) >= priorityDays && <span title="Priority">⭐</span>}
                              {s.subreddit}
                            </td>
                            <td className="py-2 px-2 text-center">{s.days_since_last_post}</td>
                            <td className="py-2 px-2 text-center">{Math.round(METRICS[metricKey].pick(s)).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center text-muted-foreground italic py-4">No eligible subreddits in this tier.</p>
                  )}
                </div>
              </details>
            )
          })}

          <details className="rounded-lg border border-border bg-card group">
            <summary className="text-lg font-bold p-3 flex justify-between items-center cursor-pointer border-l-4 border-rose-500">
              <span className="text-rose-400">Junk Tier ({generated.junk.length})</span>
              <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="p-3 border-t border-border">
              {generated.junk.length ? (
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {generated.junk.map((s: any) => <li key={s.subreddit}>{s.subreddit}</li>)}
                </ul>
              ) : (
                <p className="text-center text-muted-foreground italic py-4">No subreddits met the Junk criteria.</p>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
