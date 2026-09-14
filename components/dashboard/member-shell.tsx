"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { AuthGate } from "@/components/auth/auth-gate"
import { LeftNav, MobileNavDrawer, MobileTopBar } from "@/components/dashboard/site-nav"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useCurrentUserRole } from "@/lib/use-current-user-role"
import type { AchievementSummary } from "@/lib/achievement-types"
import { apiBaseUrl } from "@/lib/config"

/**
 * Frame for secondary member pages (Biometrics, and any future page that isn't the home
 * dashboard): same left column, mobile drawer, top strip, and palette as the dashboard.
 */
export type MemberShellProps = {
  /** Which left-nav entry is highlighted. */
  active: string
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

/** Navigation shared by every page that renders the left nav. */
export function useSiteNavigation(setMenuOpen?: (open: boolean) => void) {
  const router = useRouter()

  function startAssessment(premium = false) {
    localStorage.setItem("healthAssessmentCompleted", "false")
    router.push(premium ? "/health-assessment?premium=1" : "/health-assessment")
  }

  function navigate(label: string) {
    setMenuOpen?.(false)
    if (label === "Biometrics") return router.push("/biometrics")
    if (label === "Health Choices") return router.push("/health-choices")
    if (label === "Health Assessment") return startAssessment(false)
    if (label === "Knowledge Base") return router.push("/admin/knowledge")
    if (label === "Products") return router.push("/admin/products")
    if (label === "Users") return router.push("/admin/users")
    // Dashboard, AI Chat, Pathway Progress and Notifications live on the home page.
    sessionStorage.setItem("dashboardNavigate", label)
    router.push("/")
  }

  async function logout() {
    await getSupabaseClient().auth.signOut()
    router.replace("/login")
  }

  return { navigate, startAssessment, logout }
}

function MemberFrame({ active, title, subtitle, actions, children }: MemberShellProps) {
  const { isAdmin } = useCurrentUserRole()
  const [menuOpen, setMenuOpen] = useState(false)
  const [achievements, setAchievements] = useState<AchievementSummary | null>(null)
  const [accountName, setAccountName] = useState("")
  const { navigate, startAssessment, logout } = useSiteNavigation(setMenuOpen)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const { data } = await getSupabaseClient().auth.getSession()
        const token = data.session?.access_token
        if (!token) return
        const metadata = data.session?.user.user_metadata as { first_name?: string; last_name?: string } | undefined
        if (alive) setAccountName([metadata?.first_name, metadata?.last_name].filter(Boolean).join(" "))
        const response = await fetch(`${apiBaseUrl}/api/achievements`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } })
        if (!response.ok || !alive) return
        setAchievements(await response.json() as AchievementSummary)
      } catch {
        // The nav still works without the unread badge.
      }
    }
    void load()
    return () => { alive = false }
  }, [])

  const fullName = useMemo(() => [achievements?.profile.first_name, achievements?.profile.last_name].filter(Boolean).join(" ") || accountName || "Health Member", [achievements, accountName])
  const navProps = { unread: achievements?.unread_notifications ?? 0, active, isAdmin, onNavigate: navigate, onPremium: () => startAssessment(true), onLogout: () => void logout() }

  return (
    <div className="min-h-screen bg-white text-[#292a34]">
      <MobileNavDrawer {...navProps} open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[266px_minmax(0,1fr)]">
        <LeftNav {...navProps} className="hidden xl:flex" />

        <main className="min-w-0 bg-[#f3f7fb] px-4 pb-10 pt-0 sm:px-6 xl:px-[33px] xl:py-8">
          <MobileTopBar title={title} unread={navProps.unread} onOpenMenu={() => setMenuOpen(true)} className="sticky top-0 z-40 -mx-4 mb-5 sm:-mx-6 sm:px-6 xl:hidden" />

          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#238dd4]">{fullName}</p>
              <h1 className="mt-1 text-2xl font-bold xl:text-[28px]">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-[#9a9ba1]">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{actions}</div> : null}
          </header>

          <div className="mt-6 min-w-0">{children}</div>

          <footer className="mt-10 flex flex-col items-center gap-3 text-center text-xs text-[#8e8f95] xl:flex-row xl:gap-8 xl:text-left">
            <b className="text-[#238dd4]">Copyright © 2026 HealthiPhy.ai</b>
            <span className="flex flex-wrap justify-center gap-x-6 gap-y-1 xl:gap-8"><span>Privacy Policy</span><span>Terms and conditions</span><span>Contact</span></span>
          </footer>
        </main>
      </div>
    </div>
  )
}

export function MemberShell(props: MemberShellProps) {
  return <AuthGate><MemberFrame {...props} /></AuthGate>
}
