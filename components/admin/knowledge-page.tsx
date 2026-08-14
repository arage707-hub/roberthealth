"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Database, FileUp, LayoutDashboard, LoaderCircle, LogOut, Trash2, Users } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { UserAvatar } from "@/components/dashboard/user-avatar"

const categories = ["Nutrition", "Toxin", "Mental", "Physical", "Genetic", "Medical"] as const
const apiBaseUrl = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "https://aiprocess.trippinweb.com").replace(/\/$/, "")

type SourceDocument = {
  id: string
  title: string
  source_type: "pdf" | "video" | "image" | "text"
  category: string[] | null
  status: "queued" | "processing" | "complete" | "failed"
  created_at: string
  uploaded_by_name?: string
}

function responseError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const data = payload as { message?: string; error?: string; errors?: Record<string, string[]> }
    return (data.errors ? Object.values(data.errors).flat()[0] : null) ?? data.message ?? data.error ?? fallback
  }
  return fallback
}

async function authorizedRequest(path: string, init?: RequestInit) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session?.access_token) throw new Error("Your session has expired. Please sign in again.")

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
      ...init?.headers,
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(responseError(payload, `Request failed with status ${response.status}.`))
  return payload
}

export function KnowledgePage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [documents, setDocuments] = useState<SourceDocument[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [adminName, setAdminName] = useState("Admin")
  const [signingOut, setSigningOut] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    setLoadingDocuments(true)
    setError("")
    try {
      const payload = (await authorizedRequest("/api/admin/knowledge")) as { data?: SourceDocument[] }
      setDocuments(payload.data ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load upload history.")
    } finally {
      setLoadingDocuments(false)
    }
  }, [])

  useEffect(() => void loadDocuments(), [loadDocuments])

  useEffect(() => {
    const supabase = getSupabaseClient()
    void supabase.auth.getUser().then(({ data }) => {
      const metadata = data.user?.user_metadata as { first_name?: string; last_name?: string } | undefined
      const name = [metadata?.first_name, metadata?.last_name].filter(Boolean).join(" ")
      if (name) setAdminName(name)
    })
  }, [])

  async function signOut() {
    setSigningOut(true)
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  function toggleCategory(category: string) {
    setSelectedCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError("Choose a file to upload.")
      return
    }

    setUploading(true)
    setError("")
    setMessage("")
    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("file", file)
      selectedCategories.forEach((category) => formData.append("category[]", category))
      const payload = (await authorizedRequest("/api/admin/knowledge/upload", { method: "POST", body: formData })) as { data?: SourceDocument }

      setMessage(`Upload successful. Status: ${payload.data?.status ?? "queued"}.`)
      setTitle("")
      setFile(null)
      setSelectedCategories([])
      const input = document.getElementById("knowledge-file") as HTMLInputElement | null
      if (input) input.value = ""
      await loadDocuments()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  async function deleteDocument(document: SourceDocument) {
    if (!window.confirm(`Delete "${document.title}" and its stored file? This cannot be undone.`)) return

    setDeletingId(document.id)
    setError("")
    setMessage("")
    try {
      await authorizedRequest(`/api/admin/knowledge/${document.id}`, { method: "DELETE" })
      setMessage(`Deleted ${document.title}.`)
      setDocuments((current) => current.filter((item) => item.id !== document.id))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete the document.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Database className="size-5" />
            </span>
            <div>
              <p className="font-bold leading-tight text-foreground">HealthiPhy Admin</p>
              <p className="text-xs text-muted-foreground">Content management</p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 rounded-full bg-secondary/70 p-1 md:flex" aria-label="Admin navigation">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground">
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm">
              <Database className="size-4" /> Knowledge Base
            </span>
            <Link href="/admin/users" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground">
              <Users className="size-4" /> Users
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <UserAvatar name={adminName} size={34} />
              <span className="max-w-32 truncate text-sm font-semibold text-foreground">{adminName}</span>
            </div>
            <button type="button" onClick={signOut} disabled={signingOut} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">
              {signingOut ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-primary/15 via-card to-success/10 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Knowledge administration</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Welcome, {adminName}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Add trusted health source files and monitor their ingestion status. Uploaded material is stored privately and queued for future processing into the HealthiPhy knowledge base.
          </p>
          <div className="mt-5 flex md:hidden">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm"><LayoutDashboard className="size-4" /> Dashboard</Link>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileUp className="size-5" /></span><h2 className="text-lg font-semibold text-card-foreground">Upload a document</h2></div>
          <form onSubmit={submit} className="mt-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-card-foreground"><span>Title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" /></label>
              <label className="space-y-2 text-sm font-medium text-card-foreground"><span>File</span><input id="knowledge-file" required type="file" accept=".pdf,.mp4,.mov,.jpg,.jpeg,.png,application/pdf,video/mp4,video/quicktime,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:font-semibold file:text-primary" /></label>
            </div>
            <fieldset><legend className="text-sm font-medium text-card-foreground">Categories</legend><div className="mt-3 flex flex-wrap gap-2">{categories.map((category) => <label key={category} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-card-foreground"><input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggleCategory(category)} className="accent-primary" />{category}</label>)}</div></fieldset>
            <button type="submit" disabled={uploading} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{uploading ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" />}{uploading ? "Uploading..." : "Upload file"}</button>
          </form>
          {message ? <p className="mt-4 flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-sm text-success"><CheckCircle2 className="size-4" />{message}</p> : null}
          {error ? <p role="alert" className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-5"><h2 className="text-lg font-semibold text-card-foreground">Shared upload history</h2><p className="mt-1 text-sm text-muted-foreground">Documents uploaded by every administrator are shown here.</p></div>
          {loadingDocuments ? <div className="flex items-center justify-center py-12 text-sm text-muted-foreground"><LoaderCircle className="mr-2 size-4 animate-spin" />Loading uploads...</div> : documents.length === 0 ? <p className="px-6 py-12 text-center text-sm text-muted-foreground">No source documents have been uploaded yet.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-6 py-3">Document</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-6 py-3">Created</th></tr></thead><tbody className="divide-y divide-border">{documents.map((document) => <tr key={document.id}><td className="px-6 py-4"><div className="flex min-w-48 items-center justify-between gap-3"><span className="font-medium text-card-foreground">{document.title}</span><button type="button" onClick={() => deleteDocument(document)} disabled={deletingId !== null} title={`Delete ${document.title}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50">{deletingId === document.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Delete</button></div></td><td className="px-4 py-4 capitalize text-muted-foreground">{document.source_type}</td><td className="px-4 py-4 text-muted-foreground">{document.category?.join(", ") || "—"}</td><td className="px-4 py-4"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold capitalize text-primary">{document.status}</span></td><td className="px-6 py-4 text-muted-foreground">{new Date(document.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>
          )}
        </section>
      </div>
    </main>
  )
}
