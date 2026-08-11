"use client"

import { useCallback, useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"

export type UserRole = "member" | "admin"

export function useCurrentUserRole() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadRole = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = getSupabaseClient()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!userData.user) {
        setRole(null)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle()

      if (profileError) throw profileError
      setRole(profile?.role === "admin" ? "admin" : "member")
    } catch (loadError) {
      setRole(null)
      setError(loadError instanceof Error ? loadError.message : "Unable to check your account role.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRole()
    const supabase = getSupabaseClient()
    const { data: listener } = supabase.auth.onAuthStateChange(() => void loadRole())
    return () => listener.subscription.unsubscribe()
  }, [loadRole])

  return { role, isAdmin: role === "admin", loading, error, refresh: loadRole }
}
