import { ArrowUpRight, UserRound, Users, Award } from "lucide-react"
import type { AchievementSummary } from "@/lib/achievement-types"
import { AchievementBadge } from "@/components/dashboard/achievement-badge"

function CardShell({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col rounded-3xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent text-primary">
            {icon}
          </span>
          <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        </div>
        <button
          type="button"
          aria-label={`Open ${title} details`}
          className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowUpRight className="size-4" />
        </button>
      </div>
      {children}
    </div>
  )
}

function Delta({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-semibold text-success">
      <ArrowUpRight className="size-3" />
      {value}
    </span>
  )
}

const allBadges = [
  { code: "starter", name: "Starter" },
  { code: "on_track", name: "On Track" },
  { code: "analyst", name: "Analyst" },
  { code: "optimized", name: "Optimized" },
  { code: "health_champion", name: "Health Champion" },
  { code: "ultimate", name: "Ultimate" },
]

export function StatCards({ achievements }: { achievements: AchievementSummary | null }) {
  const earned = new Set(achievements?.badges.map((badge) => badge.name) ?? [])
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <CardShell icon={<UserRound className="size-5" />} title="Body Score">
        <div className="flex items-start justify-between">
          <p className="text-4xl font-bold tracking-tight text-foreground">72</p>
          <div className="text-right">
            <Delta value="16.9%" />
            <p className="mt-1 text-xs text-muted-foreground">vs. last month</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Overall health score based on questionnaire results and recent activity.
        </p>
      </CardShell>

      <CardShell icon={<Users className="size-5" />} title="Active Users">
        <div className="flex items-start justify-between">
          <p className="text-4xl font-bold tracking-tight text-foreground">10,000+</p>
          <div className="text-right">
            <Delta value="12.9%" />
            <p className="mt-1 text-xs text-muted-foreground">vs. last month</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">People transforming their health daily.</p>
      </CardShell>

      <CardShell icon={<Award className="size-5" />} title="Achievement Badges">
        {achievements === null ? (
          <div role="status" aria-label="Loading achievement badges" className="grid grid-cols-3 gap-x-2 gap-y-4">
            {allBadges.map((badge) => (
              <div key={badge.code} className="flex animate-pulse flex-col items-center">
                <span className="size-[78px] rounded-full bg-muted" />
                <span className="mt-2 h-2.5 w-14 rounded-full bg-muted" />
              </div>
            ))}
            <span className="sr-only">Loading badges...</span>
          </div>
        ) : (
        <div className="grid grid-cols-3 gap-x-2 gap-y-4">
          {allBadges.map((badge) => {
            const progress = achievements?.badge_progress?.[badge.code]
            const unlocked = earned.has(badge.name)
            return <span key={badge.code} tabIndex={0} className="group relative outline-none">
              <span className="inline-flex cursor-help"><AchievementBadge code={badge.code} name={badge.name} unlocked={unlocked} /></span>
              <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 hidden w-64 -translate-x-1/2 rounded-xl border border-border bg-popover p-3 text-left text-popover-foreground shadow-xl group-hover:block group-focus:block">
                <span className="block text-sm font-bold">{badge.name}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{progress?.requirement ?? "Loading badge requirement..."}</span>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${progress?.percentage ?? 0}%` }} /></span>
                <span className="mt-1.5 block text-xs font-semibold">{progress?.progress_text ?? "Checking progress..."} ({progress?.percentage ?? 0}%)</span>
              </span>
            </span>
          })}
        </div>
        )}
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{achievements ? `${achievements.badges.length}/${allBadges.length} unlocked · ${achievements.login_streak}-day login streak` : "Loading your achievement progress..."}</p>
      </CardShell>
    </div>
  )
}
