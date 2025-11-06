import { query, queryOne } from "@/lib/db"

export type Feature = "scraper" | "post_planner" | "caption_gen"

type Tier = {
  id: number
  weekly_scraper_limit: number
  weekly_planner_limit: number
  weekly_caption_limit: number
  saved_username_limit: number
}

type AssertOk = { ok: true }
type NoTier = { ok: false; code: "NO_TIER" }
type NoAccess = { ok: false; code: "NO_ACCESS"; weekly: number; cap: number }
type WeeklyLimit = { ok: false; code: "WEEKLY_LIMIT"; weekly: number; cap: number }
type Cooldown = { ok: false; code: "COOLDOWN"; wait: number }

export async function getActiveTierForUser(userId: number): Promise<Tier | null> {
  const sql = `
    SELECT t.id, t.weekly_scraper_limit, t.weekly_planner_limit, t.weekly_caption_limit, t.saved_username_limit
    FROM user_subscriptions us
    JOIN subscription_tiers t ON t.id = us.tier_id AND t.is_active = 1
    WHERE us.user_id = ?
      AND us.starts_at <= NOW()
      AND (us.ends_at IS NULL OR us.ends_at >= NOW())
    ORDER BY us.starts_at DESC
    LIMIT 1
  `
  return (await queryOne<Tier>(sql, [userId])) ?? null
}

export async function getWeeklyCount(userId: number, feature: Feature): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS count
    FROM feature_usage
    WHERE user_id = ?
      AND feature = ?
      AND occurred_at >= NOW() - INTERVAL 7 DAY
  `
  const row = await queryOne<{ count: number }>(sql, [userId, feature])
  return Number(row?.count ?? 0)
}

export async function getLastUse(userId: number, feature: Feature): Promise<Date | null> {
  const sql = `
    SELECT occurred_at
    FROM feature_usage
    WHERE user_id = ? AND feature = ?
    ORDER BY occurred_at DESC
    LIMIT 1
  `
  const row = await queryOne<{ occurred_at: Date | string }>(sql, [userId, feature])
  if (!row) return null
  return new Date(row.occurred_at)
}

export function minutesUntilNext(now: Date, last: Date, minutes: number): number {
  const t = last.getTime() + minutes * 60000 - now.getTime()
  return t > 0 ? Math.ceil(t / 60000) : 0
}

function capFor(feature: Feature, tier: Tier): number {
  if (feature === "scraper") return tier.weekly_scraper_limit
  if (feature === "post_planner") return tier.weekly_planner_limit
  return tier.weekly_caption_limit
}

export async function assertWithinLimits(
  userId: number,
  feature: Feature
): Promise<AssertOk | NoTier | NoAccess |WeeklyLimit> {
  const tier = await getActiveTierForUser(userId)
  if (!tier) return { ok: false, code: "NO_TIER" }

  const weekly = await getWeeklyCount(userId, feature)
  const cap = capFor(feature, tier)

  if (cap === 0) return { ok: false, code: "NO_ACCESS", weekly, cap }

  if (cap > 0 && weekly >= cap)
    return { ok: false, code: "WEEKLY_LIMIT", weekly, cap }

  return { ok: true }
}


async function getCooldownWaitFromDB(userId: number, feature: Feature, cooldownMinutes: number): Promise<number> {
  const sql = `
    SELECT
      CEIL(
        GREATEST(
          0,
          TIMESTAMPDIFF(
            SECOND,
            NOW(),
            DATE_ADD(occurred_at, INTERVAL ? MINUTE)
          ) / 60
        )
      ) AS wait
    FROM feature_usage
    WHERE user_id = ?
      AND feature = ?
    ORDER BY occurred_at DESC
    LIMIT 1
  `
  const row = await queryOne<{ wait: number }>(sql, [cooldownMinutes, userId, feature])
  return Number(row?.wait ?? 0)
}

export async function assertCooldown(
  userId: number,
  feature: Feature,
  cooldownMinutes: number
): Promise<AssertOk | Cooldown> {
  const wait = await getCooldownWaitFromDB(userId, feature, cooldownMinutes)
  if (wait > 0) return { ok: false, code: "COOLDOWN", wait }
  return { ok: true }
}

/*
export async function assertCooldown(userId: number, feature: Feature, cooldownMinutes: number): Promise<AssertOk | Cooldown> {
  const last = await getLastUse(userId, feature)
  if (!last) return { ok: true }
  const wait = minutesUntilNext(new Date(), last, cooldownMinutes)
  if (wait > 0) return { ok: false, code: "COOLDOWN", wait }
  return { ok: true }
}
*/

export async function recordUsage(userId: number, feature: Feature, meta?: any): Promise<void> {
  const sql = `
    INSERT INTO feature_usage (user_id, feature, occurred_at, meta)
    VALUES (?, ?, NOW(), ?)
  `
  await query(sql, [userId, feature, meta ? JSON.stringify(meta) : null])
}

export async function listSavedScrapes(userId: number): Promise<Array<{ id: number; username: string; scraped_at: string }>> {
  const sql = `
    SELECT id, username, scraped_at
    FROM saved_scrapes
    WHERE user_id = ?
    ORDER BY scraped_at DESC
  `
  return await query(sql, [userId])
}

export async function loadSavedScrape(userId: number, username: string) {
  const row = await queryOne<{ payload: any }>(
    "SELECT payload FROM saved_scrapes WHERE user_id = ? AND username = ? ORDER BY scraped_at DESC LIMIT 1",
    [userId, username]
  )
  if (!row) return null
  return typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload
}

export async function saveSnapshotWithPrune(userId: number, username: string, payload: any): Promise<Array<{ id: number; username: string; scraped_at: string }>> {
  const tier = await getActiveTierForUser(userId)
  const cap = Math.max(0, Number(tier?.saved_username_limit ?? 0))
  await query(
    `INSERT INTO saved_scrapes (user_id, username, payload, scraped_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), scraped_at = NOW()`,
    [userId, username, JSON.stringify(payload)]
  )
  if (cap > 0) {
    const rows = await query<{ id: number }>(`SELECT id FROM saved_scrapes WHERE user_id = ? ORDER BY scraped_at DESC`, [userId])
    if (rows.length > cap) {
      const ids = rows.slice(cap).map(r => r.id)
      const inClause = ids.length ? `(${ids.map(() => "?").join(",")})` : "(NULL)"
      if (ids.length) await query(`DELETE FROM saved_scrapes WHERE id IN ${inClause}`, ids)
    }
  }
  return await listSavedScrapes(userId)
}

export async function deleteSaved(userId: number, username: string): Promise<void> {
  await query(`DELETE FROM saved_scrapes WHERE user_id = ? AND username = ?`, [userId, username])
}
