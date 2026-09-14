"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowLeft, CheckCircle2, ClipboardCheck, ListChecks, LoaderCircle, MessageSquare } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { apiBaseUrl } from "@/lib/config"
import { AdminShell, card } from "@/components/admin/admin-shell"

type UserDetail = { id: string; email: string | null; first_name: string | null; last_name: string | null; role: string; created_at: string | null; disabled: boolean; stats: { assessments: number; chats: number; tasks: number; completed_tasks: number }; latest_assessment: Record<string, number | string | null> | null; assessment_history: { created_at: string | null; score: number | null }[] }

// Same pathway colours as the dashboard's Pathway Progress cards.
const pathways: Array<[string, string, string]> = [
  ["Nutrition", "nutrition_percentage", "#2fae19"],
  ["Toxin", "toxin_percentage", "#d99a00"],
  ["Mental", "mental_percentage", "#8b5cf6"],
  ["Physical", "physical_percentage", "#238dd4"],
  ["Genetic", "genetic_percentage", "#df4f7b"],
  ["Medical", "medical_percentage", "#159b88"],
]

async function loadUser(id: string) {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw error
  const response = await fetch(`${apiBaseUrl}/api/admin/users/${id}`, { headers: { Accept: "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message ?? "Unable to load user details.")
  return body.data as UserDetail
}

const backLink = <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#687684] hover:text-[#238dd4]"><ArrowLeft className="size-4" />Back to users</Link>

export function UserDetailPage({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserDetail | null>(null)
  const [error, setError] = useState("")
  const load = useCallback(async () => { try { setError(""); setUser(await loadUser(userId)) } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load user details.") } }, [userId])
  useEffect(() => { void load() }, [load])

  if (error) return <AdminShell active="Users" title="User progress" breadcrumb={backLink}><p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p></AdminShell>
  if (!user) return <AdminShell active="Users" title="User progress" breadcrumb={backLink}><div className="flex items-center justify-center py-16 text-sm text-[#9a9ba1]"><LoaderCircle className="mr-2 size-4 animate-spin" />Loading user progress...</div></AdminShell>

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Unnamed user"
  const userInitials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "HM"
  const overall = Number(user.latest_assessment?.health_percentage ?? 0)
  const categories = user.latest_assessment ? pathways.map(([label, key, color]) => ({ label, color, score: Number(user.latest_assessment?.[key] ?? 0) })) : []
  const history = user.assessment_history.slice().reverse()

  return (
    <AdminShell active="Users" title={name} subtitle={`${user.email ?? "No email"} · Joined ${user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}`} breadcrumb={backLink} actions={
      <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm shadow-[#238dd4]/5"><span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-[#238dd4] to-[#33d201] text-sm font-bold text-white">{userInitials}</span><div><p className="text-sm font-bold capitalize">{user.role}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${user.disabled ? "bg-[#fff2cc] text-[#8a6100]" : "bg-[#dff8d7] text-[#1f6b12]"}`}>{user.disabled ? "Disabled" : "Active"}</span></div></div>
    }>
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          ["Assessments", user.stats.assessments, ClipboardCheck, "#dcebfb", "#238dd4"],
          ["AI chats", user.stats.chats, MessageSquare, "#eee7ff", "#8b5cf6"],
          ["Health choices", user.stats.tasks, ListChecks, "#fff2cc", "#d99a00"],
          ["Choices completed", user.stats.completed_tasks, CheckCircle2, "#dff8d7", "#2fae19"],
        ].map(([label, value, Icon, bg, accent]) => {
          const StatIcon = Icon as typeof ClipboardCheck
          return <article key={String(label)} className={card}><div className="flex items-center justify-between"><h3 className="text-[15px]">{String(label)}</h3><span className="grid size-8 place-items-center rounded-xl" style={{ background: String(bg), color: String(accent) }}><StatIcon className="size-4" /></span></div><p className="mt-3 text-2xl font-bold">{String(value)}</p></article>
        })}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[318px_1fr]">
        <article className={card}>
          <h2 className="font-bold">Overall Health</h2>
          <div className="relative mx-auto mt-5 h-[132px] w-[260px] overflow-hidden">
            <svg className="absolute inset-0" viewBox="0 0 260 145" aria-hidden>
              <path d="M25 125 A105 105 0 0 1 235 125" fill="none" stroke="#eef4fa" strokeWidth="18" strokeLinecap="round" />
              <path d="M25 125 A105 105 0 0 1 235 125" fill="none" stroke={overall >= 70 ? "#33d201" : "#238dd4"} strokeWidth="18" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(0, Math.min(100, overall))} 100`} />
            </svg>
            <p className="absolute inset-x-0 bottom-3 text-center text-3xl font-bold">{overall}<span className="text-xl">%</span><small className="mt-2 block text-xs font-normal text-[#999a9f]">{user.latest_assessment ? "Latest assessment" : "No assessment yet"}</small></p>
          </div>
          <div className="flex justify-between px-3 text-[#8f9096]"><b>0</b><span className="text-xs">{Math.max(0, 100 - overall)} points to optimal</span><b>100</b></div>
          <div className="mt-6 h-0.5 bg-gradient-to-r from-[#238dd4] to-[#33d201]" />
          <p className="mx-auto mt-4 max-w-[280px] text-center text-sm leading-6 text-[#6f7077]">{user.stats.completed_tasks} of {user.stats.tasks} health choices completed.</p>
        </article>

        <article className={card}>
          <h2 className="font-bold">Latest assessment scores</h2>
          {categories.length ? <div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={categories}><CartesianGrid vertical={false} stroke="#eef1f4" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8e8f95" }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8e8f95" }} /><Tooltip cursor={{ fill: "#f3f7fb" }} formatter={(value) => `${value}%`} contentStyle={{ borderRadius: 12, border: "1px solid #eef1f4", fontSize: 12 }} /><Bar dataKey="score" radius={[8, 8, 0, 0]}>{categories.map((category) => <Cell key={category.label} fill={category.color} />)}</Bar></BarChart></ResponsiveContainer></div> : <div className="mt-5 flex h-56 items-center justify-center rounded-2xl border border-dashed border-[#cbd9e5] bg-[#f8fbfd] text-sm text-[#7d8994]">No completed assessment yet.</div>}
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className={card}>
          <h2 className="font-bold">Pathway Progress</h2>
          {categories.length ? <div className="mt-4 space-y-3">{categories.map((category) => <div key={category.label} className="grid grid-cols-[104px_1fr] items-stretch overflow-hidden rounded-xl bg-[#f5f8fb]"><p className="flex items-center bg-[#eaf2f8] px-4 text-xl font-bold">{category.score}<small className="ml-2 text-[10px] font-normal text-[#898a90]">/100</small></p><div className="px-4 py-2.5"><div className="flex justify-between text-xs text-[#898a90]"><span>{category.label}</span><b className="text-[#353640]">{category.score}%</b></div><div className="mt-1.5 h-1.5 rounded-full bg-white"><div className="h-full rounded-full" style={{ width: `${category.score}%`, background: category.color }} /></div></div></div>)}</div> : <p className="mt-5 text-sm text-[#9a9ba1]">Pathway scores appear once the member completes an assessment.</p>}
        </article>

        <article className={card}>
          <h2 className="font-bold">Assessment history</h2>
          {history.length ? <div className="mt-4 space-y-4">{history.map((assessment, index) => <div key={`${assessment.created_at}-${index}`}><div className="flex justify-between text-sm"><span className="text-[#687684]">{assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : "Assessment"}</span><strong>{assessment.score ?? 0}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f3f7fb]"><div className="h-full rounded-full bg-gradient-to-r from-[#238dd4] to-[#33d201]" style={{ width: `${assessment.score ?? 0}%` }} /></div></div>)}</div> : <p className="mt-5 text-sm text-[#9a9ba1]">No assessment history yet.</p>}
        </article>
      </section>
    </AdminShell>
  )
}
