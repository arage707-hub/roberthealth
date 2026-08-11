"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCurrentUserRole } from "@/lib/use-current-user-role"

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { role, loading, error } = useCurrentUserRole()

  useEffect(() => {
    if (!loading && !error && role !== "admin") router.replace("/")
  }, [error, loading, role, router])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Checking administrator access...</div>
  }
  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center text-sm text-destructive">Unable to verify administrator access: {error}</div>
  }
  if (role !== "admin") return null
  return <>{children}</>
}
