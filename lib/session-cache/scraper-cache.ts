"use client";

export type ScrapeSnapshot = {
  username: string
  username2?: string
  dateRange: string
  limit: number
  runDefaults: {
    inclVote: boolean
    inclComm: boolean
    inclMed: boolean
    inclSubs: boolean
    inclPER: boolean
  }
  preview: any[]
  preview2?: any[] | null
  rawRows?: any[] | null
  rawRows2?: any[] | null
  timeSeries?: any | null
  timeSeries2?: any | null
  ts: number
}

const KEY = "ofmreddit:latest-scrape";

export function saveScrape(s: ScrapeSnapshot) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function loadScrape(): ScrapeSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ScrapeSnapshot;
  } catch {
    return null;
  }
}

export function clearScrape() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
