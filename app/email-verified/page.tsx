"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export default function EmailVerifiedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"success" | "error">("success")

  useEffect(() => {
    const error = searchParams.get("error")
    if (error) {
      setStatus("error")
    }
  }, [searchParams])

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Verification Failed</h1>
              <p className="text-muted-foreground">
                We couldn't verify your email. The link may have expired or is invalid.
              </p>
            </div>

            <div className="space-y-3">
              <Button onClick={() => router.push("/login")} className="w-full" size="lg">
                Go to Login
              </Button>
              <Button onClick={() => router.push("/register")} variant="outline" className="w-full" size="lg">
                Register Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h1>
            <p className="text-muted-foreground">
              Your email has been successfully verified. You can now log in to your account.
            </p>
          </div>

          <Button onClick={() => router.push("/login")} className="w-full" size="lg">
            Continue to Login
          </Button>
        </div>
      </div>
    </div>
  )
}
