"use client"

import { useEffect } from "react"
import type { LucideIcon } from "lucide-react"
import { Activity, Bell, CircleGauge, Database, HeartPulse, LogOut, Menu, Sparkles, Target, Users, X } from "lucide-react"

/**
 * Site-wide navigation. `LeftNav` is the fixed column on desktop and the
 * drawer body on smaller screens; `MobileNavDrawer` wraps it with an overlay,
 * and `MobileTopBar` is the sticky logo / title / hamburger strip that every
 * page shows below the xl breakpoint.
 */

export type SiteNavProps = {
  unread: number
  active: string
  isAdmin: boolean
  onNavigate: (label: string) => void
  onPremium: () => void
  onLogout: () => void
}

const navItems: Array<[LucideIcon, string, string?]> = [
  [CircleGauge, "Dashboard"],
  [Sparkles, "AI Chat"],
  [HeartPulse, "Health Assessment"],
  [Activity, "Pathway Progress"],
  [Target, "Health Choices"],
  [Bell, "Notifications"],
]

const itemClass = "flex w-full items-center gap-4 rounded-2xl px-5 py-3.5 text-left text-[15px] font-medium"
const idleItemClass = `${itemClass} text-[#687684] hover:bg-[#eef4fa]`

export function Brand() {
  return <div className="px-2"><img src="/health.png" alt="HealthiPhy.ai" className="h-auto w-[190px] object-contain object-left" /></div>
}

export function LeftNav({ unread, active, isAdmin, onNavigate, onPremium, onLogout, className = "", onClose }: SiteNavProps & { className?: string; onClose?: () => void }) {
  // On desktop the column is pinned to the viewport and scrolls internally, so it can never
  // stretch the page taller than the screen (which left a gap under the full-height chat).
  return <aside className={`scrollbar-hidden flex-col bg-white px-6 py-8 xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto xl:py-11 ${className}`}>
    <div className="flex items-center justify-between"><Brand />{onClose ? <button type="button" onClick={onClose} aria-label="Close navigation" className="grid size-10 place-items-center rounded-xl bg-[#eef4fa] text-[#687684]"><X className="size-5" /></button> : null}</div>
    <nav className="mt-8 space-y-2 xl:mt-12">
      {navItems.map(([Icon, label, badge]) => {
        const count = label === "Notifications" ? unread : badge
        const isActive = active === label
        return <button key={label} type="button" onClick={() => onNavigate(label)} aria-current={isActive ? "page" : undefined} className={isActive ? `${itemClass} bg-gradient-to-r from-[#238dd4] to-[#33d201] text-white shadow-sm` : idleItemClass}><Icon className="size-5" strokeWidth={1.8} /><span className="flex-1">{label}</span>{count ? <span className="rounded-full bg-[#8b5cf6] px-2 py-0.5 text-xs text-white">{count}</span> : null}</button>
      })}
      {isAdmin ? <>
        <button type="button" onClick={() => onNavigate("Knowledge Base")} className={idleItemClass}><Database className="size-5" strokeWidth={1.8} /><span>Knowledge Base</span></button>
        <button type="button" onClick={() => onNavigate("Users")} className={idleItemClass}><Users className="size-5" strokeWidth={1.8} /><span>All Users</span></button>
      </> : null}
    </nav>
    <div className="mt-8 rounded-3xl bg-gradient-to-br from-[#238dd4] to-[#33d201] p-5 text-white shadow-lg shadow-[#238dd4]/10 xl:mt-auto"><Sparkles className="size-8" /><p className="mt-6 text-sm leading-6 xl:mt-16">Unlock deeper insights with the <b>Premium Health Assessment</b>.</p><button type="button" onClick={onPremium} className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#238dd4]">Start Premium</button></div>
    <button type="button" onClick={onLogout} className="mt-8 flex items-center gap-4 rounded-2xl bg-[#eef4fa] px-5 py-4 text-[#687684]"><LogOut className="size-5" />Logout</button>
  </aside>
}

export function MobileNavDrawer({ open, onClose, ...navProps }: SiteNavProps & { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") onClose() }
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [open, onClose])

  if (!open) return null
  return <div className="fixed inset-0 z-[80] xl:hidden">
    <button type="button" onClick={onClose} aria-label="Close navigation" className="absolute inset-0 bg-[#102331]/45 backdrop-blur-[2px]" />
    <LeftNav {...navProps} onClose={onClose} className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-200" />
  </div>
}

export function MobileTopBar({ title, unread = 0, onOpenMenu, className = "" }: { title: string; unread?: number; onOpenMenu: () => void; className?: string }) {
  return <div className={`flex h-14 items-center justify-between border-b border-[#e2eaf1] bg-white px-4 ${className}`}>
    <img src="/health.png" alt="HealthiPhy.ai" className="h-8 w-28 object-contain object-left" />
    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-bold text-[#292a34]">{title}</span>
    <button type="button" onClick={onOpenMenu} aria-label="Open navigation" className="relative grid size-10 place-items-center rounded-xl bg-[#eef4fa] text-[#52636f]">
      <Menu className="size-5" />
      {unread ? <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#8b5cf6] px-1 text-[10px] text-white">{unread}</span> : null}
    </button>
  </div>
}
