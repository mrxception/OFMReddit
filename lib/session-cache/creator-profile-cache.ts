"use client"

import type { CreatorProfileValues } from "@/components/reddit-database/creator-profile"

export type CreatorProfileSnapshot = CreatorProfileValues & {
  ts: number
}

const KEY = "ofmreddit:creator-profile"

export function saveCreatorProfile(profile: CreatorProfileValues) {
  if (typeof window === "undefined") return
  try {
    const payload: CreatorProfileSnapshot = { ...profile, ts: Date.now() }
    sessionStorage.setItem(KEY, JSON.stringify(payload))
  } catch {}
}

export function loadCreatorProfile(): CreatorProfileSnapshot | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as CreatorProfileSnapshot
  } catch {
    return null
  }
}

export function clearCreatorProfile() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(KEY)
  } catch {}
}
