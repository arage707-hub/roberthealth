"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { LoaderCircle, MessageSquare, ClipboardCheck, CheckCircle2, ListChecks } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"

const apiBaseUrl = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "https://aiprocess.trippinweb.com").replace(/\/$/, "")

type UserDetail = { id: string; email: string | null; first_name: string | null; last_name: string | null; role: string; created_at: string | null; disabled: boolean; stats: { assessments: number; chats: number; tasks: number; completed_tasks: number }; latest_assessment: Record<string, number | string | null> | null; assessment_history: { created_at: string | null; score: number | null }[] }
const chartColors = ["#33d201", "#238dd4", "#a855f7", "#f59e0b", "#ec4899", "#14b8a6"]

async function loadUser(id: string) {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw error
  const response = await fetch(`${apiBaseUrl}/api/admin/users/${id}`, { headers: { Accept: "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message ?? "Unable to load user details.")
  return body.data as UserDetail
}

export function UserDetailPage({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserDetail | null>(null)
  const [error, setError] = useState("")
  const load = useCallback(async () => { try { setError(""); setUser(await loadUser(userId)) } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load user details.") } }, [userId])
  useEffect(() => { void load() }, [load])
  if (error) return <main className="min-h-screen bg-secondary/30 p-8"><Link href="/admin/users" className="text-sm underline">← Users</Link><p className="mt-6 text-destructive">{error}</p></main>
  if (!user) return <main className="flex min-h-screen items-center justify-center bg-secondary/30 text-sm text-muted-foreground"><LoaderCircle className="mr-2 size-4 animate-spin" />Loading user progress...</main>
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Unnamed user"
  const categories = user.latest_assessment ? [["Nutrition", "nutrition_percentage"], ["Toxin", "toxin_percentage"], ["Mental", "mental_percentage"], ["Physical", "physical_percentage"], ["Genetic", "genetic_percentage"], ["Medical", "medical_percentage"]].map(([label, key]) => ({ label, score: Number(user.latest_assessment?.[key] ?? 0) })) : []
  return <main className="min-h-screen bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><Link href="/admin/users" className="text-sm font-medium text-muted-foreground hover:text-foreground">← Back to users</Link><section className="mt-5 rounded-3xl bg-gradient-to-r from-primary/15 via-card to-success/10 p-6 sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">User progress</p><h1 className="mt-2 text-3xl font-bold">{name}</h1><p className="mt-2 text-sm text-muted-foreground">{user.email} · Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</p></section><section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{[[ClipboardCheck, "Assessments", user.stats.assessments], [MessageSquare, "Chats", user.stats.chats], [ListChecks, "Health choices", user.stats.tasks], [CheckCircle2, "Choices completed", user.stats.completed_tasks]].map(([Icon, label, value]) => { const MetricIcon = Icon as typeof ClipboardCheck; return <div key={String(label)} className="rounded-3xl border border-border bg-card p-5 shadow-sm"><MetricIcon className="size-5 text-primary" /><p className="mt-5 text-3xl font-bold">{String(value)}</p><p className="mt-1 text-sm text-muted-foreground">{String(label)}</p></div> })}</section><section className="mt-6 grid gap-6 xl:grid-cols-2"><div className="rounded-3xl border border-border bg-card p-6 shadow-sm"><h2 className="font-semibold">Latest assessment scores</h2>{categories.length ? <div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={categories}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => `${value}%`} /><Bar dataKey="score" radius={[8, 8, 0, 0]}>{categories.map((_, index) => <Cell key={index} fill={chartColors[index]} />)}</Bar></BarChart></ResponsiveContainer></div> : <p className="mt-6 text-sm text-muted-foreground">No completed assessment yet.</p>}</div><div className="rounded-3xl border border-border bg-card p-6 shadow-sm"><h2 className="font-semibold">Assessment score history</h2>{user.assessment_history.length ? <div className="mt-5 space-y-4">{user.assessment_history.slice().reverse().map((assessment, index) => <div key={`${assessment.created_at}-${index}`}><div className="flex justify-between text-sm"><span>{assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : "Assessment"}</span><strong>{assessment.score ?? 0}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${assessment.score ?? 0}%` }} /></div></div>)}</div> : <p className="mt-6 text-sm text-muted-foreground">No assessment history yet.</p>}</div></section></div></main>
}
