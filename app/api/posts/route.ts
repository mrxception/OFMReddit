import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { verifyToken } from "@/lib/auth"


export async function GET(request: NextRequest) {
  try {
    console.log("[v0] GET /api/posts - Starting request")

    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      console.log("[v0] No token provided")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      console.log("[v0] Invalid token")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", payload.userId)

    
    const posts = await query(
      `SELECT p.id, p.name, p.created_at,
              c.id as caption_id, c.option_number, c.text as caption_text
       FROM posts p
       LEFT JOIN captions c ON p.id = c.post_id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC, c.option_number ASC`,
      [payload.userId],
    )

    console.log("[v0] Query successful, found", (posts as any[]).length, "rows")

    
    const postsMap = new Map()
    for (const row of posts as any[]) {
      if (!postsMap.has(row.id)) {
        postsMap.set(row.id, {
          id: String(row.id),
          name: row.name,
          captions: [],
        })
      }
      if (row.caption_id) {
        postsMap.get(row.id).captions.push({
          option: row.option_number,
          text: row.caption_text,
        })
      }
    }

    return NextResponse.json({ posts: Array.from(postsMap.values()) })
  } catch (error: any) {
    console.error("[v0] Error fetching posts:", error)
    console.error("[v0] Error details:", {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    })
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch posts",
        details:
          error.code === "ER_NO_SUCH_TABLE" ? "Database tables not created. Please run the SQL script." : undefined,
      },
      { status: 500 },
    )
  }
}


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

    const { name } = await request.json()
    if (!name) {
      return NextResponse.json({ error: "Post name is required" }, { status: 400 })
    }

    const result = await query("INSERT INTO posts (user_id, name) VALUES (?, ?)", [payload.userId, name])

    return NextResponse.json({
      post: {
        id: String((result as any).insertId),
        name,
        captions: [],
      },
    })
  } catch (error: any) {
    console.error("[v0] Error creating post:", error)
    return NextResponse.json({ error: error.message || "Failed to create post" }, { status: 500 })
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("id")
    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 })
    }

    
    const posts = await query("SELECT id FROM posts WHERE id = ? AND user_id = ?", [postId, payload.userId])
    if ((posts as any[]).length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    await query("DELETE FROM posts WHERE id = ?", [postId])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting post:", error)
    return NextResponse.json({ error: error.message || "Failed to delete post" }, { status: 500 })
  }
}
