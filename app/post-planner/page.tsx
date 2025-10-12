"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import FileUpload from "@/components/post-planner/file-upload"

export default function ScraperPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
    }
  }, [router])

  return <FileUpload />
}
