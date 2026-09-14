"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useLatestAssessment, type AssessmentPercentages } from "@/lib/use-latest-assessment"
import type { AchievementSummary } from "@/lib/achievement-types"
import { apiBaseUrl } from "@/lib/config"

export type HealthTask = {
  id: string
  category: string
  title: string
  description: string | null
  impact_level: "high" | "medium" | "low"
  frequency: "daily" | "weekly"
  points_value: number
  completed_current_period: boolean
}

export type RecommendedProduct = {
  id: string
  category: string
  reason: string
  supports_task: string | null
  rank: number
  product: {
    id: string
    name: string
    brand: string | null
    description: string
    price: number | string | null
    currency: string
    purchase_url: string
    image_url: string | null
    category: string[] | null
  }
}

export type DashboardData = {
  achievements: AchievementSummary | null
  assessment: AssessmentPercentages | null
  tasks: HealthTask[]
  products: RecommendedProduct[]
  loading: boolean
  tasksLoading: boolean
  error: string
  accountName: string
  completingId: string
  generating: boolean
  completeTask: (task: HealthTask) => Promise<void>
  generateTasks: () => Promise<void>
  matchingProducts: boolean
  matchProducts: () => Promise<void>
}

/**
 * Loads the signed-in member's achievements, latest assessment and AI-generated
 * health choices, and exposes the complete / regenerate actions. Shared by the
 * dashboard and the Health Choices page so both follow the same rules.
 */
export function useDashboardData(): DashboardData {
  const { assessment } = useLatestAssessment()
  const [achievements, setAchievements] = useState<AchievementSummary | null>(null)
  const [tasks, setTasks] = useState<HealthTask[]>([])
  const [products, setProducts] = useState<RecommendedProduct[]>([])
  const [accountName, setAccountName] = useState("")
  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(true)
  const [error, setError] = useState("")
  const [completingId, setCompletingId] = useState("")
  const [generating, setGenerating] = useState(false)
  const [matchingProducts, setMatchingProducts] = useState(false)

  async function request(path: string, init?: RequestInit) {
    const { data, error: sessionError } = await getSupabaseClient().auth.getSession()
    if (sessionError || !data.session?.access_token) throw new Error("Please sign in again to continue.")
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: { Accept: "application/json", Authorization: `Bearer ${data.session.access_token}`, ...init?.headers },
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message ?? "The dashboard data could not be loaded.")
    return body
  }

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const supabase = getSupabaseClient()
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !sessionData.session) throw new Error("Please sign in again to continue.")
        const metadata = sessionData.session.user.user_metadata as { first_name?: string; last_name?: string; full_name?: string; name?: string } | undefined
        const metadataName = [metadata?.first_name, metadata?.last_name].filter(Boolean).join(" ") || metadata?.full_name || metadata?.name || ""
        const achievementBody = await request("/api/achievements")
        if (!active) return
        setAccountName(metadataName)
        setAchievements(achievementBody as AchievementSummary)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard data.")
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    let pollTimer: number | undefined

    async function loadTasks() {
      try {
        const taskBody = await request("/api/tasks")
        if (!active) return
        const loadedTasks = Array.isArray(taskBody.data) ? taskBody.data : []
        const generationStatus = taskBody.generation?.status ?? "idle"
        setTasks(loadedTasks)
        setProducts(Array.isArray(taskBody.products) ? taskBody.products : [])
        setGenerating(generationStatus === "processing")

        if (generationStatus === "processing") {
          pollTimer = window.setTimeout(() => { void loadTasks() }, 2500)
        } else if (loadedTasks.length === 0 && (generationStatus === "idle" || sessionStorage.getItem("healthTaskGenerationPending") === "true")) {
          sessionStorage.removeItem("healthTaskGenerationPending")
          void generateTasks(false)
        } else if (loadedTasks.length === 0 && generationStatus === "complete") {
          // Recover a stale generation record whose tasks were removed or never persisted.
          void generateTasks(true)
        } else if (loadedTasks.length === 0 && generationStatus === "failed") {
          setError("Your health choices could not be generated. Please try again, and make sure the queue worker is running.")
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load your health choices.")
      } finally {
        if (active) setTasksLoading(false)
      }
    }

    void loadTasks()
    return () => {
      active = false
      if (pollTimer) window.clearTimeout(pollTimer)
    }
  }, [])

  async function completeTask(task: HealthTask) {
    if (task.completed_current_period) return
    setCompletingId(task.id)
    setError("")
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed_current_period: true } : item))
    try {
      const body = await request(`/api/tasks/${task.id}/complete`, { method: "POST" })
      const categoryColumn = `${String(body.category).toLowerCase()}_percentage`
      window.dispatchEvent(new CustomEvent("health-scores-updated", { detail: { [categoryColumn]: body.new_category_score, health_percentage: body.new_overall_score } }))
      try {
        const refreshedAchievements = await request("/api/achievements")
        setAchievements(refreshedAchievements as AchievementSummary)
      } catch {
        // The completed choice remains saved even if achievement refresh is temporarily unavailable.
      }
    } catch (completeError) {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed_current_period: false } : item))
      setError(completeError instanceof Error ? completeError.message : "Unable to complete this health choice.")
    } finally {
      setCompletingId("")
    }
  }

  async function generateTasks(force = tasks.length > 0) {
    setGenerating(true)
    setError("")
    try {
      await request("/api/tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      })
      let attempts = 0
      const refresh = async () => {
        try {
          attempts += 1
          const taskBody = await request("/api/tasks")
          const loadedTasks = Array.isArray(taskBody.data) ? taskBody.data : []
          const generationStatus = taskBody.generation?.status ?? "idle"
          setTasks(loadedTasks)
          setProducts(Array.isArray(taskBody.products) ? taskBody.products : [])
          if (generationStatus === "processing" && attempts < 120) {
            window.setTimeout(() => { void refresh() }, 2500)
          } else {
            setGenerating(false)
            if (generationStatus === "failed") setError("Your health choices could not be generated. Please try again, and make sure the queue worker is running.")
          }
        } catch (refreshError) {
          setGenerating(false)
          setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh your health choices.")
        }
      }
      window.setTimeout(() => { void refresh() }, 1500)
    } catch (generateError) {
      setGenerating(false)
      setError(generateError instanceof Error ? generateError.message : "Unable to generate health choices.")
    }
  }

  /** Product-only refresh: matches the catalog to the existing choices without regenerating them. */
  async function matchProducts() {
    setMatchingProducts(true)
    setError("")
    try {
      await request("/api/tasks/recommend-products", { method: "POST" })
      // Picks land per pathway over the next ~30s; poll a few times then stop.
      let attempts = 0
      const before = products.length
      const refresh = async () => {
        attempts += 1
        try {
          const taskBody = await request("/api/tasks")
          const loaded = Array.isArray(taskBody.products) ? taskBody.products : []
          setProducts(loaded)
          if (attempts < 12 && (loaded.length === 0 || loaded.length === before)) {
            window.setTimeout(() => { void refresh() }, 4000)
          } else {
            setMatchingProducts(false)
          }
        } catch {
          setMatchingProducts(false)
        }
      }
      window.setTimeout(() => { void refresh() }, 4000)
    } catch (matchError) {
      setMatchingProducts(false)
      setError(matchError instanceof Error ? matchError.message : "Unable to match products right now.")
    }
  }

  return { achievements, assessment, tasks, products, loading, tasksLoading, error, accountName, completingId, generating, completeTask, generateTasks, matchingProducts, matchProducts }
}
