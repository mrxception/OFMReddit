import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { query } from "@/lib/db"
import { signToken } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    
    const users = await query("SELECT id, email, password, email_verified FROM users WHERE email = ?", [email])

    if (users.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const user = users[0]

    console.log("Login attempt for:", email, "Verified:", user.email_verified)

    
    if (user.email_verified !== true && user.email_verified !== 1) {
      return NextResponse.json(
        {
          error: "Please verify your email before logging in. Check your inbox for the verification link.",
          needsVerification: true,
        },
        { status: 403 },
      )
    }

    
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    
    const token = await signToken({
      userId: user.id,
      email: user.email,
    })

    
    const response = NextResponse.json(
      {
        message: "Login successful",
        token, 
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 200 },
    )

    
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, 
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
