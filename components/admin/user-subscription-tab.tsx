"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select2"
import s from "@/styles/scraper.module.css"
import a from "@/styles/admin.module.css"

type User = { id: number; email: string }
type Subscription = { id: number; user_id: number; tier_id: number; starts_at: string | null; ends_at: string | null; cooldown: "0" | "10" | "30" | null }
type Tier = { id: number; name: string }

const COOLDOWN_CHOICES: Array<{ value: "0" | "10" | "30"; label: string }> = [
  { value: "0", label: "No Cooldown" },
  { value: "10", label: "10-Minute Cooldown" },
  { value: "30", label: "30-Minute Cooldown" },
]

export function UserSubscriptionTab() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [subs, setSubs] = useState<Subscription[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<number, boolean>>({})

  const [banner, setBanner] = useState<{ text: string; kind: "ok" | "err" } | null>(null)
  const bannerTimerRef = useRef<number | null>(null)
  const showBanner = (text: string, kind: "ok" | "err" = "ok") => {
    setBanner({ text, kind })
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current)
    bannerTimerRef.current = window.setTimeout(() => setBanner(null), 2000)
  }
  useEffect(() => () => { if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current) }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    Promise.all([
      fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/subscriptions", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/subscription-tiers", { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(async ([u, s, t]) => {
        if (!u.ok || !s.ok || !t.ok) throw new Error("Failed to load data")
        const uData = await u.json()
        const sData = await s.json()
        const tData = await t.json()
        setUsers(uData.users || [])
        setSubs(sData.subscriptions || [])
        setTiers((tData.tiers || []).map((r: any) => ({ id: r.id, name: r.name })))
      })
      .catch((e) => toast({ title: "Error", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [toast])

  const initial = useMemo(() => {
    const map: Record<number, { start: string; end: string; tierId: number | null; cooldown: "0" | "10" | "30" }> = {}
    subs.forEach(s => {
      map[s.user_id] = {
        start: s.starts_at ? s.starts_at.slice(0, 10) : "",
        end: s.ends_at ? s.ends_at.slice(0, 10) : "",
        tierId: s.tier_id ?? null,
        cooldown: (s.cooldown as "0" | "10" | "30") ?? "0"
      }
    })
    return map
  }, [subs])

  const [rows, setRows] = useState<Record<number, { start: string; end: string; tierId: number | null; cooldown: "0" | "10" | "30" }>>({})
  useEffect(() => setRows(initial), [initial])

  const save = async (userId: number, tierId: number | null, start: string | null, end: string | null, cooldown: "0" | "10" | "30") => {
    const token = localStorage.getItem("token")
    if (!token) return
    setSaving(prev => ({ ...prev, [userId]: true }))
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, tierId, starts_at: start, ends_at: end, cooldown })
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        const msg = e.error || "Failed to save subscription"
        toast({ title: "Error", description: msg, variant: "destructive", duration: 2000 })
        showBanner(msg, "err")
        return
      }
      toast({ title: "Saved", description: "Subscription updated", duration: 2000 })
      showBanner("Subscription updated!", "ok")
    } finally {
      setSaving(prev => ({ ...prev, [userId]: false }))
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Assign User Subscription</h2>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60">
            <tr>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Tier</th>
              <th className="text-left p-3">Start Date</th>
              <th className="text-left p-3">End Date</th>
              <th className="text-left p-3">Cooldown</th>
              <th className="text-left p-3 w-32">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const row = rows[u.id] || { start: "", end: "", tierId: tiers[0]?.id ?? null, cooldown: "0" as const }
              const isSaving = !!saving[u.id]
              return (
                <tr key={u.id} className="border-t border-border/60">
                  <td className="p-3">
                    <div className="font-medium">{u.email}</div>
                    <div className="text-muted-foreground text-xs">User ID: {u.id}</div>
                  </td>
                  <td className="p-3">
                    <Select
                      value={row.tierId != null ? String(row.tierId) : ""}
                      onValueChange={(v) =>
                        setRows(prev => ({ ...prev, [u.id]: { ...row, tierId: v ? Number(v) : null } }))
                      }
                    >
                      <SelectTrigger className={s.csvinput}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiers.map(t => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <input
                      type="date"
                      className={`${a.date} w-full rounded-md border border-border bg-background px-3 py-2 date-icon-tinted`}
                      value={row.start}
                      onChange={e => setRows(prev => ({ ...prev, [u.id]: { ...row, start: e.target.value } }))}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="date"
                      className={`${a.date} w-full rounded-md border border-border bg-background px-3 py-2 date-icon-tinted`}
                      value={row.end}
                      onChange={e => setRows(prev => ({ ...prev, [u.id]: { ...row, end: e.target.value } }))}
                    />
                  </td>
                  <td className="p-3">
                    <Select
                      value={row.cooldown}
                      onValueChange={(v) =>
                        setRows(prev => ({ ...prev, [u.id]: { ...row, cooldown: (v as "0" | "10" | "30") } }))
                      }
                    >
                      <SelectTrigger className={s.csvinput}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COOLDOWN_CHOICES.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <button
                      className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => save(u.id, row.tierId, row.start || null, row.end || null, row.cooldown)}
                      disabled={isSaving}
                      aria-busy={isSaving}
                    >
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Leave a date empty to clear it. Dates save as YYYY-MM-DD.</p>

      {banner && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-3 py-2 text-sm rounded-md shadow-lg
            ${banner.kind === "ok" ? "bg-foreground text-background" : "bg-rose-600 text-white"}`}
          role="status"
          aria-live="polite"
        >
          {banner.text}
        </div>
      )}
    </div>
  )
}
