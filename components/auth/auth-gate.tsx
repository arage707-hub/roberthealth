"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = getSupabaseClient()

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login")
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.replace("/login")
      }
    })

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Checking authentication...
      </div>
    )
  }

  return <>{children}</>
}
