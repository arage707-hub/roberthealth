"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { TopBar } from "@/components/dashboard/top-bar"
import { StatCards } from "@/components/dashboard/stat-cards"
import { PatientsStatistics } from "@/components/dashboard/patients-statistics"
import { WorkingHours } from "@/components/dashboard/working-hours"
import { AppointmentsTable } from "@/components/dashboard/appointments-table"
import { SchedulePanel } from "@/components/dashboard/schedule-panel"
import { AiChat } from "@/components/dashboard/ai-chat"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { AchievementSummary } from "@/lib/achievement-types"
import { apiBaseUrl } from "@/lib/config"

export function DashboardPage() {
  const router = useRouter()
  const [showAssessmentPrompt, setShowAssessmentPrompt] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [activeView, setActiveView] = useState("Dashboard")
  const [submissionConfirmed, setSubmissionConfirmed] = useState(false)
  const [achievements, setAchievements] = useState<AchievementSummary | null>(null)
  const [badgeCelebration, setBadgeCelebration] = useState("")

  async function loadAchievements() {
    try {
      const { data } = await getSupabaseClient().auth.getSession()
      if (!data.session?.access_token) return
      const response = await fetch(`${apiBaseUrl}/api/achievements`, { headers: { Authorization: `Bearer ${data.session.access_token}` } })
      if (!response.ok) return
      const summary = await response.json() as AchievementSummary
      setAchievements(summary)
      setShowAssessmentPrompt(!summary.has_completed_assessment)
      if (summary.newly_earned.length) setBadgeCelebration(summary.newly_earned.map((badge) => badge.name).join(", "))
    } finally {
      setIsHydrated(true)
    }
  }

  useEffect(() => {
    void loadAchievements()
    if (sessionStorage.getItem("assessmentSubmissionConfirmed") === "true") {
      sessionStorage.removeItem("assessmentSubmissionConfirmed")
      setSubmissionConfirmed(true)
    }
  }, [])

  useEffect(() => {
    const refresh = () => { void loadAchievements() }
    window.addEventListener("achievements-refresh", refresh)
    return () => window.removeEventListener("achievements-refresh", refresh)
  }, [])

  function handleStartAssessment() {
    localStorage.setItem("healthAssessmentCompleted", "false")
    router.push("/health-assessment")
  }

  return (
    <div className="relative">
      <div className={showAssessmentPrompt ? "filter blur-sm transition-all duration-300" : ""}>
        <div className="min-h-dvh md:h-dvh md:overflow-hidden md:p-5">
          <div className="mx-auto flex min-h-dvh max-w-[1600px] gap-4 bg-secondary/40 p-3 md:h-full md:min-h-0 md:overflow-hidden md:rounded-[2rem] md:p-4">
            {/* Icon rail is desktop-only; phones use the MobileHeader menu instead */}
            <div className="hidden md:contents">
              <Sidebar active={activeView} onNavigate={setActiveView} contained />
            </div>

            <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-5 md:h-full md:overflow-hidden xl:grid-cols-[1fr_360px]">
              {/* Main column */}
              <main className={`scrollbar-hidden flex min-h-0 min-w-0 flex-col gap-5 md:h-full ${activeView === "AI Chat" ? "overflow-hidden" : "md:overflow-y-auto md:pr-1"}`}>
                <TopBar achievements={achievements} onAchievementsChange={setAchievements} />
                {activeView === "AI Chat" ? (
                  <AiChat />
                ) : (
                  <>
                    <StatCards achievements={achievements} />
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
                      <PatientsStatistics />
                      <WorkingHours />
                    </div>
                    <AppointmentsTable />
                  </>
                )}
              </main>

              {/* Schedule sidebar: sticky column on desktop, stacked card on phones */}
              <div className={`min-h-0 min-w-0 md:h-full md:overflow-hidden ${activeView === "AI Chat" ? "hidden md:block" : ""}`}>
                <SchedulePanel contained />
              </div>

              {activeView !== "AI Chat" ? (
                <footer className="pb-2 pt-1 text-center text-xs text-muted-foreground md:hidden">
                  <p>Copyright © {new Date().getFullYear()} HealthiPhy.ai</p>
                  <nav className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
                    <a href="#" className="hover:text-foreground">Privacy Policy</a>
                    <a href="#" className="hover:text-foreground">Term and conditions</a>
                    <a href="#" className="hover:text-foreground">Contact</a>
                  </nav>
                </footer>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isHydrated && showAssessmentPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-[2rem] border border-border bg-card p-0 shadow-2xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left image */}
              <div className="h-72 md:h-auto">
                <img src="/nut-female.jpg" alt="Assessment" className="h-full w-full object-cover" />
              </div>

              {/* Right content */}
              <div className="flex flex-col p-6 md:p-8">
                <div className="flex">
                  <img src="/health.png" alt="healthiphy" className="h-12 w-auto rounded-md object-contain" />
                </div>

                <div className="mt-4 flex-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/90">Action required</p>
                  <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Complete your health assessment
                  </h1>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    Before you continue, please complete the assessment to help us personalize your dashboard insights.
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-start">
                  <button
                    type="button"
                    onClick={handleStartAssessment}
                    className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Yes, take assessment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {submissionConfirmed ? (
        <div role="status" className="fixed right-4 top-4 z-[60] flex max-w-sm items-center gap-3 rounded-2xl border border-success/25 bg-card px-4 py-3 text-sm font-medium text-card-foreground shadow-xl">
          <CheckCircle2 className="size-5 shrink-0 text-success" />
          <span>Your assessment and all answers were submitted successfully.</span>
          <button type="button" onClick={() => setSubmissionConfirmed(false)} aria-label="Dismiss confirmation" className="ml-2 text-lg leading-none text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>
      ) : null}

      {badgeCelebration ? (
        <div role="status" className="fixed bottom-5 left-1/2 z-[70] w-[min(92vw,430px)] -translate-x-1/2 rounded-2xl border border-amber-300 bg-card p-5 text-center shadow-2xl">
          <p className="text-3xl">🏆</p><p className="mt-2 font-bold text-foreground">Congratulations!</p>
          <p className="mt-1 text-sm text-muted-foreground">You unlocked: {badgeCelebration}</p>
          <button type="button" onClick={() => setBadgeCelebration("")} className="mt-3 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">Continue</button>
        </div>
      ) : null}
    </div>
  )
}
