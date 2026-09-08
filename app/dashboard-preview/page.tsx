"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  Activity, Bell, ChevronDown, ChevronLeft, ChevronRight,
  Brain, Dna, HeartPulse, ShieldAlert, Stethoscope,
  MoreHorizontal, Search, Sparkles,
  Target, Utensils, Zap,
} from "lucide-react"
import { AuthGate } from "@/components/auth/auth-gate"
import { AiChat } from "@/components/dashboard/ai-chat"
import { LeftNav, MobileNavDrawer, MobileTopBar } from "@/components/dashboard/site-nav"
import { AchievementBadge } from "@/components/dashboard/achievement-badge"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { AssessmentPercentages } from "@/lib/use-latest-assessment"
import { useCurrentUserRole } from "@/lib/use-current-user-role"
import type { AchievementSummary } from "@/lib/achievement-types"
import { useDashboardData, type DashboardData as PreviewData, type HealthTask } from "@/lib/use-dashboard-data"
import { categoryFor, healthCategories } from "@/lib/health-categories"

const lime = "#dff8d7"
const yellow = "#dcebfb"
const orange = "#eee7ff"
const ink = "#292a34"

const allBadges = [
  { code: "starter", name: "Starter" },
  { code: "on_track", name: "On Track" },
  { code: "analyst", name: "Analyst" },
  { code: "optimized", name: "Optimized" },
  { code: "health_champion", name: "Health Champion" },
  { code: "ultimate", name: "Ultimate" },
]

function MiniCard({ title, value, unit, icon: Icon, kind, progress, achievements }: { title: string; value: string; unit: string; icon: LucideIcon; kind: "gauge" | "bar" | "streak" | "badges"; progress: number; achievements?: AchievementSummary | null }) {
  const safeProgress = Math.max(0, Math.min(100, progress))
  const earned = new Set(achievements?.badges.map((badge) => badge.name) ?? [])
  const visual = kind === "gauge" ? <div className="relative mt-1 h-[62px] rounded-lg bg-[#f5f8fb] px-2 pt-4"><div className="preview-ruler h-7" /><span className="absolute top-0 size-4 -translate-x-1/2 rounded-full bg-[#238dd4] shadow-[0_0_0_2px_white]" style={{ left: `${safeProgress}%` }} /><span className="absolute top-3 h-6 w-0.5 -translate-x-1/2 bg-[#238dd4]" style={{ left: `${safeProgress}%` }} /><div className="absolute inset-x-2 bottom-1 flex justify-between text-[10px] text-[#98999e]"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div></div>
    : kind === "bar" ? <><div className="mt-3 flex h-7 overflow-hidden rounded-lg bg-[#dff8d7]"><span className="rounded-lg bg-[#238dd4]" style={{ width: `${safeProgress}%` }} /><span className="preview-stripes flex-1 bg-[#33d201]" /></div><div className="mt-4 flex justify-between text-xs"><b>{safeProgress}%</b><span className="text-[#999a9f]">this period</span></div></>
      : kind === "streak" ? <div className="mt-1 flex h-[66px] items-end justify-between px-2">{[1, 2, 3, 4, 5, 6, 7, 8].map((day, index) => <i key={day} className={`preview-sleep-bar relative w-1.5 rounded-full ${index === 7 ? "bg-[#238dd4]" : "bg-[#33d201]"}`} style={{ height: 18 + Math.min(safeProgress, day * 12) / 2 }} />)}</div>
        : <div className="mt-2 grid h-[62px] grid-cols-6 items-center gap-0.5 rounded-xl bg-[#f5f8fb] px-1">{allBadges.map((badge) => { const badgeProgress = achievements?.badge_progress?.[badge.code]; const unlocked = earned.has(badge.name); return <span key={badge.code} tabIndex={0} className="group relative mx-auto block size-8 outline-none"><span className="absolute left-1/2 top-1/2 inline-flex origin-center -translate-x-1/2 -translate-y-1/2 scale-[0.52] cursor-help"><AchievementBadge code={badge.code} name={badge.name} unlocked={unlocked} compact /></span><span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 hidden w-64 -translate-x-1/2 rounded-xl border border-border bg-popover p-3 text-left text-popover-foreground shadow-xl group-hover:block group-focus:block"><span className="block text-sm font-bold">{badge.name}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{badgeProgress?.requirement ?? "Loading badge requirement..."}</span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${badgeProgress?.percentage ?? 0}%` }} /></span><span className="mt-1.5 block text-xs font-semibold">{badgeProgress?.progress_text ?? "Checking progress..."} ({badgeProgress?.percentage ?? 0}%)</span></span></span> })}</div>

  return <article className="h-[169px] rounded-[20px] bg-white p-5 shadow-sm shadow-[#238dd4]/5"><div className="flex items-center justify-between"><h3 className="text-[15px]">{title}</h3><span className="grid size-8 place-items-center rounded-xl bg-[#dff8d7] text-[#238dd4]"><Icon className="size-4" /></span></div><p className="mt-2 text-xl font-bold">{value} <span className="text-sm font-normal text-[#99999f]">{unit}</span></p>{visual}</article>
}

function SummaryCards({ data }: { data: PreviewData }) {
  const score = data.assessment?.health_percentage ?? 0
  const completed = data.tasks.filter((task) => task.completed_current_period).length
  const completion = data.tasks.length ? Math.round((completed / data.tasks.length) * 100) : 0
  const earnedBadges = data.achievements?.badges.length ?? 0
  const totalBadges = allBadges.length
  return <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:mt-7 xl:grid-cols-4 xl:gap-[19px]">
    <MiniCard title="Health Score" value={data.loading ? "—" : String(score)} unit="/100" icon={HeartPulse} kind="gauge" progress={score} />
    <MiniCard title="Health Choices" value={data.loading ? "—" : String(completed)} unit={`/ ${data.tasks.length}`} icon={Target} kind="bar" progress={completion} />
    <MiniCard title="Login Streak" value={data.loading ? "—" : String(data.achievements?.login_streak ?? 0)} unit="days" icon={Zap} kind="streak" progress={(data.achievements?.login_streak ?? 0) * 12.5} />
    <MiniCard title="Achievements" value={data.loading ? "—" : String(earnedBadges)} unit={`/ ${totalBadges}`} icon={Sparkles} kind="badges" progress={Math.round((earnedBadges / totalBadges) * 100)} achievements={data.achievements} />
  </section>
}

function WeightChart({ score }: { score: number }) {
  const arc = Math.max(0, Math.min(100, score))
  return <article className="rounded-[20px] bg-white p-5 lg:h-[367px]">
    <div className="flex items-center justify-between"><h2 className="font-bold">Overall Health</h2><MoreHorizontal className="size-5" /></div>
    <div className="relative mx-auto mt-5 h-[132px] w-[260px] overflow-hidden">
      <svg className="absolute inset-0" viewBox="0 0 260 145" aria-hidden>
        <defs><pattern id="weightHatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="12" fill="#33d201" /><rect x="7" width="3" height="12" fill="#fff" /></pattern></defs>
        <path d="M25 125 A105 105 0 0 1 235 125" fill="none" stroke="#eef4fa" strokeWidth="18" strokeLinecap="round" />
        <path d="M25 125 A105 105 0 0 1 235 125" fill="none" stroke={arc >= 70 ? "#33d201" : "#238dd4"} strokeWidth="18" strokeLinecap="round" pathLength="100" strokeDasharray={`${arc} 100`} />
      </svg>
      <p className="absolute inset-x-0 bottom-3 text-center text-3xl font-bold">{score}<span className="text-xl">%</span><small className="mt-2 block text-xs font-normal text-[#999a9f]">Current assessment</small></p>
    </div>
    <div className="flex justify-between px-3 text-[#8f9096]"><b>0</b><span className="text-xs">{Math.max(0, 100 - score)} points to optimal</span><b>100</b></div>
    <div className="mt-6 h-0.5 bg-gradient-to-r from-[#238dd4] to-[#33d201]" />
    <p className="mx-auto mt-4 max-w-[280px] text-center text-sm leading-6 text-[#6f7077]">Progress is progress, no matter how slow.<br />Keep going, you&apos;re getting closer to your goal every day! 🎉</p>
  </article>
}

function CalorieChart({ assessment }: { assessment: AssessmentPercentages | null }) {
  const score = assessment?.health_percentage ?? 0
  return <article className="rounded-[20px] bg-white p-5 lg:h-[367px]">
    <div className="flex items-center justify-between"><h2 className="font-bold">Assessment Pathways</h2><MoreHorizontal className="size-5" /></div>
    <div className="mt-4 grid grid-cols-1 items-center gap-6 md:grid-cols-[270px_1fr] md:gap-4">
      <div className="relative mx-auto grid size-[258px] place-items-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 260 260" aria-hidden>
          <circle cx="130" cy="130" r="108" fill="none" stroke="#f1f1f2" strokeWidth="16" />
          <circle cx="130" cy="130" r="94" fill="none" stroke="#33d201" strokeWidth="5" strokeDasharray="570 590" strokeLinecap="round" />
          <circle cx="130" cy="130" r="108" fill="none" stroke="#238dd4" strokeWidth="14" pathLength="100" strokeDasharray={`${score} 100`} strokeLinecap="round" />
        </svg>
        <div className="relative text-center"><HeartPulse className="mx-auto size-8 text-[#238dd4]" /><p className="mt-3 text-2xl font-bold">{score}/100</p><p className="mt-2 text-sm text-[#9b9ca1]">Overall health</p></div>
      </div>
      <div><div className="grid grid-cols-2 gap-4"><Metric icon={Utensils} value={String(assessment?.nutrition_percentage ?? 0)} label="Nutrition" color={lime} /><Metric icon={Activity} value={String(assessment?.physical_percentage ?? 0)} label="Physical" color="#dcebfb" /></div><div className="mt-6 space-y-3"><Macro value={String(assessment?.mental_percentage ?? 0)} total="/100" label="Mental" percent={`${assessment?.mental_percentage ?? 0}%`} width={`${assessment?.mental_percentage ?? 0}%`} /><Macro value={String(assessment?.toxin_percentage ?? 0)} total="/100" label="Toxin" percent={`${assessment?.toxin_percentage ?? 0}%`} width={`${assessment?.toxin_percentage ?? 0}%`} /><Macro value={String(assessment?.medical_percentage ?? 0)} total="/100" label="Medical" percent={`${assessment?.medical_percentage ?? 0}%`} width={`${assessment?.medical_percentage ?? 0}%`} /></div></div>
    </div>
  </article>
}

function Metric({ icon: Icon, value, label, color }: { icon: LucideIcon; value: string; label: string; color: string }) { return <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full" style={{ background: color }}><Icon className="size-5" /></span><div><p className="text-xl font-bold">{value}<span className="text-sm font-medium">%</span></p><p className="text-xs text-[#a0a0a5]">{label}</p></div></div> }
function Macro({ value, total, label, percent, width }: { value: string; total: string; label: string; percent: string; width: string }) { return <div className="grid grid-cols-[104px_1fr] items-stretch overflow-hidden rounded-xl bg-[#f5f8fb]"><p className="flex items-center bg-[#eaf2f8] px-4 text-xl font-bold">{value} <small className="ml-2 text-[10px] font-normal text-[#898a90]">{total}</small></p><div className="px-4 py-2.5"><div className="flex justify-between text-xs text-[#898a90]"><span>{label}</span><b className="text-[#353640]">{percent}</b></div><div className="mt-1.5 h-1.5 rounded-full bg-white"><div className="h-full rounded-full bg-gradient-to-r from-[#238dd4] to-[#33d201]" style={{ width }} /></div></div></div> }

function WorkoutProgress({ assessment }: { assessment: AssessmentPercentages | null }) {
  const pathways = [
    ["Nutrition pathway", assessment?.nutrition_percentage ?? 0, "Nutrition", "#dff8d7", Utensils, "#2fae19"],
    ["Toxin pathway", assessment?.toxin_percentage ?? 0, "Toxin", "#fff2cc", ShieldAlert, "#d99a00"],
    ["Mental pathway", assessment?.mental_percentage ?? 0, "Mental", "#eee7ff", Brain, "#8b5cf6"],
    ["Physical pathway", assessment?.physical_percentage ?? 0, "Physical", "#dcebfb", Activity, "#238dd4"],
    ["Genetic pathway", assessment?.genetic_percentage ?? 0, "Genetic", "#ffe4ec", Dna, "#df4f7b"],
    ["Medical pathway", assessment?.medical_percentage ?? 0, "Medical", "#d9f7f2", Stethoscope, "#159b88"],
  ] as const
  return <section id="pathway-progress" className="scroll-mt-6"><div className="mb-5 flex items-center justify-between"><h2 className="font-bold">Pathway Progress</h2><button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs">Latest assessment <ChevronDown className="size-3" /></button></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">{pathways.map(([name, score, type, color, Icon, accent]) => <article key={name} className="flex h-[110px] items-center gap-5 rounded-[20px] p-5" style={{ background: color }}><span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white"><Icon className="size-8" style={{ color: accent }} /></span><div className="min-w-0 flex-1"><p className="text-sm">{name}</p><div className="mt-3 flex items-end justify-between"><p className="text-sm"><b>{score}%</b></p><span className="text-xs">{type}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded bg-white/60"><i className="block h-full rounded" style={{ width: `${score}%`, background: accent }} /></div></div></article>)}</div></section>
}

function ChoiceCard({ task, completing, onComplete }: { task: HealthTask; completing: boolean; onComplete: (task: HealthTask) => Promise<void> }) {
  const category = categoryFor(task.category)
  const Icon = category.icon
  const done = task.completed_current_period
  return <article className={`flex flex-col rounded-[20px] border p-4 transition ${done ? "border-transparent bg-[#dff8d7]/70" : "border-[#eef1f4] bg-white"}`}>
    <div className={`flex items-center gap-3 ${done ? "opacity-60" : ""}`}>
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl" style={{ background: category.bg }}><Icon className="size-7" style={{ color: category.accent }} /></span>
      <div className="flex min-w-0 flex-wrap gap-1.5 text-[11px]"><span className="rounded-lg px-2.5 py-1 font-semibold" style={{ background: category.bg, color: category.accent }}>{category.key}</span><span className="rounded-lg bg-[#f3f7fb] px-2.5 py-1 capitalize text-[#687684]">{task.frequency}</span><span className="rounded-lg bg-[#f3f7fb] px-2.5 py-1 text-[#687684]">+{task.points_value} pts</span></div>
    </div>
    <h3 className={`mt-4 line-clamp-2 font-bold leading-5 ${done ? "opacity-60" : ""}`}>{task.title}</h3>
    <p className={`mt-2 line-clamp-3 text-sm leading-5 text-[#93949a] ${done ? "opacity-60" : ""}`}>{task.description || "A personalized action selected from your latest health assessment."}</p>
    <button type="button" disabled={done || completing} onClick={() => void onComplete(task)} className={`mt-auto pt-4 text-left`}><span className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold ${done ? "bg-[#33d201]/25 text-[#1f6b12]" : "bg-[#238dd4] text-white"}`}>{completing ? "Saving..." : done ? "✓ Completed" : "Mark as done"}</span></button>
  </article>
}

const pickRandom = <T,>(list: T[]): T | undefined => list[Math.floor(Math.random() * list.length)]
const shuffle = <T,>(list: T[]): T[] => list.map((item) => [Math.random(), item] as const).sort((a, b) => a[0] - b[0]).map(([, item]) => item)

function LowerContent({ tasks, tasksLoading, completingId, generating, onComplete, onGenerate }: { tasks: HealthTask[]; tasksLoading: boolean; completingId: string; generating: boolean; onComplete: (task: HealthTask) => Promise<void>; onGenerate: () => Promise<void> }) {
  const taskIdsKey = tasks.map((task) => task.id).join(",")
  // One random choice per pathway, chosen once per page load (re-rolled only when the task list itself changes).
  // Undone choices are preferred; a completed one is used only when its pathway has nothing left to do.
  const featuredIds = useMemo(() => {
    const chosen: string[] = []
    for (const category of healthCategories) {
      const inCategory = tasks.filter((task) => task.category.toLowerCase() === category.key.toLowerCase())
      const open = inCategory.filter((task) => !task.completed_current_period)
      const pick = pickRandom(open.length ? open : inCategory)
      if (pick) chosen.push(pick.id)
    }
    if (chosen.length < 6) {
      const rest = shuffle(tasks.filter((task) => !chosen.includes(task.id))).sort((a, b) => Number(a.completed_current_period) - Number(b.completed_current_period))
      for (const task of rest) { if (chosen.length >= 6) break; chosen.push(task.id) }
    }
    return chosen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskIdsKey])
  const featured = featuredIds
    .map((id) => tasks.find((task) => task.id === id))
    .filter((task): task is HealthTask => Boolean(task))
    .sort((a, b) => Number(a.completed_current_period) - Number(b.completed_current_period))

  return <section className="rounded-[20px] bg-white px-4 pb-6 pt-6 sm:px-6">
    <div className="flex flex-wrap justify-between gap-4"><div><h2 className="font-bold">Recommended Health Choices</h2><p className="mt-1 text-xs text-[#93949a]">{tasksLoading ? "Loading your personalized choices..." : "One pick from each pathway · refresh for a new mix"}</p></div><button type="button" disabled={generating || tasksLoading} onClick={() => void onGenerate()} className="h-fit rounded-xl bg-[#238dd4] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{generating ? "Generating..." : tasks.length ? "Regenerate" : "Generate choices"}</button></div>
    {tasksLoading ? <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="animate-pulse rounded-[20px] border border-[#eef1f4] p-4"><div className="flex items-center gap-3"><div className="size-14 rounded-2xl bg-[#eef4fa]" /><div className="h-4 w-24 rounded bg-[#eef4fa]" /></div><div className="mt-4 h-4 w-2/3 rounded bg-[#eef4fa]" /><div className="mt-3 h-3 w-full rounded bg-[#eef4fa]" /><div className="mt-2 h-3 w-5/6 rounded bg-[#eef4fa]" /></div>)}</div>
      : featured.length ? <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{featured.map((task) => <ChoiceCard key={task.id} task={task} completing={completingId === task.id} onComplete={onComplete} />)}</div>
        : <div className="mt-6 flex h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-[#cbd9e5] bg-[#f8fbfd] px-8 text-center text-sm text-[#7d8994]"><p>Generate personalized recommendations from your latest assessment.</p><button type="button" disabled={generating} onClick={() => void onGenerate()} className="mt-4 rounded-xl bg-[#238dd4] px-4 py-2 font-semibold text-white disabled:opacity-60">{generating ? "Generating..." : "Generate my choices"}</button></div>}
    <div className="mt-6 flex justify-center border-t border-[#eef1f4] pt-5"><Link href="/health-choices" className="inline-flex items-center gap-2 rounded-xl bg-[#eef4fa] px-5 py-2.5 text-sm font-semibold text-[#238dd4] transition hover:bg-[#dcebfb]">View all health choices{tasks.length > 6 ? ` (${tasks.length})` : ""} <ChevronRight className="size-4" /></Link></div>
  </section>
}

function RightPanel({ name, achievements, tasks }: { name: string; achievements: AchievementSummary | null; tasks: HealthTask[] }) {
  const userInitials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "HM"
  return <aside className="bg-white px-4 py-6 sm:px-6 xl:min-h-screen xl:px-8 xl:py-10"><div className="flex items-center"><span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#238dd4] to-[#33d201] text-lg font-bold text-white">{userInitials}</span><div className="ml-4 min-w-0"><h2 className="truncate font-bold">{name}</h2><p className="text-xs text-[#a0a1a6]">{achievements?.login_streak ?? 0}-day login streak</p></div><button className="relative ml-auto grid size-11 place-items-center rounded-2xl bg-[#eef4fa] text-[#238dd4]"><Bell className="size-5" />{achievements?.unread_notifications ? <span className="absolute right-0 top-0 min-w-4 rounded-full bg-[#8b5cf6] px-1 text-[10px] text-white">{achievements.unread_notifications}</span> : null}</button></div><Calendar /><div className="mt-6 space-y-5">{tasks.slice(0, 4).map((task) => <CompactChoice key={task.id} task={task} />)}{!tasks.length ? <p className="rounded-2xl bg-[#f3f7fb] p-5 text-sm text-[#8e8f95]">Your generated health choices will appear here.</p> : null}</div><ActivityList notifications={achievements?.notifications ?? []} /></aside>
}

function Calendar() {
  const today = new Date()
  const days = Array.from({ length: 6 }, (_, index) => { const value = new Date(today); value.setDate(today.getDate() + index - 1); return value })
  return <section className="mt-6 h-[153px] rounded-[20px] bg-[#f3f7fb] p-5 xl:mt-10"><div className="flex items-center"><h3 className="font-bold">{today.toLocaleString(undefined, { month: "long" })} <span className="text-[#8e8f95]">{today.getFullYear()}</span></h3><div className="ml-auto flex gap-2"><button className="grid size-9 place-items-center rounded-xl bg-white"><ChevronLeft className="size-4" /></button><button className="grid size-9 place-items-center rounded-xl bg-white"><ChevronRight className="size-4" /></button></div></div><div className="mt-4 grid grid-cols-6 text-center text-xs text-[#929399]">{days.map((date) => <span key={date.toISOString()}>{date.toLocaleString(undefined, { weekday: "short" })}</span>)}</div><div className="mt-1 grid grid-cols-6 text-center font-bold">{days.map((date) => <span key={date.toISOString()} className={date.toDateString() === today.toDateString() ? "rounded-xl bg-gradient-to-br from-[#238dd4] to-[#33d201] py-2 text-white" : "py-2"}>{date.getDate()}</span>)}</div></section>
}

function CompactChoice({ task }: { task: HealthTask }) { return <article className="border-b border-[#e2eaf1] pb-5"><div className="flex items-center"><span className="rounded-lg bg-[#dff8d7] px-3 py-1 text-xs">{task.category}</span><span className="ml-3 rounded-lg bg-[#eef4fa] px-3 py-1 text-xs capitalize">{task.frequency}</span><span className={`ml-auto size-3 rounded-full ${task.completed_current_period ? "bg-[#33d201]" : "bg-[#cbd9e5]"}`} /></div><div className="mt-4 flex gap-4"><div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-[#eef4fa] text-[#238dd4]"><Target className="size-7" /></div><div><h4 className="line-clamp-2 text-sm font-medium leading-5">{task.title}</h4><p className="mt-3 border-t border-[#e2eaf1] pt-3 text-xs text-[#777880]">{task.impact_level} impact　+{task.points_value} points</p></div></div></article> }

function ActivityList({ notifications }: { notifications: AchievementSummary["notifications"] }) { const items = notifications.slice(0, 4); return <section className="mt-7"><div className="flex justify-between"><h2 className="font-bold">Recent Activity</h2><MoreHorizontal className="size-5" /></div>{items.length ? <div className="mt-6 space-y-5">{items.map((item, i) => <div key={item.id} className="flex min-h-20 gap-4"><div className="relative"><span className="grid size-10 place-items-center rounded-full" style={{ background: [lime, yellow, orange][i % 3] }}><Bell className="size-4" /></span>{i < items.length - 1 ? <i className="absolute left-1/2 top-11 h-16 w-px bg-[#dedede]" /> : null}</div><div><p className="text-[10px] text-[#a3a4a8]">{new Date(item.created_at).toLocaleString()}</p><p className="mt-1 text-sm leading-5"><b>{item.title}</b> {item.message}</p></div></div>)}</div> : <p className="mt-6 text-sm text-[#8e8f95]">No recent notifications.</p>}</section> }

function DynamicDashboardPreview() {
  const router = useRouter()
  const { isAdmin } = useCurrentUserRole()
  const data = useDashboardData()
  const [activeView, setActiveView] = useState("Dashboard")
  const [menuOpen, setMenuOpen] = useState(false)
  const fullName = useMemo(() => [data.achievements?.profile.first_name, data.achievements?.profile.last_name].filter(Boolean).join(" ") || data.accountName || "Health Member", [data.achievements, data.accountName])
  const firstName = fullName.split(" ")[0] || "Member"
  const score = data.assessment?.health_percentage ?? 0

  function startAssessment(premium = false) {
    localStorage.setItem("healthAssessmentCompleted", "false")
    router.push(premium ? "/health-assessment?premium=1" : "/health-assessment")
  }

  function navigate(label: string) {
    setMenuOpen(false)
    if (label === "Dashboard" || label === "AI Chat") {
      setActiveView(label)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    if (label === "Health Assessment") return startAssessment(false)
    if (label === "Health Choices") return router.push("/health-choices")
    if (label === "Knowledge Base") return router.push("/admin/knowledge")
    if (label === "Users") return router.push("/admin/users")

    setActiveView("Dashboard")
    window.setTimeout(() => {
      if (label === "Pathway Progress") document.getElementById("pathway-progress")?.scrollIntoView({ behavior: "smooth", block: "start" })
      if (label === "Notifications") Array.from(document.querySelectorAll("h2")).find((heading) => heading.textContent === "Recent Activity")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 0)
  }

  // Other pages (e.g. Health Choices) hand off nav targets that live inside this page.
  useEffect(() => {
    const pending = sessionStorage.getItem("dashboardNavigate")
    if (!pending) return
    sessionStorage.removeItem("dashboardNavigate")
    navigate(pending)
  }, [])

  async function logout() {
    await getSupabaseClient().auth.signOut()
    router.replace("/login")
  }

  const navProps = { unread: data.achievements?.unread_notifications ?? 0, active: activeView, isAdmin, onNavigate: navigate, onPremium: () => startAssessment(true), onLogout: () => void logout() }

  return <div className="min-h-screen bg-white text-[#292a34]" style={{ color: ink }}>
    {/* Phone and tablet navigation drawer; the xl grid below renders the fixed column instead */}
    <MobileNavDrawer {...navProps} open={menuOpen} onClose={() => setMenuOpen(false)} />

    <div className="grid min-h-screen grid-cols-1 xl:min-w-[1180px] xl:grid-cols-[266px_minmax(720px,1fr)_390px]">
      <LeftNav {...navProps} className="hidden xl:flex" />
      <main className="min-w-0 bg-[#f3f7fb] px-4 pb-8 pt-0 sm:px-6 xl:px-[33px] xl:py-8">
        {activeView !== "AI Chat" ? <MobileTopBar title="Dashboard" unread={navProps.unread} onOpenMenu={() => setMenuOpen(true)} className="sticky top-0 z-40 -mx-4 mb-5 sm:-mx-6 sm:px-6 xl:hidden" /> : null}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 xl:pt-0"><div className="min-w-0"><h1 className="text-2xl font-bold xl:text-[28px]">Hello, {firstName}! 👋</h1><p className="mt-1 text-sm text-[#9a9ba1]">Let&apos;s continue your journey to better health today</p></div><div className="flex items-center gap-3"><label className="flex w-[280px] items-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-[#98999f] shadow-sm shadow-[#238dd4]/5"><Search className="size-5 text-[#238dd4]" /><input className="w-full bg-transparent text-sm outline-none" placeholder="Search your dashboard" /></label><button type="button" onClick={() => startAssessment(false)} className="w-full whitespace-nowrap rounded-2xl bg-gradient-to-r from-[#238dd4] to-[#33d201] px-5 py-3.5 text-sm font-semibold text-white shadow-sm sm:w-auto">{data.assessment ? "Retake assessment" : "Take assessment"}</button></div></header>
        {data.error ? <p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{data.error}</p> : null}
        {activeView === "AI Chat" ? <div className="mt-7 h-[calc(100vh-130px)] min-h-[700px]"><AiChat onOpenMenu={() => setMenuOpen(true)} unreadCount={navProps.unread} /></div> : <><div className="mt-6"><LowerContent tasks={data.tasks} tasksLoading={data.tasksLoading} completingId={data.completingId} generating={data.generating} onComplete={data.completeTask} onGenerate={data.generateTasks} /></div><SummaryCards data={data} /><section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[318px_1fr]"><WeightChart score={score} /><CalorieChart assessment={data.assessment} /></section><div className="mt-6"><WorkoutProgress assessment={data.assessment} /></div><footer className="mt-10 flex flex-col items-center gap-3 text-center text-xs text-[#8e8f95] xl:flex-row xl:gap-8 xl:text-left"><b className="text-[#238dd4]">Copyright © 2026 HealthiPhy.ai</b><span className="flex flex-wrap justify-center gap-x-6 gap-y-1 xl:gap-8"><span>Privacy Policy</span><span>Terms and conditions</span><span>Contact</span></span></footer></>}
      </main>
      <RightPanel name={fullName} achievements={data.achievements} tasks={data.tasks} />
    </div>

    {!data.loading && !data.assessment ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17202a]/55 px-4 py-6 backdrop-blur-sm"><section className="grid max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-[30px] bg-white shadow-2xl md:grid-cols-2"><img src="/nut-female.jpg" alt="Health assessment" className="h-48 w-full object-cover sm:h-60 md:h-full md:min-h-[420px]" /><div className="flex flex-col justify-center p-6 sm:p-8 md:p-10"><img src="/health.png" alt="HealthiPhy.ai" className="w-40 md:w-48" /><p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-[#238dd4] md:mt-8">Action required</p><h2 className="mt-3 text-2xl font-bold md:text-3xl">Complete your health assessment</h2><p className="mt-4 text-sm leading-7 text-[#687684]">Answer the assessment so HealthiPhy can calculate your six pathway scores and generate personalized health choices.</p><div className="mt-6 flex flex-wrap gap-3 md:mt-8"><button type="button" onClick={() => startAssessment(false)} className="rounded-xl bg-[#238dd4] px-6 py-3 text-sm font-semibold text-white">Take assessment</button><button type="button" onClick={() => startAssessment(true)} className="rounded-xl border border-[#238dd4] px-6 py-3 text-sm font-semibold text-[#238dd4]">Premium assessment</button></div></div></section></div> : null}
  </div>
}

export default function DashboardPreviewPage() {
  return <AuthGate><DynamicDashboardPreview /></AuthGate>
}
