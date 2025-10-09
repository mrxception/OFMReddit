import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { query } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    const { postId, captionText } = body

    if (!postId || !captionText) {
      return NextResponse.json({ error: "Post ID and caption text are required" }, { status: 400 })
    }

    await query("INSERT INTO copied_captions (user_id, post_id, caption_text) VALUES (?, ?, ?)", [
      payload.userId,
      postId,
      captionText,
    ])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error tracking copied caption:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
