"use client"

import React, { useMemo } from "react"
import KPIItem from "./kpi-item"

interface KPIProps {
  rows?: any[]
  dateRange?: string
  limit?: number
  inclPER?: boolean
}

export default function KPI({
  rows = [],
  dateRange = "all",
  limit = 1000,
  inclPER = false,
}: KPIProps) {
  const kpis = useMemo(() => {
    const arr = Array.isArray(rows) ? rows : []
    const sum = (xs: any[], f: (x: any) => number) => xs.reduce((t, x) => t + (Number(f(x)) || 0), 0)
    const toInt = (n: number) => (Number.isFinite(n) ? Math.round(n) : 0)

    const hasMedian = arr.some((r) => typeof r.Median_Upvotes_Per_Post === "number")
    const avgKey = hasMedian ? "Median_Upvotes_Per_Post" : "Avg_Upvotes_Per_Post"

    const totalPosts = toInt(sum(arr, (r) => r.Total_Posts || 0))
    const timeNote =
      dateRange === "all" ? `up to ${limit} posts` : `in ${dateRange} days (max ${limit})`

    const haveTotals = arr.some((r) => typeof r.Total_Upvotes === "number")
    const overallUpvotes = toInt(
      haveTotals
        ? sum(arr, (r) => r.Total_Upvotes || 0)
        : sum(arr, (r) => (r[avgKey] || 0) * (r.Total_Posts || 0))
    )

    const topSub = arr.slice().sort((a, b) => (b[avgKey] || 0) - (a[avgKey] || 0))[0] || null

    const opp = arr
      .map((r) => {
        const avg = Number(r[avgKey] || 0)
        const posts = Math.max(1, Number(r.Total_Posts || 0))
        const subs = Math.max(0, Number(r.Subreddit_Subscribers || 0))
        const subFactor = subs > 0 ? Math.log1p(subs) : 1
        const wpi = inclPER ? Math.max(1, Number(r.WPI_Score || 1)) : 1
        const score = (avg * subFactor * wpi) / Math.sqrt(posts)
        return { name: r.Subreddit, score }
      })
      .sort((a, b) => b.score - a.score)[0]

    return {
      totalPosts,
      overallUpvotes,
      topSubreddit: topSub?.Subreddit || "—",
      biggestOpportunity: opp?.name || "—",
      avgKeyLabel: hasMedian ? "Median Upvotes Per Post" : "Avg Upvotes Per Post",
      timeNote,
    }
  }, [rows, dateRange, limit, inclPER])

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPIItem
        icon="search"
        title="Total Posts Analyzed"
        value={kpis.totalPosts.toLocaleString()}
        note={kpis.timeNote}
        ariaLabel="Total posts analyzed"
      />
      <KPIItem
        icon="trend"
        title="Overall Upvote Score"
        value={kpis.overallUpvotes.toLocaleString()}
        note="Sum of upvotes across analyzed posts"
        ariaLabel="Overall upvote score"
      />
      <KPIItem
        icon="trophy"
        title="Top Subreddit"
        value={kpis.topSubreddit}
        note={`Highest ${kpis.avgKeyLabel}`}
        ariaLabel="Top subreddit by average upvotes"
      />
      <KPIItem
        icon="target"
        title="Biggest Opportunity"
        value={kpis.biggestOpportunity}
        note="High potential performance but under utilized"
        ariaLabel="Biggest opportunity subreddit"
      />
    </div>
  )
}
