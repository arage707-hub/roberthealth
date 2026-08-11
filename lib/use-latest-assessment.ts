"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"

export type AssessmentPercentages = {
  health_percentage: number
  nutrition_percentage: number
  toxin_percentage: number
  mental_percentage: number
  physical_percentage: number
  genetic_percentage: number
  medical_percentage: number
}

export function useLatestAssessment() {
  const [assessment, setAssessment] = useState<AssessmentPercentages | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function loadLatestAssessment() {
      try {
        const supabase = getSupabaseClient()
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!userData.user) throw new Error("No signed-in user was found.")

        const { data, error: assessmentError } = await supabase
          .from("assessments")
          .select(
            "health_percentage, nutrition_percentage, toxin_percentage, mental_percentage, physical_percentage, genetic_percentage, medical_percentage",
          )
          .eq("user_id", userData.user.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (assessmentError) throw assessmentError
        if (active) setAssessment(data as AssessmentPercentages | null)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load health summary.")
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadLatestAssessment()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function applyLiveScores(event: Event) {
      const scores = (event as CustomEvent<Partial<AssessmentPercentages>>).detail
      if (scores) setAssessment((current) => current ? { ...current, ...scores } : current)
    }
    window.addEventListener("health-scores-updated", applyLiveScores)
    return () => window.removeEventListener("health-scores-updated", applyLiveScores)
  }, [])

  return { assessment, loading, error }
}
