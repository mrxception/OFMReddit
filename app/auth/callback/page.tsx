"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Verifying your email...")

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Auth callback page loaded")

        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const type = hashParams.get("type")

        console.log("Hash params:", { accessToken: accessToken ? "present" : "missing", type })

        if (accessToken) {
          
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser(accessToken)

          console.log("Supabase user:", {
            userId: user?.id,
            email: user?.email,
            emailVerified: user?.email_confirmed_at,
            error: userError?.message,
          })

          if (user && !userError) {
            const response = await fetch("/api/auth/verify-callback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                supabaseUserId: user.id,
                email: user.email,
              }),
            })

            const result = await response.json()
            console.log("MySQL update result:", result)

            if (response.ok) {
              setStatus("success")
              setMessage("Email verified successfully!")
              setTimeout(() => router.push("/email-verified"), 1500)
            } else {
              throw new Error(result.error || "Failed to update verification status")
            }
          } else {
            throw new Error(userError?.message || "Failed to get user")
          }
        } else {
          throw new Error("No access token found")
        }
      } catch (error) {
        console.error("Callback error:", error)
        setStatus("error")
        setMessage(error instanceof Error ? error.message : "Verification failed")
        setTimeout(() => router.push("/email-verified?error=verification_failed"), 2000)
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-8 text-center shadow-sm">
        {status === "loading" && (
          <>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-lg font-medium">{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-green-600">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-medium text-red-600">{message}</p>
          </>
        )}
      </div>
    </div>
  )
}
