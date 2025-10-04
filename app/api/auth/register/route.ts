import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { hashPassword, signToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const existingUsers = await query<any[]>("SELECT id FROM users WHERE email = ?", [email])

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)
    const result = await query<any>("INSERT INTO users (email, password) VALUES (?, ?)", [email, hashedPassword])

    const userId = result.insertId

    const token = signToken({ userId, email })

    return NextResponse.json({
      token,
      user: { id: userId, email },
    })
  } catch (error: any) {
    console.error("Register error:", error)
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 })
  }
}
