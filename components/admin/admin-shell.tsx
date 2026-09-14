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
 * Shared frame for the admin pages so they look and navigate exactly like the
 * member dashboard: same left column, mobile drawer, top strip, and palette.
 */

// Dashboard palette, kept in one place so admin pages match the home page.
export const adminTheme = {
  ink: "#292a34",
  muted: "#9a9ba1",
  subtle: "#687684",
  blue: "#238dd4",
  green: "#33d201",
  lime: "#dff8d7",
  sky: "#dcebfb",
  lavender: "#eee7ff",
  panel: "#f3f7fb",
  line: "#eef1f4",
}

export const card = "rounded-[20px] bg-white p-5 shadow-sm shadow-[#238dd4]/5"
export const primaryButton = "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#238dd4] to-[#33d201] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
export const softButton = "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#eef4fa] px-4 py-2.5 text-sm font-semibold text-[#238dd4] transition hover:bg-[#dcebfb] disabled:opacity-60"
export const chipButton = "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition disabled:opacity-50"
export const input = "w-full rounded-2xl bg-white px-4 py-3 text-sm text-[#292a34] shadow-sm shadow-[#238dd4]/5 outline-none ring-1 ring-transparent placeholder:text-[#98999f] focus:ring-[#238dd4]/40"
export const tableHead = "bg-[#f3f7fb] text-[11px] uppercase tracking-wide text-[#8e8f95]"

export type AdminShellProps = {
  /** Which left-nav entry is highlighted. */
  active: "Knowledge Base" | "Products" | "Users"
  /** Title shown in the mobile top strip and the page header. */
  title: string
  subtitle?: string
  /** Optional controls rendered to the right of the page header. */
  actions?: ReactNode
  /** Optional row rendered above the header (e.g. a back link). */
  breadcrumb?: ReactNode
  children: ReactNode
}

function AdminFrame({ active, title, subtitle, actions, breadcrumb, children }: AdminShellProps) {
  const router = useRouter()
  const { isAdmin, loading: roleLoading } = useCurrentUserRole()
  const [menuOpen, setMenuOpen] = useState(false)
  const [achievements, setAchievements] = useState<AchievementSummary | null>(null)
  const [accountName, setAccountName] = useState("")

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

  const fullName = useMemo(() => [achievements?.profile.first_name, achievements?.profile.last_name].filter(Boolean).join(" ") || accountName || "Administrator", [achievements, accountName])

  function startAssessment(premium = false) {
    localStorage.setItem("healthAssessmentCompleted", "false")
    router.push(premium ? "/health-assessment?premium=1" : "/health-assessment")
  }

  function navigate(label: string) {
    setMenuOpen(false)
    if (label === "Knowledge Base") return router.push("/admin/knowledge")
    if (label === "Products") return router.push("/admin/products")
    if (label === "Users") return router.push("/admin/users")
    if (label === "Health Choices") return router.push("/health-choices")
    if (label === "Biometrics") return router.push("/biometrics")
    if (label === "Health Assessment") return startAssessment(false)
    // Dashboard, AI Chat, Pathway Progress and Notifications live on the home page.
    sessionStorage.setItem("dashboardNavigate", label)
    router.push("/")
  }

  async function logout() {
    await getSupabaseClient().auth.signOut()
    router.replace("/login")
  }

  const navProps = { unread: achievements?.unread_notifications ?? 0, active, isAdmin, onNavigate: navigate, onPremium: () => startAssessment(true), onLogout: () => void logout() }

  return (
    <div className="min-h-screen bg-white text-[#292a34]">
      <MobileNavDrawer {...navProps} open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[266px_minmax(0,1fr)]">
        <LeftNav {...navProps} className="hidden xl:flex" />

        <main className="min-w-0 bg-[#f3f7fb] px-4 pb-10 pt-0 sm:px-6 xl:px-[33px] xl:py-8">
          <MobileTopBar title={title} unread={navProps.unread} onOpenMenu={() => setMenuOpen(true)} className="sticky top-0 z-40 -mx-4 mb-5 sm:-mx-6 sm:px-6 xl:hidden" />

          {breadcrumb ? <div className="mb-4">{breadcrumb}</div> : null}

          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#238dd4]">Admin · {fullName}</p>
              <h1 className="mt-1 text-2xl font-bold xl:text-[28px]">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-[#9a9ba1]">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{actions}</div> : null}
          </header>

          {!roleLoading && !isAdmin ? (
            <p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Your account does not have administrator access. Actions on this page will be rejected.</p>
          ) : null}

          <div className="mt-6">{children}</div>

          <footer className="mt-10 flex flex-col items-center gap-3 text-center text-xs text-[#8e8f95] xl:flex-row xl:gap-8 xl:text-left">
            <b className="text-[#238dd4]">Copyright © 2026 HealthiPhy.ai</b>
            <span className="flex flex-wrap justify-center gap-x-6 gap-y-1 xl:gap-8"><span>Privacy Policy</span><span>Terms and conditions</span><span>Contact</span></span>
          </footer>
        </main>
      </div>
    </div>
  )
}

export function AdminShell(props: AdminShellProps) {
  return <AuthGate><AdminFrame {...props} /></AuthGate>
}
