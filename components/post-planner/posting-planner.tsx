"use client"

import React, { useState } from "react"
import type { SubredditAnalysisData } from "./file-upload"
import OneDayPicker from "@/components/post-planner/one-day-picker"
import AutoPlan from "@/components/post-planner/auto-plan"
import HowItWorksModal from "@/components/post-planner/how-it-works"

interface PostingPlannerProps {
  allSubredditData: SubredditAnalysisData[]
}

export default function PostingPlanner({ allSubredditData }: PostingPlannerProps) {
  const [plannerMode, setPlannerMode] = useState<"picker" | "auto">("picker")
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="mx-auto max-w-7xl space-y-6 md:p-6">
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[color:var(--sidebar-primary)]/40 text-[color:var(--sidebar-primary)] hover:bg-[color:var(--sidebar-primary)]/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How it Works
          </button>
        </div>

        <div className="flex rounded-md bg-muted p-1 max-w-md mx-auto">
          <button
            onClick={() => setPlannerMode("picker")}
            className={`w-full py-2 text-sm rounded ${plannerMode === "picker" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
          >
            Next Day Plan Builder
          </button>
          <button
            onClick={() => setPlannerMode("auto")}
            className={`w-full py-2 text-sm rounded ${plannerMode === "auto" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
          >
            5 Day Set Plan
          </button>
        </div>
      </div>

      {plannerMode === "picker" ? (
        <OneDayPicker allSubredditData={allSubredditData} />
      ) : (
        <AutoPlan allSubredditData={allSubredditData} />
      )}

      <HowItWorksModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
