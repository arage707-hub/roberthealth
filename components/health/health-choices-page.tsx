"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  Bell, CalendarCheck, CalendarRange, Check, Flame, HeartPulse, LoaderCircle,
  MoreHorizontal, Search, Sparkles, Target, TrendingUp, Zap,
} from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useCurrentUserRole } from "@/lib/use-current-user-role"
import { useDashboardData, type HealthTask, type RecommendedProduct } from "@/lib/use-dashboard-data"
import type { AssessmentPercentages } from "@/lib/use-latest-assessment"
import type { AchievementSummary } from "@/lib/achievement-types"
import { categoryFor, healthCategories as categories } from "@/lib/health-categories"
import { LeftNav, MobileNavDrawer, MobileTopBar } from "@/components/dashboard/site-nav"
import { ProductBar, RecommendedProducts } from "@/components/dashboard/recommended-products"
import { cn } from "@/lib/utils"

const lime = "#c9ea86"
const impactBars: Record<HealthTask["impact_level"], number> = { high: 3, medium: 2, low: 1 }

function ProgressRing({ percent }: { percent: number }) {
  const value = Math.max(0, Math.min(100, percent))
  return (
    <div className="relative grid size-44 place-items-center sm:size-52">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="84" fill="none" stroke="#e6ede9" strokeWidth="16" />
        <circle cx="100" cy="100" r="84" fill="none" stroke="url(#choiceRing)" strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray={`${value} 100`} />
        <defs><linearGradient id="choiceRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#238dd4" /><stop offset="100%" stopColor="#33d201" /></linearGradient></defs>
      </svg>
      <div className="relative text-center">
        <p className="text-4xl font-bold leading-none">{value}<span className="text-xl">%</span></p>
        <p className="mt-2 text-xs text-[#9a9ba1]">completed</p>
      </div>
    </div>
  )
}

function StatTile({ label, value, unit, icon: Icon, color }: { label: string; value: string; unit?: string; icon: LucideIcon; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] p-4" style={{ background: color }}>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/85 text-[#292a34]"><Icon className="size-5" /></span>
      <div className="min-w-0"><p className="text-xs text-[#292a34]/70">{label}</p><p className="truncate text-lg font-bold leading-tight">{value}{unit ? <span className="ml-1 text-sm font-medium text-[#292a34]/70">{unit}</span> : null}</p></div>
    </div>
  )
}

function StatusTracker({ tasks, assessment, achievements, generating, onAskGuide }: { tasks: HealthTask[]; assessment: AssessmentPercentages | null; achievements: AchievementSummary | null; generating: boolean; onAskGuide: () => void }) {
  const done = tasks.filter((task) => task.completed_current_period)
  const percent = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0
  const daily = tasks.filter((task) => task.frequency === "daily")
  const weekly = tasks.filter((task) => task.frequency === "weekly")
  const pointsEarned = done.reduce((sum, task) => sum + task.points_value, 0)
  const pointsAvailable = tasks.reduce((sum, task) => sum + task.points_value, 0)
  const status = !tasks.length ? "Waiting for choices" : percent === 100 ? "All done" : percent >= 50 ? "On track" : "Getting started"
  const statusColor = percent === 100 ? "bg-[#dff8d7] text-[#1f6b12]" : percent >= 50 ? "bg-[#fff2cc] text-[#8a6100]" : "bg-[#dcebfb] text-[#1b6aa3]"

  const meta = [
    { icon: CalendarCheck, label: "Daily choices", value: `${daily.filter((task) => task.completed_current_period).length}/${daily.length}` },
    { icon: CalendarRange, label: "Weekly choices", value: `${weekly.filter((task) => task.completed_current_period).length}/${weekly.length}` },
    { icon: Zap, label: "Points earned", value: `${pointsEarned}/${pointsAvailable}` },
    { icon: HeartPulse, label: "Overall health", value: `${assessment?.health_percentage ?? 0}/100` },
  ]

  return (
    <section className="mt-6">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Progress Tracker</h2><MoreHorizontal className="size-5 text-[#687684]" /></div>
      <div className="grid gap-4 xl:grid-cols-[1fr_200px]">
        <article className="grid gap-6 rounded-[20px] bg-white p-5 md:grid-cols-[auto_1fr] md:items-center">
          <div className="grid place-items-center rounded-2xl bg-[#f3f7fb] p-6"><ProgressRing percent={percent} /></div>
          <div className="min-w-0">
            <h3 className="text-2xl font-bold leading-tight">You&apos;ve completed {done.length} of {tasks.length} health choices this period</h3>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className={cn("rounded-lg px-3 py-1 font-semibold", statusColor)}>{generating ? "Creating choices..." : status}</span>
              <span className="inline-flex items-center gap-1.5 text-[#687684]"><Flame className="size-4 text-[#ff9e5c]" /> <b className="text-[#292a34]">{achievements?.login_streak ?? 0}</b>-day login streak</span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              {meta.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f3f7fb] text-[#292a34]"><Icon className="size-4" /></span><div><dt className="text-xs text-[#9a9ba1]">{label}</dt><dd className="font-bold">{value}</dd></div></div>
              ))}
            </dl>
            <button type="button" onClick={onAskGuide} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#238dd4] to-[#33d201] py-3.5 text-sm font-semibold text-white shadow-sm"><Sparkles className="size-4" /> Ask your AI guide about these choices</button>
          </div>
        </article>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
          <StatTile label="Completed" value={String(done.length)} unit="choices" icon={Check} color="#d5f0a3" />
          <StatTile label="Remaining" value={String(tasks.length - done.length)} unit="left" icon={Target} color="#ffd77a" />
          <StatTile label="Points earned" value={`+${pointsEarned}`} unit="pts" icon={Zap} color="#ffb27a" />
          <StatTile label="Health score" value={String(assessment?.health_percentage ?? 0)} unit="/100" icon={TrendingUp} color="#e9eaec" />
        </div>
      </div>
    </section>
  )
}

function ChoiceRow({ task, maxPoints, completing, onComplete, products = [] }: { task: HealthTask; maxPoints: number; completing: boolean; onComplete: (task: HealthTask) => Promise<void>; products?: RecommendedProduct[] }) {
  const category = categoryFor(task.category)
  const Icon = category.icon
  const done = task.completed_current_period
  const filled = Math.max(1, Math.round((task.points_value / maxPoints) * 10))
  return (
    <article className={cn("grid min-w-0 gap-4 overflow-hidden rounded-[20px] p-4 transition sm:grid-cols-[128px_minmax(0,1fr)] sm:p-5", done ? "bg-[#dff8d7]/70" : "bg-white")}>
      <div className={cn("grid h-32 place-items-center rounded-2xl sm:h-full sm:min-h-[128px]", done && "opacity-60")} style={{ background: category.bg }}>
        <Icon className="size-10" style={{ color: category.accent }} />
      </div>
      <div className={cn("min-w-0", done && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg px-3 py-1 text-xs font-semibold" style={{ background: category.bg, color: category.accent }}>{category.key}</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f3f7fb] px-3 py-1 text-xs capitalize text-[#687684]"><span className="flex items-end gap-0.5">{[1, 2, 3].map((bar) => <i key={bar} className={cn("block w-1 rounded-sm", bar <= impactBars[task.impact_level] ? "bg-[#292a34]" : "bg-[#cbd9e5]")} style={{ height: 4 + bar * 3 }} />)}</span>{task.impact_level} impact</span>
          <span className="ml-auto inline-flex items-center gap-2 text-xs text-[#687684]">Points: <b className="text-base text-[#292a34]">+{task.points_value}</b><span className="flex gap-0.5">{Array.from({ length: 10 }, (_, index) => <i key={index} className={cn("block h-4 w-1.5 rounded-sm", index < filled ? "bg-[#ff9e5c]" : "bg-[#eef1f4]")} />)}</span></span>
        </div>
        <h3 className="mt-3 text-lg font-bold leading-6">{task.title}</h3>
        {task.description ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#687684]">{task.description}</p> : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-[#e2eaf1] bg-white px-3 py-2 text-xs text-[#687684]">
            <span className="inline-flex items-center gap-1.5 capitalize"><CalendarCheck className="size-3.5" /> {task.frequency}</span>
            <span className="inline-flex items-center gap-1.5"><Zap className="size-3.5" /> +{task.points_value} points</span>
            <span className="inline-flex items-center gap-1.5"><Target className="size-3.5" /> {category.key} pathway</span>
          </div>
          <button
            type="button"
            disabled={done || completing}
            onClick={() => void onComplete(task)}
            className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed", done ? "bg-[#33d201]/25 text-[#1f6b12]" : "text-[#292a34] hover:opacity-90")}
            style={done ? undefined : { background: lime }}
          >
            {completing ? <><LoaderCircle className="size-4 animate-spin" /> Saving...</> : done ? <><Check className="size-4" /> Completed</> : "Mark as done"}
          </button>
        </div>
      </div>
      {products.length ? (
        <div className="min-w-0 max-w-full space-y-2 overflow-hidden sm:col-span-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#238dd4]"><Sparkles className="size-3.5" />Products that can help with this choice</p>
          {products.map((item) => <ProductBar key={item.id} item={item} />)}
        </div>
      ) : null}
    </article>
  )
}

function RightPanel({ name, achievements, assessment, tasks }: { name: string; achievements: AchievementSummary | null; assessment: AssessmentPercentages | null; tasks: HealthTask[] }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "HM"
  const recent = tasks.filter((task) => task.completed_current_period).slice(0, 4)
  return (
    <aside className="bg-white px-4 py-6 sm:px-6 xl:min-h-screen xl:px-8 xl:py-10">
      <div className="flex items-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#238dd4] to-[#33d201] text-lg font-bold text-white">{initials}</span>
        <div className="ml-4 min-w-0"><h2 className="truncate font-bold">{name}</h2><p className="text-xs text-[#a0a1a6]">Member · {achievements?.login_streak ?? 0}-day streak</p></div>
        <span className="relative ml-auto grid size-11 place-items-center rounded-2xl bg-[#eef4fa] text-[#238dd4]"><Bell className="size-5" />{achievements?.unread_notifications ? <span className="absolute right-0 top-0 min-w-4 rounded-full bg-[#8b5cf6] px-1 text-[10px] text-white">{achievements.unread_notifications}</span> : null}</span>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between"><h2 className="font-bold">Pathway Scores</h2><MoreHorizontal className="size-5 text-[#687684]" /></div>
        <div className="mt-4 space-y-3">
          {categories.map(({ key, icon: Icon, bg, accent, column }) => {
            const score = assessment?.[column] ?? 0
            const open = tasks.filter((task) => task.category.toLowerCase() === key.toLowerCase() && !task.completed_current_period).length
            return (
              <div key={key} className="flex items-center gap-4 rounded-[20px] border border-[#eef1f4] p-3">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl" style={{ background: bg }}><Icon className="size-6" style={{ color: accent }} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold">{key} pathway</p><b className="text-sm">{score}<span className="text-xs font-normal text-[#9a9ba1]">/100</span></b></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f3f7fb]"><i className="block h-full rounded-full" style={{ width: `${score}%`, background: accent }} /></div>
                  <p className="mt-1.5 text-[11px] text-[#9a9ba1]">{open ? `${open} choice${open === 1 ? "" : "s"} still open` : "All choices done"}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between"><h2 className="font-bold">Recently Completed</h2><MoreHorizontal className="size-5 text-[#687684]" /></div>
        {recent.length ? <div className="mt-4 space-y-3">{recent.map((task) => { const category = categoryFor(task.category); const Icon = category.icon; return <div key={task.id} className="flex items-center gap-3 rounded-2xl bg-[#f3f7fb] p-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white"><Icon className="size-4" style={{ color: category.accent }} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{task.title}</p><p className="text-[11px] text-[#9a9ba1]">+{task.points_value} points · {category.key}</p></div><Check className="size-4 shrink-0 text-[#2fae19]" /></div> })}</div> : <p className="mt-4 rounded-2xl bg-[#f3f7fb] p-5 text-sm text-[#8e8f95]">Choices you mark as done will show up here.</p>}
      </section>
    </aside>
  )
}

export function HealthChoicesPage() {
  const router = useRouter()
  const { isAdmin } = useCurrentUserRole()
  const data = useDashboardData()
  const [menuOpen, setMenuOpen] = useState(false)
  const [category, setCategory] = useState("All")
  const [query, setQuery] = useState("")

  const fullName = useMemo(() => [data.achievements?.profile.first_name, data.achievements?.profile.last_name].filter(Boolean).join(" ") || data.accountName || "Health Member", [data.achievements, data.accountName])

  function startAssessment(premium = false) {
    localStorage.setItem("healthAssessmentCompleted", "false")
    router.push(premium ? "/health-assessment?premium=1" : "/health-assessment")
  }

  function navigate(label: string) {
    setMenuOpen(false)
    if (label === "Health Choices") return window.scrollTo({ top: 0, behavior: "smooth" })
    if (label === "Health Assessment") return startAssessment(false)
    if (label === "Biometrics") return router.push("/biometrics")
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

  const navProps = { unread: data.achievements?.unread_notifications ?? 0, active: "Health Choices", isAdmin, onNavigate: navigate, onPremium: () => startAssessment(true), onLogout: () => void logout() }

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: data.tasks.length }
    categories.forEach(({ key }) => { map[key] = data.tasks.filter((task) => task.category.toLowerCase() === key.toLowerCase()).length })
    return map
  }, [data.tasks])

  // Undone choices stay at the top; anything marked done drops to the bottom of the list.
  const visibleTasks = data.tasks
    .filter((task) => (category === "All" || task.category.toLowerCase() === category.toLowerCase()) && (!query.trim() || `${task.title} ${task.description ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a, b) => Number(a.completed_current_period) - Number(b.completed_current_period))
  const maxPoints = Math.max(1, ...data.tasks.map((task) => task.points_value))

  // Products the AI tied to a specific choice, keyed by that choice's pathway + title.
  const productsByTask = useMemo(() => {
    const map = new Map<string, RecommendedProduct[]>()
    for (const item of data.products) {
      if (!item.supports_task) continue
      const key = `${item.category.toLowerCase()}|${item.supports_task.trim().toLowerCase()}`
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return map
  }, [data.products])
  const productsFor = (task: HealthTask) => productsByTask.get(`${task.category.toLowerCase()}|${task.title.trim().toLowerCase()}`) ?? []

  return (
    <div className="min-h-screen bg-white text-[#292a34]">
      <MobileNavDrawer {...navProps} open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="grid min-h-screen grid-cols-1 xl:min-w-[1180px] xl:grid-cols-[266px_minmax(720px,1fr)_390px]">
        <LeftNav {...navProps} className="hidden xl:flex" />

        <main className="min-w-0 bg-[#f3f7fb] px-4 pb-8 pt-0 sm:px-6 xl:px-[33px] xl:py-8">
          <MobileTopBar title="Health Choices" unread={navProps.unread} onOpenMenu={() => setMenuOpen(true)} className="sticky top-0 z-40 -mx-4 mb-5 sm:-mx-6 sm:px-6 xl:hidden" />

          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><h1 className="text-2xl font-bold xl:text-[28px]">Health Choices</h1><p className="mt-1 text-sm text-[#9a9ba1]">AI-generated actions from your latest assessment</p></div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex h-12 items-center gap-3 rounded-2xl bg-white px-4 text-[#98999f] shadow-sm shadow-[#238dd4]/5 sm:w-[260px]"><Search className="size-5 text-[#238dd4]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm text-[#292a34] outline-none" placeholder="Search choices" /></label>
              <button type="button" disabled={data.generating} onClick={() => void data.generateTasks()} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-[#292a34] shadow-sm disabled:opacity-60" style={{ background: lime }}>{data.generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{data.generating ? "Generating..." : data.tasks.length ? "Regenerate choices" : "Generate choices"}</button>
            </div>
          </header>

          {data.error ? <p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{data.error}</p> : null}

          <StatusTracker tasks={data.tasks} assessment={data.assessment} achievements={data.achievements} generating={data.generating} onAskGuide={() => navigate("AI Chat")} />

          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold">Recommended Health Choices</h2>
              <p className="text-xs text-[#9a9ba1]">{visibleTasks.length} of {data.tasks.length} shown</p>
            </div>
            {/* Pathway filter: wraps onto extra lines on phones instead of scrolling sideways */}
            <div role="group" aria-label="Filter choices by pathway" className="flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-sm shadow-[#238dd4]/5 sm:inline-flex sm:rounded-full">
              {["All", ...categories.map((item) => item.key)].map((item) => (
                <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={cn("rounded-full px-3 py-1.5 text-sm font-medium transition sm:px-4 sm:py-2", category === item ? "text-[#292a34]" : "text-[#687684] hover:bg-[#f3f7fb]")} style={category === item ? { background: lime } : undefined}>
                  {item}{counts[item] ? <span className="ml-1.5 text-xs text-[#687684]">{counts[item]}</span> : null}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              {data.tasksLoading ? [1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-[20px] bg-white" />) : null}
              {!data.tasksLoading && !data.tasks.length ? (
                <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-[#cbd9e5] bg-white px-6 py-14 text-center">
                  <span className="grid size-14 place-items-center rounded-2xl bg-[#eef4fa] text-[#238dd4]"><Sparkles className="size-7" /></span>
                  <p className="mt-4 font-bold">{data.generating ? "Your choices are being created" : "No health choices yet"}</p>
                  <p className="mt-1 max-w-sm text-sm text-[#687684]">{data.generating ? "This takes a moment. The list will fill in automatically." : "Generate a personalized plan from your latest assessment and the health knowledge base."}</p>
                  {!data.generating ? <button type="button" onClick={() => void data.generateTasks()} className="mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold text-[#292a34]" style={{ background: lime }}>Generate my choices</button> : null}
                </div>
              ) : null}
              {!data.tasksLoading && data.tasks.length && !visibleTasks.length ? <p className="rounded-[20px] bg-white p-8 text-center text-sm text-[#687684]">No {category === "All" ? "" : category + " "}choices match your search.</p> : null}
              {visibleTasks.map((task) => <ChoiceRow key={task.id} task={task} maxPoints={maxPoints} completing={data.completingId === task.id} onComplete={data.completeTask} products={productsFor(task)} />)}
            </div>
          </section>

          <div className="mt-8"><RecommendedProducts products={category === "All" ? data.products : data.products.filter((item) => item.category.toLowerCase() === category.toLowerCase())} loading={data.tasksLoading} generating={data.generating} hasTasks={data.tasks.length > 0} initialLimit={9} matching={data.matchingProducts} onMatch={() => void data.matchProducts()} /></div>

          <footer className="mt-10 flex flex-col items-center gap-3 text-center text-xs text-[#8e8f95] xl:flex-row xl:gap-8 xl:text-left"><b className="text-[#238dd4]">Copyright © 2026 HealthiPhy.ai</b><span className="flex flex-wrap justify-center gap-x-6 gap-y-1 xl:gap-8"><Link href="#">Privacy Policy</Link><Link href="#">Terms and conditions</Link><Link href="#">Contact</Link></span></footer>
        </main>

        <RightPanel name={fullName} achievements={data.achievements} assessment={data.assessment} tasks={data.tasks} />
      </div>
    </div>
  )
}
