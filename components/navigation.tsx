"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token")
      const userData = localStorage.getItem("user")
      if (token && userData) {
        setUser(JSON.parse(userData))
      } else {
        setUser(null)
      }
    }

    checkAuth()

    window.addEventListener("storage", checkAuth)

    window.addEventListener("authChange", checkAuth)

    return () => {
      window.removeEventListener("storage", checkAuth)
      window.removeEventListener("authChange", checkAuth)
    }
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    window.dispatchEvent(new Event("authChange"))
    router.push("/login")
  }

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-1">
            <Link href="/" className="flex items-center gap-2 mr-4">
              <span className="text-xl font-bold text-foreground">OFMReddit</span>
            </Link>

            {user && (
              <>
                <Link
                  href="/scraper"
                  className={`hidden md:block px-4 py-2 rounded-lg font-medium transition-colors ${
                    pathname === "/scraper"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Scraper
                </Link>
                <Link
                  href="/caption-generator"
                  className={`hidden md:block px-4 py-2 rounded-lg font-medium transition-colors ${
                    pathname === "/caption-generator"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Caption Generator
                </Link>

                {/* Mobile burger button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="hidden md:block text-sm text-muted-foreground truncate max-w-[150px]">
                  {user.email}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register" className="hidden sm:block">
                  <Button size="sm">Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {user && mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link
              href="/scraper"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2 rounded-lg font-medium transition-colors ${
                pathname === "/scraper"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Scraper
            </Link>
            <Link
              href="/caption-generator"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2 rounded-lg font-medium transition-colors ${
                pathname === "/caption-generator"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Caption Generator
            </Link>
            <div className="px-4 py-2 text-sm text-muted-foreground border-t border-border mt-2 pt-4">{user.email}</div>
          </div>
        )}
      </div>
    </nav>
  )
}
