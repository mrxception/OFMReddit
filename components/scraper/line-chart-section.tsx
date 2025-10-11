"use client";

import React from "react";
import PerformanceLineChart, { TimeSeriesRow } from "./line-chart";

type Row = {
  Subreddit: string;
  Avg_Upvotes_Per_Post?: number;
  Median_Upvotes?: number;
  Avg_Comments_Per_Post?: number;
  LastDateTimeUTC?: string;
  tier?: "High" | "Medium" | "Low";
};

type Metric = "upvotes" | "comments";
type View = "top10" | "overall";

interface Props {
  rows: Row[];
  username?: string;
  s?: any;
  timeSeries?: {
    upvotes: Array<{ date: string; [k: string]: number | string | null }>;
    comments: Array<{ date: string; [k: string]: number | string | null }>;
    subreddits: string[];
  };
}

function pickMetricValue(r: Row, metric: Metric): number {
  if (metric === "upvotes") {
    if (typeof r.Median_Upvotes === "number") return r.Median_Upvotes;
    return Number(r.Avg_Upvotes_Per_Post ?? 0);
  }
  return Number(r.Avg_Comments_Per_Post ?? 0);
}

function yMaxFromSeries(data: TimeSeriesRow[], keys: string[]): number {
  let max = 0;
  for (const row of data) {
    for (const k of keys) {
      const v = Number(row[k] ?? 0);
      if (Number.isFinite(v)) max = Math.max(max, v);
    }
  }
  return max || 0;
}

function selectTop10(rows: Row[], metric: Metric): string[] {
  return rows
    .slice()
    .sort((a, b) => pickMetricValue(b, metric) - pickMetricValue(a, metric))
    .slice(0, 10)
    .map((r) => r.Subreddit);
}

/** Carry forward last known value to create step-lines across gaps. */
function carryForward(
  base: Array<{ date: string; [k: string]: number | string | null }>,
  subKeys: string[],
  includeOverall: boolean
): { data: TimeSeriesRow[]; subs: string[] } {
  const last: Record<string, number | null> = {};
  const out: TimeSeriesRow[] = base.map((r) => {
    const row: TimeSeriesRow = { date: r.date };
    let sum = 0, count = 0;

    for (const s of subKeys) {
      const raw = r[s];
      if (typeof raw === "number" && isFinite(raw)) {
        last[s] = raw;
        row[s] = raw;
      } else if (last[s] != null) {
        row[s] = last[s]; // carry
      } else {
        row[s] = null;
      }
      const v = row[s];
      if (typeof v === "number" && isFinite(v)) { sum += v; count++; }
    }

    if (includeOverall) row["Overall Average"] = count ? sum / count : null;
    return row;
  });

  return { data: out, subs: includeOverall ? [...subKeys, "Overall Average"] : subKeys };
}

/** Build from aggregates when no timeSeries is supplied. */
function buildFromAggregates(
  rows: Row[],
  metric: Metric,
  subKeys: string[],
  includeOverall: boolean
): { data: TimeSeriesRow[]; subs: string[] } {
  const byDate = new Map<string, Record<string, number | null>>();
  for (const r of rows) {
    const d = r.LastDateTimeUTC ? new Date(r.LastDateTimeUTC) : null;
    if (!d || isNaN(d.getTime())) continue;
    const dKey = d.toISOString().slice(0, 10);
    const v =
      metric === "upvotes"
        ? (typeof r.Median_Upvotes === "number" ? r.Median_Upvotes : (r.Avg_Upvotes_Per_Post ?? 0))
        : (r.Avg_Comments_Per_Post ?? 0);

    if (!byDate.has(dKey)) byDate.set(dKey, {});
    byDate.get(dKey)![r.Subreddit] = Number(v);
  }

  const dates = Array.from(byDate.keys()).sort();
  const base = dates.map((date) => ({ date, ...byDate.get(date)! }));
  return carryForward(base, subKeys, includeOverall);
}

/** Compute a single-series Overall Average per day (with carry-forward). */
function overallFromBase(
  base: Array<{ date: string; [k: string]: number | string | null }>,
  keys: string[],
  carry = true
): { data: TimeSeriesRow[]; subs: string[] } {
  let last: number | null = null;
  const out: TimeSeriesRow[] = base.map((r) => {
    const nums: number[] = [];
    for (const k of keys) {
      const v = r[k];
      if (typeof v === "number" && isFinite(v)) nums.push(v);
    }
    let val: number | null =
      nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    if (val == null && carry && last != null) val = last;
    if (val != null) last = val;
    return { date: r.date, ["Overall Average"]: val };
  });
  return { data: out, subs: ["Overall Average"] };
}

export default function LineChartSection({ rows, username, s, timeSeries }: Props) {
  const [isOpen, setIsOpen] = React.useState(true);
  const [view, setView] = React.useState<View>("top10");
  const [metric, setMetric] = React.useState<Metric>("upvotes");
  const [autoMax, setAutoMax] = React.useState(true);
  const [manualMax, setManualMax] = React.useState<number>(0);

  const hasRows = Array.isArray(rows) && rows.length > 0;

  const { data, subs } = React.useMemo(() => {
    // Prefer server-provided time series (built from raw posts)
    if (timeSeries && timeSeries.subreddits?.length) {
      const base = metric === "upvotes" ? timeSeries.upvotes : timeSeries.comments;

      if (view === "overall") {
        // Show ONLY the overall average line (no top10 series)
        return overallFromBase(base, timeSeries.subreddits, /*carry*/ true);
      }

      // Top 10 view (per-series with carry-forward)
      const subKeys = selectTop10(rows, metric);
      const normalized = base.map((r) => {
        const obj: any = { date: r.date };
        for (const s of subKeys) obj[s] = (r as any)[s] ?? null;
        return obj;
      });

      const last: Record<string, number | null> = {};
      const carried: TimeSeriesRow[] = normalized.map((r) => {
        const row: TimeSeriesRow = { date: r.date };
        for (const s of subKeys) {
          const raw = (r as any)[s];
          if (typeof raw === "number" && isFinite(raw)) {
            last[s] = raw;
            row[s] = raw;
          } else if (last[s] != null) {
            row[s] = last[s];
          } else {
            row[s] = null;
          }
        }
        return row;
      });

      return { data: carried, subs: subKeys };
    }

    // Fallback when no timeSeries provided (build from aggregates)
    const allSubs = Array.from(new Set(rows.map((r) => r.Subreddit)));

    if (view === "overall") {
      // Overall-only series from aggregates
      const byDate = new Map<string, Record<string, number | null>>();
      for (const r of rows) {
        const d = r.LastDateTimeUTC ? new Date(r.LastDateTimeUTC) : null;
        if (!d || isNaN(d.getTime())) continue;
        const dKey = d.toISOString().slice(0, 10);
        const v =
          metric === "upvotes"
            ? (typeof r.Median_Upvotes === "number" ? r.Median_Upvotes : (r.Avg_Upvotes_Per_Post ?? 0))
            : (r.Avg_Comments_Per_Post ?? 0);
        if (!byDate.has(dKey)) byDate.set(dKey, {});
        byDate.get(dKey)![r.Subreddit] = Number(v);
      }
      const dates = Array.from(byDate.keys()).sort();
      const base = dates.map((date) => ({ date, ...byDate.get(date)! }));
      return overallFromBase(base, allSubs, /*carry*/ true);
    }

    // Top 10 fallback
    const subKeys = selectTop10(rows, metric);
    return buildFromAggregates(rows, metric, subKeys, /*includeOverall*/ false);
  }, [timeSeries, rows, view, metric]);

  const computedMax = React.useMemo(() => yMaxFromSeries(data, subs), [data, subs]);
  const finalMax = autoMax ? Math.ceil(computedMax || 0) : Math.max(0, Number(manualMax) || 0);
  const domain: [number, number] = [0, finalMax || 10];
  const metricLabel = metric === "upvotes" ? "Avg. Upvotes" : "Avg. Comments";

  if (!rows || rows.length === 0) return null
  
  return (
    <div className="rounded-lg border border-border bg-card">
      <header
        className="p-6 cursor-pointer flex justify-between items-start"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls="linechart-content"
      >
        <div className="flex items-center gap-2 text-xl font-bold">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: "var(--sidebar-primary)" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M5 14l4-4 4 4 4-6 3 4" />
          </svg>
          <h3>Performance Over Time{username ? ` for u/${username}` : ""}</h3>
        </div>

        <svg
          className={`w-6 h-6 transition-transform duration-300 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </header>

      {isOpen && (
        <div id="linechart-content" className="px-6 pb-6">
          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">View:</span>
                <div className="flex rounded-md bg-muted p-1">
                  <button
                    onClick={() => setView("top10")}
                    className={`px-3 py-1 text-sm rounded ${
                      view === "top10" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"
                    }`}
                  >
                    Top 10 Subreddits
                  </button>
                  <button
                    onClick={() => setView("overall")}
                    className={`px-3 py-1 text-sm rounded ${
                      view === "overall" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"
                    }`}
                  >
                    Overall Average
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Metric:</span>
                <div className="flex rounded-md bg-muted p-1">
                  <button
                    onClick={() => setMetric("upvotes")}
                    className={`px-3 py-1 text-sm rounded ${
                      metric === "upvotes" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"
                    }`}
                  >
                    Average Upvotes
                  </button>
                  <button
                    onClick={() => setMetric("comments")}
                    className={`px-3 py-1 text-sm rounded ${
                      metric === "comments" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"
                    }`}
                  >
                    Average Comments
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="accent-current"
                    checked={autoMax}
                    onChange={(e) => setAutoMax(e.target.checked)}
                  />
                  Auto Max
                </label>
                {!autoMax && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Max:</span>
                    <input
                      type="number"
                      min={0}
                      value={manualMax}
                      onChange={(e) => setManualMax(Number(e.target.value))}
                      className="w-28 rounded-md border border-border bg-background px-2 py-1 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ height: 400 }} className="mt-4">
            <PerformanceLineChart
              data={data}
              subreddits={subs}
              metricLabel={metricLabel}
              domain={[0, Math.max(10, domain[1])]}
            />
          </div>

          {!hasRows && (
            <p className="mt-3 text-sm text-muted-foreground">
              Provide data to display the line chart.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
