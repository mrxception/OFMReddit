import { NextResponse } from "next/server"
import { buildWorkbook, type SubredditRow } from "@/lib/excel/buildWorkbook"
import { buildRawWorkbook, type RawPostRow } from "@/lib/excel/buildRawWorkbook"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      kind,
      username,
      rows,
      rawRows,
      inclSubs = 0,
      inclVote = 0,
      inclComm = 0,
      inclPER = 0,
      inclMed = 0,
    } = body

    if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 })
    if (kind === "data") {
      const arr = Array.isArray(rows) ? (rows as SubredditRow[]) : []
      const { buffer, filename } = await buildWorkbook(arr, {
        username,
        inclMed,
        inclVote,
        inclComm,
        inclSubs,
        inclPER,
      })
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }
    if (kind === "raw") {
      const arr = Array.isArray(rawRows) ? (rawRows as RawPostRow[]) : []
      const { buffer, filename } = await buildRawWorkbook(arr, username, { inclSubs: !!inclSubs })
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }
    return NextResponse.json({ error: "Invalid export kind" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}
