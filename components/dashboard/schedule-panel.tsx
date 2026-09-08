"use client"

import { ChevronLeft, ChevronRight, Apple, Shield, Brain, Activity, Dna, Stethoscope } from "lucide-react"
import { useRouter } from "next/navigation"
import { UserAvatar } from "./user-avatar"
import {
  calendarDays,
  weekDays,
  hospitalSchedule,
  type ScheduleStatus,
  type CalendarDay,
} from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"
import { useLatestAssessment, type AssessmentPercentages } from "@/lib/use-latest-assessment"

const statusColor: Record<ScheduleStatus, string> = {
  Available: "text-success",
  Overbooked: "text-warning",
  "No slots available": "text-muted-foreground",
}

function dayClasses(state: CalendarDay["state"]) {
  switch (state) {
    case "full":
      return "bg-primary text-primary-foreground"
    case "partial":
      return "bg-gradient-to-br from-chart-2/50 to-chart-1/40 text-foreground"
    case "muted":
      return "bg-muted text-muted-foreground/40"
    default:
      return "border border-border text-foreground"
  }
}

type SchedulePanelProps = {
  contained?: boolean
}

export function SchedulePanel({ contained = false }: SchedulePanelProps) {
  const router = useRouter()
  const { assessment, loading } = useLatestAssessment()

  function startAssessment(premium = false) {
    localStorage.setItem("healthAssessmentCompleted", "false")
    if (premium) {
      router.push("/health-assessment?premium=1")
    } else {
      router.push("/health-assessment")
    }
  }

  function scoreLevel(score: number) {
    if (score < 50) return "low"
    if (score < 75) return "medium"
    return "good"
  }

  const pathwayBoxes = [
    { key: "nutrition", name: "Nutrition Choices", column: "nutrition_percentage" },
    { key: "toxin", name: "Toxin Choices", column: "toxin_percentage" },
    { key: "mental", name: "Mental Choices", column: "mental_percentage" },
    { key: "physical", name: "Physical Choices", column: "physical_percentage" },
    { key: "genetic", name: "Genetic Choices", column: "genetic_percentage" },
    { key: "medical", name: "Medical Choices", column: "medical_percentage" },
  ].map((pathway) => {
    const score = assessment?.[pathway.column as keyof AssessmentPercentages]
    return {
      ...pathway,
      subtitle: typeof score === "number" ? `Score ${score}/100` : loading ? "Loading score..." : "No score available",
      level: typeof score === "number" ? scoreLevel(score) : "",
    }
  })

  const iconMap: Record<string, any> = {
    nutrition: Apple,
    toxin: Shield,
    mental: Brain,
    physical: Activity,
    genetic: Dna,
    medical: Stethoscope,
  }

  return (
    <aside
      className={cn(
        "scrollbar-hidden flex flex-col gap-3 overflow-y-auto rounded-[1.75rem] p-3 text-sidebar-foreground",
        contained
          ? "md:sticky md:top-0 md:h-full md:max-h-full"
          : "sticky top-3 max-h-[calc(100dvh-1.5rem)] md:top-5 md:max-h-[calc(100dvh-2.5rem)]",
      )}
      style={{ background: "linear-gradient(135deg, rgba(35,141,212,0.60) 0%, rgba(51,210,1,0.60) 100%)" }}
    >
      {/* Top toolbar for actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => startAssessment(false)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-transparent px-3 py-1 text-sm font-medium text-foreground hover:bg-accent"
        >
          Redo assessment
        </button>
        <button
          type="button"
          onClick={() => startAssessment(true)}
          className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-1 text-sm font-semibold text-black"
        >
          Premium assessment
        </button>
      </div>

      {/* Calendar card */}
      <div className="rounded-3xl bg-card p-3 text-card-foreground">
        <h2 className="mb-2 text-base font-semibold">Schedule</h2>
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-semibold">April</span>
          <button
            type="button"
            aria-label="Next month"
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-2 text-center">
          {weekDays.map((d) => (
            <span key={d} className="text-xs font-medium text-muted-foreground">
              {d}
            </span>
          ))}
          {calendarDays.map((d, i) => (
            <div key={i} className="flex justify-center">
              <span
                className={cn(
                  "flex aspect-square w-full max-w-9 items-center justify-center rounded-full text-xs font-medium",
                  dayClasses(d.state),
                )}
              >
                {d.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily tasks list */}
      <div className="flex min-h-0 flex-1 flex-col px-1">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Personalized pathway insights</h3>
          {assessment ? (
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-foreground">
              Overall {assessment.health_percentage}/100
            </span>
          ) : null}
        </div>
        <ul className="flex flex-col gap-2">
          {pathwayBoxes.map((s) => {
            const Icon = iconMap[s.key]
            return (
              <li key={s.key}>
                <div className="relative flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/5">
                    {Icon ? <Icon className="size-5 text-foreground" /> : null}
                  </div>

                  <div className="min-w-0 flex-1 pr-16">
                    <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.subtitle}</p>

                    <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
                      <span className="hidden">&nbsp;</span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                          s.level === "low"
                            ? "bg-rose-100 text-rose-800"
                            : s.level === "medium"
                              ? "bg-amber-100 text-amber-800"
                              : s.level === "good"
                                ? "bg-emerald-100 text-emerald-800"
                                : "hidden",
                        )}
                      >
                        {s.level ? s.level[0].toUpperCase() + s.level.slice(1) : ""}
                      </span>
                    </div>
                  </div>

                  <div className="hidden">
                    <button className="text-muted-foreground hover:text-foreground">⋯</button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

      </div>
    </aside>
  )
}
