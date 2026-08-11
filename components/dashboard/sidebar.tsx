"use client"

import { useState } from "react"
import Link from "next/link"
import {
  LayoutGrid,
  Bot,
  Users,
  FileText,
  CalendarDays,
  Settings,
  HelpCircle,
  LogOut,
  Activity,
  Database,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCurrentUserRole } from "@/lib/use-current-user-role"

const nav = [
  { icon: LayoutGrid, label: "Dashboard" },
  { icon: Bot, label: "AI Chat" },
  { icon: Users, label: "Patients" },
  { icon: FileText, label: "Records" },
  { icon: CalendarDays, label: "Schedule" },
]

const footer = [
  { icon: Settings, label: "Settings", href: undefined },
  { icon: HelpCircle, label: "Help", href: undefined },
  { icon: LogOut, label: "Log out", href: "/login" },
]

type SidebarProps = {
  active?: string
  onNavigate?: (label: string) => void
  contained?: boolean
}

export function Sidebar({ active: controlledActive, onNavigate, contained = false }: SidebarProps) {
  const [localActive, setLocalActive] = useState("Dashboard")
  const { isAdmin } = useCurrentUserRole()
  const active = controlledActive ?? localActive

  function handleNavigate(label: string) {
    setLocalActive(label)
    onNavigate?.(label)
  }

  return (
    <aside
      className={cn(
        "scrollbar-hidden sticky flex w-16 shrink-0 self-start flex-col items-center overflow-y-auto rounded-[1.75rem] py-5 md:w-[72px]",
        contained
          ? "top-0 h-full max-h-full"
          : "top-3 h-[calc(100dvh-1.5rem)] md:top-5 md:h-[calc(100dvh-2.5rem)]",
      )}
      style={{ background: "linear-gradient(135deg, rgba(35,141,212,0.60) 0%, rgba(51,210,1,0.60) 100%)" }}
    >
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Activity className="size-6" strokeWidth={2.4} />
      </div>

      <nav className="mt-10 flex flex-1 flex-col items-center gap-3">
        {nav.map(({ icon: Icon, label }) => {
          const isActive = active === label
          return (
            <button
              key={label}
              type="button"
              onClick={() => handleNavigate(label)}
              title={label}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex size-11 items-center justify-center rounded-2xl transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/45 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-5" />
            </button>
          )
        })}
        {isAdmin ? (
          <Link
            href="/admin/knowledge"
            title="Knowledge Base"
            aria-label="Knowledge Base"
            className="flex size-11 items-center justify-center rounded-2xl text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <Database className="size-5" />
          </Link>
        ) : null}
      </nav>

      <div className="flex flex-col items-center gap-3">
        {footer.map(({ icon: Icon, label, href }) => {
          const className =
            "flex size-11 items-center justify-center rounded-2xl text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"

          if (href) {
            return (
              <Link key={label} href={href} title={label} aria-label={label} className={className}>
                <Icon className="size-5" />
              </Link>
            )
          }

          return (
            <button key={label} type="button" title={label} aria-label={label} className={className}>
              <Icon className="size-5" />
            </button>
          )
        })}
      </div>
    </aside>
  )
}
