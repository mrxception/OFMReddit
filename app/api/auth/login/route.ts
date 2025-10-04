import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { comparePassword, signToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const users = await query<any[]>("SELECT id, email, password FROM users WHERE email = ?", [email])

    if (users.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const user = users[0]

    const isValid = await comparePassword(password, user.password)

    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const token = signToken({ userId: user.id, email: user.email })

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email },
    })
  } catch (error: any) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Failed to login" }, { status: 500 })
  }
}
