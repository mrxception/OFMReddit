import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { query } from "@/lib/db"
import { supabase } from "@/lib/supabase"
import { ResultSetHeader } from "mysql2"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    
    if (!email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    
    const existingUser = await query("SELECT id, email_verified FROM users WHERE email = ?", [email])

    if (existingUser.length > 0) {
      if (!existingUser[0].email_verified) {
        return NextResponse.json(
          { error: "Email already registered but not verified. Please check your email for the verification link." },
          { status: 400 },
        )
      }
      return NextResponse.json({ error: "Email already registered" }, { status: 400 })
    }

    const { data: supabaseUser, error: supabaseError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (supabaseError) {
      console.error("Supabase signup error:", supabaseError)
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
    }

    
    const hashedPassword = await bcrypt.hash(password, 10)

    const result = (await query(
      "INSERT INTO users (email, password, email_verified, supabase_user_id, created_at) VALUES (?, ?, ?, ?, NOW())",
      [email, hashedPassword, false, supabaseUser.user?.id],
    )) as unknown as ResultSetHeader

    return NextResponse.json(
      {
        message: "Registration successful! Please check your email to verify your account.",
        userId: result.insertId,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
