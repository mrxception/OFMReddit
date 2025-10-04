import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    
    const users = await query("SELECT id, email, email_verified FROM users WHERE email = ?", [email])

    if (users.length === 0) {
      return NextResponse.json({ error: "No account found with this email" }, { status: 404 })
    }

    const user = users[0]

    
    if (user.email_verified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 })
    }

    const { error: supabaseError } = await supabase.auth.resend({
      email,
      type: "signup",
    })

    if (supabaseError) {
      console.error("Supabase resend error:", supabaseError)
      return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ message: "Verification email sent! Please check your inbox." }, { status: 200 })
  } catch (error) {
    console.error("Resend verification error:", error)
    return NextResponse.json({ error: "Failed to resend verification email" }, { status: 500 })
  }
}
