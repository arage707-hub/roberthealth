"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Search, Sun, Moon, Mail, Bell } from "lucide-react"
import { UserAvatar } from "./user-avatar"
import { cn } from "@/lib/utils"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { AchievementSummary } from "@/lib/achievement-types"
import { AchievementBadge } from "@/components/dashboard/achievement-badge"

const apiBaseUrl = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "https://aiprocess.trippinweb.com").replace(/\/$/, "")

export function TopBar({ achievements, onAchievementsChange }: { achievements: AchievementSummary | null; onAchievementsChange: (summary: AchievementSummary) => void }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => setMounted(true), [])

  const dark = mounted && resolvedTheme === "dark"
  const fullName = [achievements?.profile.first_name, achievements?.profile.last_name].filter(Boolean).join(" ") || "Health Member"

  async function openNotifications() {
    setNotificationsOpen((open) => !open)
    if (!notificationsOpen && achievements?.unread_notifications) {
      const { data } = await getSupabaseClient().auth.getSession()
      if (data.session?.access_token) {
        await fetch(`${apiBaseUrl}/api/notifications/read`, { method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}` } })
        onAchievementsChange({ ...achievements, unread_notifications: 0, notifications: achievements.notifications.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })) })
      }
    }
  }

  return (
    <header className="flex flex-wrap items-center gap-4">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search"
          aria-label="Search"
          className="h-11 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Sun className="size-4 text-warning" />
          <button
            type="button"
            role="switch"
            aria-checked={dark}
            aria-label="Toggle theme"
            onClick={() => setTheme(dark ? "light" : "dark")}
            className="relative h-6 w-11 rounded-full bg-accent transition-colors"
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-primary transition-all",
                dark ? "left-[22px]" : "left-0.5",
              )}
            />
          </button>
          <Moon className="size-4 text-muted-foreground" />
        </div>

        <span className="hidden h-8 w-px bg-border sm:block" />

        <button
          type="button"
          aria-label="Messages"
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Mail className="size-5" />
        </button>
        <div className="relative">
          <button type="button" aria-label="Notifications" onClick={openNotifications} className="relative flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Bell className="size-5" />
            {achievements?.unread_notifications ? <span className="absolute right-1 top-0 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">{achievements.unread_notifications}</span> : null}
          </button>
          {notificationsOpen ? <div className="absolute right-0 top-12 z-50 max-h-96 w-80 overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-xl">
            <p className="px-2 py-1 text-sm font-bold">Notifications</p>
            {achievements?.notifications.length ? achievements.notifications.map((item) => <div key={item.id} className="border-b border-border px-2 py-3 last:border-0"><p className="text-sm font-semibold">{item.title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.message}</p></div>) : <p className="px-2 py-4 text-sm text-muted-foreground">No notifications yet.</p>}
          </div> : null}
        </div>

        <span className="hidden h-8 w-px bg-border sm:block" />

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-foreground">{fullName}</p>
            <p className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              Online
            </p>
          </div>
          <button type="button" onClick={() => setProfileOpen((open) => !open)} className="relative" aria-label="Open profile badges"><UserAvatar name={fullName} size={42} />
            {profileOpen ? <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-border bg-card p-4 text-left shadow-xl"><p className="font-bold">{fullName}</p><p className="text-xs text-muted-foreground">{achievements ? `${achievements.login_streak}-day login streak` : "Loading profile..."}</p><div className="mt-4 flex flex-wrap gap-4">{achievements === null ? [1, 2, 3].map((item) => <span key={item} className="size-14 animate-pulse rounded-full bg-muted" />) : achievements.badges.length ? achievements.badges.map((badge) => <span key={badge.code} title={badge.description} className="flex flex-col items-center gap-1"><AchievementBadge code={badge.code} name={badge.name} unlocked compact /><span className="text-[10px] font-semibold">{badge.name}</span></span>) : <span className="text-xs text-muted-foreground">Complete milestones to unlock badges.</span>}</div></div> : null}
          </button>
        </div>
      </div>
    </header>
  )
}
