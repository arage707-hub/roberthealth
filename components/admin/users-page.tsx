"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { LoaderCircle, Search, ShieldOff, Trash2, UserCheck, Users } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"

const apiBaseUrl = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "https://aiprocess.trippinweb.com").replace(/\/$/, "")
type AdminUser = { id: string; email: string | null; first_name: string | null; last_name: string | null; role: "member" | "admin"; created_at: string | null; disabled: boolean; assessment_count: number; latest_score: number | null; chat_count: number }

async function adminRequest(path: string, init?: RequestInit) {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw error
  if (!data.session?.access_token) throw new Error("Your session has expired. Please sign in again.")
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { Accept: "application/json", Authorization: `Bearer ${data.session.access_token}`, ...init?.headers } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message ?? "Unable to complete that action.")
  return body
}
function displayName(user: AdminUser) { return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Unnamed user" }

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [pendingId, setPendingId] = useState("")
  const loadUsers = useCallback(async () => { setLoading(true); setError(""); try { const body = await adminRequest("/api/admin/users") as { data?: AdminUser[] }; setUsers(body.data ?? []) } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load users.") } finally { setLoading(false) } }, [])
  useEffect(() => { void loadUsers() }, [loadUsers])
  const filteredUsers = useMemo(() => { const needle = query.trim().toLowerCase(); return needle ? users.filter((user) => `${displayName(user)} ${user.email ?? ""}`.toLowerCase().includes(needle)) : users }, [query, users])
  async function changeUser(user: AdminUser, path: string, body?: object) { setPendingId(user.id); setError(""); try { await adminRequest(`/api/admin/users/${user.id}${path}`, body ? { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { method: "DELETE" }); return true } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Unable to update this user."); return false } finally { setPendingId("") } }
  async function toggleRole(user: AdminUser) { const role = user.role === "admin" ? "member" : "admin"; if (await changeUser(user, "/role", { role })) setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role } : item)) }
  async function toggleSuspension(user: AdminUser) { if (await changeUser(user, "/suspension", { disabled: !user.disabled })) setUsers((current) => current.map((item) => item.id === user.id ? { ...item, disabled: !user.disabled } : item)) }
  async function deleteUser(user: AdminUser) { if (!window.confirm(`Permanently delete ${displayName(user)} and all of their personal records? This cannot be undone.`)) return; if (await changeUser(user, "")) setUsers((current) => current.filter((item) => item.id !== user.id)) }

  return <main className="min-h-screen bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">
    <Link href="/admin/knowledge" className="text-sm font-medium text-muted-foreground hover:text-foreground">← Back to knowledge base</Link>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Administration</p><h1 className="mt-2 text-3xl font-bold">Users and progress</h1><p className="mt-2 text-sm text-muted-foreground">Review engagement, assessment outcomes, account access, and roles.</p></div><div className="rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary"><Users className="mr-2 inline size-4" />{users.length} total users</div></div>
    <div className="mt-7 rounded-3xl border border-border bg-card shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5"><div className="relative w-full max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" /></div><button type="button" onClick={() => void loadUsers()} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">Refresh</button></div>
      {error ? <p role="alert" className="m-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {loading ? <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><LoaderCircle className="mr-2 size-4 animate-spin" />Loading users...</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-6 py-3">User</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Assessments</th><th className="px-4 py-3">Latest score</th><th className="px-4 py-3">Chats</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-border">{filteredUsers.map((user) => <tr key={user.id} className="hover:bg-secondary/30"><td className="px-6 py-4"><Link href={`/admin/users/${user.id}`} className="font-semibold hover:text-primary">{displayName(user)}</Link><p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p><button type="button" role="switch" aria-checked={user.role === "admin"} disabled={pendingId === user.id} onClick={() => void toggleRole(user)} className={`mt-2 inline-flex items-center gap-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${user.role === "admin" ? "text-primary" : "text-muted-foreground"}`} title={user.role === "admin" ? "Change to user" : "Make administrator"}><span className={`relative h-5 w-9 rounded-full transition-colors ${user.role === "admin" ? "bg-primary" : "bg-muted-foreground/40"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${user.role === "admin" ? "translate-x-4" : "translate-x-0.5"}`} /></span>{user.role === "admin" ? "Admin" : "User"}</button></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.disabled ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{user.disabled ? "Disabled" : "Active"}</span></td><td className="px-4 py-4">{user.assessment_count}</td><td className="px-4 py-4">{user.latest_score === null ? "—" : `${user.latest_score}%`}</td><td className="px-4 py-4">{user.chat_count}</td><td className="px-6 py-4"><div className="flex justify-end gap-2"><Link href={`/admin/users/${user.id}`} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">View</Link><button type="button" disabled={pendingId === user.id} onClick={() => void toggleSuspension(user)} className="rounded-full border border-border p-2 text-muted-foreground hover:bg-secondary" title={user.disabled ? "Reactivate login" : "Disable login"}>{user.disabled ? <UserCheck className="size-4" /> : <ShieldOff className="size-4" />}</button><button type="button" disabled={pendingId === user.id} onClick={() => void deleteUser(user)} className="rounded-full border border-destructive/30 p-2 text-destructive hover:bg-destructive/10" title="Delete user"><Trash2 className="size-4" /></button></div></td></tr>)}</tbody></table>{filteredUsers.length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">No users match your search.</p> : null}</div>}
    </div>
  </div></main>
}
