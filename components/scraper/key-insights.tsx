"use client";

import React from "react";

interface KeyInsightsProps {
  insights: string[];
  isLoading: boolean;
}

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center space-x-2" aria-live="polite">
    <div className="w-3.5 h-3.5 rounded-full animate-pulse" style={{ background: "var(--sidebar-primary)" }} />
    <div className="w-3.5 h-3.5 rounded-full animate-pulse" style={{ background: "var(--sidebar-primary)", animationDelay: "0.2s" }} />
    <div className="w-3.5 h-3.5 rounded-full animate-pulse" style={{ background: "var(--sidebar-primary)", animationDelay: "0.4s" }} />
    <span className="ml-2 text-muted-foreground">Generating AI Insights...</span>
  </div>
);

const KeyInsights: React.FC<KeyInsightsProps> = ({ insights, isLoading }) => {
  if (isLoading) return <LoadingSpinner />;

  if (!insights?.length) {
    return <p className="text-sm text-muted-foreground">No insights yet.</p>;
  }

  const [first, ...rest] = insights;

  return (
    <div className="text-foreground/90 pb-2 space-y-3">
      <div
        className="pl-2"
        dangerouslySetInnerHTML={{ __html: first }}
      />
      {rest.length > 0 && (
        <ul className="space-y-3 list-disc list-inside">
          {rest.map((insight, idx) => (
            <li
              key={idx}
              className="pl-2"
              dangerouslySetInnerHTML={{ __html: insight }}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default KeyInsights;
