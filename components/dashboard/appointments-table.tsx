"use client"

import { useEffect, useState } from "react"
import { Check, LoaderCircle, Sparkles } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { getSupabaseClient } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import { apiBaseUrl } from "@/lib/config"

const categories = ["All", "Nutrition", "Toxin", "Mental", "Physical", "Genetic", "Medical"]

type HealthTask = {
  id: string
  category: string
  title: string
  description: string | null
  impact_level: "high" | "medium" | "low"
  frequency: "daily" | "weekly"
  points_value: number
  completed_current_period: boolean
}

type GenerationProgress = { status: "idle" | "processing" | "complete" | "failed"; completed: number; total: number }

export function AppointmentsTable() {
  const [tasks, setTasks] = useState<HealthTask[]>([])
  const [category, setCategory] = useState("All")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [completingId, setCompletingId] = useState("")
  const [error, setError] = useState("")
  const [scoreNotice, setScoreNotice] = useState("")

  async function request(path: string, init?: RequestInit) {
    const { data, error: sessionError } = await getSupabaseClient().auth.getSession()
    if (sessionError || !data.session?.access_token) throw new Error("Please sign in again to continue.")
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: { Accept: "application/json", Authorization: `Bearer ${data.session.access_token}`, ...init?.headers },
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message ?? "The request could not be completed.")
    return body
  }

  async function loadTasks() {
    try {
      setError("")
      const body = await request("/api/tasks")
      const loadedTasks = Array.isArray(body.data) ? body.data : []
      setTasks(loadedTasks)
      if (body.generation) {
        setGenerationProgress(body.generation)
        setGenerating(body.generation.status === "processing")
        if (generating && body.generation.status !== "processing") window.dispatchEvent(new Event("achievements-refresh"))
        if (body.generation.status === "failed") {
          setError("One or more pathways could not be generated. Use Regenerate choices to retry them.")
        }
      }
      if (loadedTasks.length === 0 && sessionStorage.getItem("healthTaskGenerationPending") === "true") {
        sessionStorage.removeItem("healthTaskGenerationPending")
        void generateTasks(false)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your health choices.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadTasks() }, [])

  useEffect(() => {
    if (!generating) return
    const timer = window.setInterval(() => { void loadTasks() }, 2500)
    return () => window.clearInterval(timer)
  }, [generating])

  async function generateTasks(force = false) {
    setGenerating(true)
    setError("")
    setScoreNotice("")
    try {
      const body = await request("/api/tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      })
      setGenerationProgress(body.generation ?? null)
      setGenerating(true)
    } catch (generateError) {
      setGenerating(false)
      setError(generateError instanceof Error ? generateError.message : "Unable to generate your choices.")
    }
  }

  async function completeTask(task: HealthTask) {
    if (task.completed_current_period) return
    setCompletingId(task.id)
    setError("")
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed_current_period: true } : item))
    try {
      const body = await request(`/api/tasks/${task.id}/complete`, { method: "POST" })
      setScoreNotice(`${body.category} increased to ${body.new_category_score}/100. Overall health is now ${body.new_overall_score}/100.`)
      const categoryColumn = `${String(body.category).toLowerCase()}_percentage`
      window.dispatchEvent(new CustomEvent("health-scores-updated", { detail: {
        [categoryColumn]: body.new_category_score,
        health_percentage: body.new_overall_score,
      } }))
      window.dispatchEvent(new Event("achievements-refresh"))
    } catch (completeError) {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed_current_period: false } : item))
      setError(completeError instanceof Error ? completeError.message : "Unable to complete this choice.")
    } finally {
      setCompletingId("")
    }
  }

  const visibleTasks = category === "All" ? tasks : tasks.filter((task) => task.category === category)
  const completedCount = tasks.filter((task) => task.completed_current_period).length

  return (
    <section className="flex flex-col rounded-3xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Health Choices</h2>
          <p className="text-sm text-muted-foreground">
            {completedCount}/{tasks.length} done this period
            {generating ? ` · Creating choices (${generationProgress?.completed ?? 0}/${generationProgress?.total || 6} pathways ready)...` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => void generateTasks(tasks.length > 0)} disabled={generating} className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {tasks.length ? "Regenerate choices" : "Generate my choices"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter health choices by pathway">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            aria-pressed={category === item}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              category === item
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-accent hover:text-foreground",
            )}
          >
            {item === "All" ? "Show all" : item}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {scoreNotice ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{scoreNotice}</p> : null}
      {loading ? <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading personalized choices...</div> : null}
      {!loading && tasks.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center"><p className="font-medium">Your personalized choices are ready to be created.</p><p className="mt-1 text-sm text-muted-foreground">Generate a plan based on your assessment and the health knowledge base.</p></div> : null}

      <div className="mt-4 flex flex-col gap-3">
        {visibleTasks.map((task) => (
          <div key={task.id} className={cn("flex items-start gap-4 rounded-2xl border border-border bg-card p-4 transition", task.completed_current_period && "bg-emerald-50/60") }>
            <Checkbox checked={task.completed_current_period} disabled={task.completed_current_period || completingId === task.id} onCheckedChange={() => completeTask(task)} aria-label={`Complete ${task.title}`} className="mt-1" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className={cn("font-medium text-foreground", task.completed_current_period && "line-through opacity-65")}>{task.title}</p>
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className={cn("rounded-full px-2 py-0.5 capitalize", task.impact_level === "high" ? "bg-emerald-100 text-emerald-800" : task.impact_level === "medium" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700")}>{task.impact_level}</span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 capitalize text-blue-700">{task.frequency}</span>
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">+{task.points_value} points</span>
                </div>
              </div>
              {task.description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{task.description}</p> : null}
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{task.category} Choices</span>
                {completingId === task.id ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><LoaderCircle className="size-3 animate-spin" /> Saving...</span> : task.completed_current_period ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><Check className="size-3" /> Completed</span> : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        Choices are personalized from your latest assessment and category-specific knowledge. Daily and weekly choices reset in their next period.
      </div>
    </section>
  )
}
