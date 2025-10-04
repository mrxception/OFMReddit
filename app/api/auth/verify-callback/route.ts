import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { supabaseUserId, email } = await request.json()

    console.log("Verify callback API called:", { supabaseUserId, email })

    if (!supabaseUserId) {
      return NextResponse.json({ error: "Missing supabaseUserId" }, { status: 400 })
    }

    const result = await query("UPDATE users SET email_verified = TRUE WHERE supabase_user_id = ?", [supabaseUserId])

    console.log("MySQL update result:", result)

    const updatedUser = await query("SELECT id, email, email_verified FROM users WHERE supabase_user_id = ?", [
      supabaseUserId,
    ])

    console.log("Updated user status:", updatedUser)

    if (updatedUser && updatedUser.length > 0) {
      return NextResponse.json({
        success: true,
        user: updatedUser[0],
      })
    } else {
      return NextResponse.json(
        {
          error: "User not found in database",
        },
        { status: 404 },
      )
    }
  } catch (error) {
    console.error("Verify callback error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
