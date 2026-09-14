"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ClipboardCheck, LoaderCircle, MessageSquare, RotateCcw, Search, ShieldCheck, ShieldOff, Trash2, UserCheck, Users } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { apiBaseUrl } from "@/lib/config"
import { AdminShell, card, chipButton, input, softButton, tableHead } from "@/components/admin/admin-shell"

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
function initials(user: AdminUser) { return displayName(user).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "HM" }

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

  const stats = {
    total: users.length,
    admins: users.filter((user) => user.role === "admin").length,
    assessed: users.filter((user) => user.assessment_count > 0).length,
    chats: users.reduce((sum, user) => sum + user.chat_count, 0),
  }

  return (
    <AdminShell active="Users" title="All Users" subtitle="Engagement, assessment outcomes, account access, and roles" actions={<>
      <label className="flex h-12 items-center gap-3 rounded-2xl bg-white px-4 text-[#98999f] shadow-sm shadow-[#238dd4]/5 sm:w-[280px]"><Search className="size-5 text-[#238dd4]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm text-[#292a34] outline-none" placeholder="Search name or email" /></label>
      <button type="button" onClick={() => void loadUsers()} disabled={loading} className={`${softButton} h-12`}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}Refresh</button>
    </>}>
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          ["Total users", stats.total, Users, "#dcebfb", "#238dd4"],
          ["Administrators", stats.admins, ShieldCheck, "#eee7ff", "#8b5cf6"],
          ["Completed an assessment", stats.assessed, ClipboardCheck, "#dff8d7", "#2fae19"],
          ["AI chats", stats.chats, MessageSquare, "#fff2cc", "#d99a00"],
        ].map(([label, value, Icon, bg, accent]) => {
          const StatIcon = Icon as typeof Users
          return <article key={String(label)} className={card}><div className="flex items-center justify-between"><h3 className="text-[15px]">{String(label)}</h3><span className="grid size-8 place-items-center rounded-xl" style={{ background: String(bg), color: String(accent) }}><StatIcon className="size-4" /></span></div><p className="mt-3 text-2xl font-bold">{loading ? "—" : String(value)}</p></article>
        })}
      </section>

      <section className="mt-6 overflow-hidden rounded-[20px] bg-white shadow-sm shadow-[#238dd4]/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1f4] px-5 py-5 sm:px-6"><div><h2 className="font-bold">Members</h2><p className="mt-1 text-xs text-[#9a9ba1]">{filteredUsers.length} of {users.length} shown</p></div></div>
        {error ? <p role="alert" className="m-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {loading ? <div className="flex items-center justify-center py-16 text-sm text-[#9a9ba1]"><LoaderCircle className="mr-2 size-4 animate-spin" />Loading users...</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className={tableHead}><tr><th className="px-6 py-3 font-semibold">User</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Assessments</th><th className="px-4 py-3 font-semibold">Latest score</th><th className="px-4 py-3 font-semibold">Chats</th><th className="px-6 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-[#eef1f4]">{filteredUsers.map((user) => <tr key={user.id} className="hover:bg-[#f8fbfd]"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#238dd4] to-[#33d201] text-sm font-bold text-white">{initials(user)}</span><div className="min-w-0"><Link href={`/admin/users/${user.id}`} className="font-semibold hover:text-[#238dd4]">{displayName(user)}</Link><p className="mt-0.5 truncate text-xs text-[#9a9ba1]">{user.email}</p><button type="button" role="switch" aria-checked={user.role === "admin"} disabled={pendingId === user.id} onClick={() => void toggleRole(user)} className={`mt-2 inline-flex items-center gap-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${user.role === "admin" ? "text-[#238dd4]" : "text-[#9a9ba1]"}`} title={user.role === "admin" ? "Change to user" : "Make administrator"}><span className={`relative h-5 w-9 rounded-full transition-colors ${user.role === "admin" ? "bg-gradient-to-r from-[#238dd4] to-[#33d201]" : "bg-[#cbd9e5]"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${user.role === "admin" ? "translate-x-4" : "translate-x-0.5"}`} /></span>{user.role === "admin" ? "Admin" : "User"}</button></div></div></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.disabled ? "bg-[#fff2cc] text-[#8a6100]" : "bg-[#dff8d7] text-[#1f6b12]"}`}>{user.disabled ? "Disabled" : "Active"}</span></td><td className="px-4 py-4 font-semibold">{user.assessment_count}</td><td className="px-4 py-4">{user.latest_score === null ? <span className="text-[#9a9ba1]">—</span> : <span className="inline-flex items-center gap-2"><span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#f3f7fb]"><span className="block h-full rounded-full bg-gradient-to-r from-[#238dd4] to-[#33d201]" style={{ width: `${Math.max(0, Math.min(100, user.latest_score))}%` }} /></span><b>{user.latest_score}%</b></span>}</td><td className="px-4 py-4 font-semibold">{user.chat_count}</td><td className="px-6 py-4"><div className="flex justify-end gap-2"><Link href={`/admin/users/${user.id}`} className={`${chipButton} bg-[#dcebfb] text-[#238dd4] hover:bg-[#c9e0f7]`}>View</Link><button type="button" disabled={pendingId === user.id} onClick={() => void toggleSuspension(user)} className={`${chipButton} bg-[#f3f7fb] text-[#687684] hover:bg-[#eef4fa]`} title={user.disabled ? "Reactivate login" : "Disable login"}>{user.disabled ? <UserCheck className="size-4" /> : <ShieldOff className="size-4" />}</button><button type="button" disabled={pendingId === user.id} onClick={() => void deleteUser(user)} className={`${chipButton} bg-rose-50 text-rose-700 hover:bg-rose-100`} title="Delete user"><Trash2 className="size-4" /></button></div></td></tr>)}</tbody></table>{filteredUsers.length === 0 ? <p className="p-10 text-center text-sm text-[#9a9ba1]">No users match your search.</p> : null}</div>}
      </section>
    </AdminShell>
  )
}
