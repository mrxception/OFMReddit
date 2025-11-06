import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const feature = searchParams.get("feature") ?? "scraper"
  const rows = await query(
    `SELECT fu.user_id, fu.occurred_at, fu.meta, u.email, u.is_admin, u.username AS account_username
     FROM feature_usage fu
     JOIN users u ON u.id = fu.user_id
     WHERE fu.feature = ?
     ORDER BY fu.user_id ASC, fu.occurred_at DESC`,
    [feature]
  )
  return NextResponse.json({ rows })
}
