"use client"

import React from "react"

interface Props { isOpen: boolean; onClose: () => void }

export default function HowItWorksModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card rounded-xl p-6 md:p-8 max-w-2xl w-full mx-4 border border-border text-foreground relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="text-2xl font-bold mb-4">How the Posting Planner Works</h2>
        <div className="space-y-4 text-sm md:text-base max-h-[70vh] overflow-y-auto pr-2 text-muted-foreground">
          <p>The Posting Planner provides two tools to help you schedule content effectively, maximizing engagement by targeting the right subreddits at the right time.</p>

          <div>
            <h3 className="text-lg font-semibold text-[color:var(--sidebar-primary)] mb-2">1. Next Day Plan Builder</h3>
            <p>Generate high-potential candidates based on your rules, then curate your final list.</p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
              <li><span className="font-semibold text-foreground">Set Your Strategy:</span> Configure Cooldown and Priority windows.</li>
              <li><span className="font-semibold text-foreground">Generate Candidates:</span> Automatically grouped into tiers with ⭐ re-engagement flags.</li>
              <li><span className="font-semibold text-foreground">Build Your Plan:</span> Select subreddits; your choices appear in the Final Plan box for quick copy.</li>
              <li><span className="font-semibold text-foreground">Junk Tier:</span> Filters consistently low performers with low member counts.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[color:var(--sidebar-primary)] mb-2">2. 5-Day Set Post Plan</h3>
            <p>Creates a balanced, rule-based 5-day schedule using a Strategic Value score.</p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
              <li><span className="font-semibold text-foreground">User-Controlled Strategy:</span> Your Cooldown, Priority, Bonus and Junk rules drive the plan.</li>
              <li><span className="font-semibold text-foreground">Strategic Value:</span> Tier score + escalating bonus after your Priority Window.</li>
              <li><span className="font-semibold text-foreground">Daily Quotas:</span> Guarantees a strong mix of High/Medium/Low each day.</li>
              <li><span className="font-semibold text-foreground">Opportunistic Backfill:</span> Fills remaining slots from the top of the ranked list.</li>
              <li><span className="font-semibold text-foreground">Intelligent Reuse:</span> Cooldown simulation allows smart re-use of top performers later in the week.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
