"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { CheckCircle2, Database, FileText, FileUp, Image as ImageIcon, LoaderCircle, RotateCcw, Trash2, Video } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { apiBaseUrl } from "@/lib/config"
import { AdminShell, card, chipButton, input, primaryButton, softButton, tableHead } from "@/components/admin/admin-shell"

const categories = ["Nutrition", "Toxin", "Mental", "Physical", "Genetic", "Medical"] as const

type SourceDocument = {
  id: string
  title: string
  source_type: "pdf" | "video" | "image" | "text"
  category: string[] | null
  status: "queued" | "processing" | "complete" | "failed"
  error_message?: string | null
  created_at: string
  uploaded_by_name?: string
}

const statusStyles: Record<SourceDocument["status"], string> = {
  queued: "bg-[#eef4fa] text-[#687684]",
  processing: "bg-[#dcebfb] text-[#238dd4]",
  complete: "bg-[#dff8d7] text-[#1f6b12]",
  failed: "bg-rose-50 text-rose-700",
}

const typeIcons = { pdf: FileText, video: Video, image: ImageIcon, text: FileText }

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
  const [title, setTitle] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [documents, setDocuments] = useState<SourceDocument[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const loadDocuments = useCallback(async (silent = false) => {
    if (!silent) {
      setLoadingDocuments(true)
      setError("")
    }
    try {
      const payload = (await authorizedRequest("/api/admin/knowledge")) as { data?: SourceDocument[] }
      setDocuments(payload.data ?? [])
    } catch (loadError) {
      if (!silent) setError(loadError instanceof Error ? loadError.message : "Unable to load upload history.")
    } finally {
      if (!silent) setLoadingDocuments(false)
    }
  }, [])

  useEffect(() => void loadDocuments(), [loadDocuments])

  // Ingestion runs on a queue; keep the table fresh while anything is still in flight.
  const hasActiveJobs = documents.some((document) => document.status === "queued" || document.status === "processing")
  useEffect(() => {
    if (!hasActiveJobs) return
    const timer = window.setInterval(() => void loadDocuments(true), 5000)
    return () => window.clearInterval(timer)
  }, [hasActiveJobs, loadDocuments])

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
      const inputElement = document.getElementById("knowledge-file") as HTMLInputElement | null
      if (inputElement) inputElement.value = ""
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

  async function retryDocument(document: SourceDocument) {
    setRetryingId(document.id)
    setError("")
    setMessage("")
    try {
      const payload = (await authorizedRequest(`/api/admin/knowledge/${document.id}/retry`, { method: "POST" })) as { data?: Partial<SourceDocument> }
      setMessage(`Re-queued ${document.title} for processing.`)
      setDocuments((current) => current.map((item) => item.id === document.id ? { ...item, status: "queued", error_message: null, ...payload.data } : item))
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Unable to retry the document.")
    } finally {
      setRetryingId(null)
    }
  }

  const counts = {
    total: documents.length,
    complete: documents.filter((document) => document.status === "complete").length,
    active: documents.filter((document) => document.status === "queued" || document.status === "processing").length,
    failed: documents.filter((document) => document.status === "failed").length,
  }

  return (
    <AdminShell active="Knowledge Base" title="Knowledge Base" subtitle="Trusted source material the Health AI Guide learns from" actions={
      <button type="button" onClick={() => void loadDocuments()} disabled={loadingDocuments} className={softButton}>{loadingDocuments ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}Refresh</button>
    }>
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          ["Documents", counts.total, Database, "#dcebfb", "#238dd4"],
          ["Ready", counts.complete, CheckCircle2, "#dff8d7", "#2fae19"],
          ["Processing", counts.active, LoaderCircle, "#eee7ff", "#8b5cf6"],
          ["Failed", counts.failed, FileText, "#ffe4ec", "#df4f7b"],
        ].map(([label, value, Icon, bg, accent]) => {
          const StatIcon = Icon as typeof Database
          return <article key={String(label)} className={card}><div className="flex items-center justify-between"><h3 className="text-[15px]">{String(label)}</h3><span className="grid size-8 place-items-center rounded-xl" style={{ background: String(bg), color: String(accent) }}><StatIcon className="size-4" /></span></div><p className="mt-3 text-2xl font-bold">{loadingDocuments ? "—" : String(value)}</p></article>
        })}
      </section>

      <section className={`mt-6 ${card} sm:p-6`}>
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#dcebfb] text-[#238dd4]"><FileUp className="size-5" /></span><div><h2 className="font-bold">Upload a document</h2><p className="text-xs text-[#9a9ba1]">PDF, image, or video · scanned pages are read automatically · videos are transcribed</p></div></div>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium"><span>Title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} placeholder="e.g. Advanced Longevity Panel" className={`${input} ring-[#eef1f4]`} /></label>
            <label className="space-y-2 text-sm font-medium"><span>File</span><input id="knowledge-file" required type="file" accept=".pdf,.mp4,.mov,.jpg,.jpeg,.png,application/pdf,video/mp4,video/quicktime,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className={`${input} ring-[#eef1f4] py-2.5 file:mr-3 file:rounded-full file:border-0 file:bg-[#dcebfb] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#238dd4]`} /></label>
          </div>
          <fieldset><legend className="text-sm font-medium">Pathways</legend><div className="mt-3 flex flex-wrap gap-2">{categories.map((category) => { const checked = selectedCategories.includes(category); return <label key={category} className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition ${checked ? "bg-[#dff8d7] text-[#292a34]" : "bg-[#f3f7fb] text-[#687684] hover:bg-[#eef4fa]"}`}><input type="checkbox" checked={checked} onChange={() => toggleCategory(category)} className="sr-only" />{category}</label> })}</div></fieldset>
          <button type="submit" disabled={uploading} className={primaryButton}>{uploading ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" />}{uploading ? "Uploading..." : "Upload file"}</button>
        </form>
        {message ? <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#dff8d7] px-4 py-3 text-sm text-[#1f6b12]"><CheckCircle2 className="size-4" />{message}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      <section className="mt-6 overflow-hidden rounded-[20px] bg-white shadow-sm shadow-[#238dd4]/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1f4] px-5 py-5 sm:px-6"><div><h2 className="font-bold">Shared upload history</h2><p className="mt-1 text-xs text-[#9a9ba1]">Documents uploaded by every administrator{hasActiveJobs ? " · refreshing automatically" : ""}</p></div></div>
        {loadingDocuments ? <div className="flex items-center justify-center py-12 text-sm text-[#9a9ba1]"><LoaderCircle className="mr-2 size-4 animate-spin" />Loading uploads...</div> : documents.length === 0 ? <div className="m-5 flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd9e5] bg-[#f8fbfd] text-sm text-[#7d8994]">No source documents have been uploaded yet.</div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className={tableHead}><tr><th className="px-6 py-3 font-semibold">Document</th><th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">Pathways</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-6 py-3 font-semibold">Created</th></tr></thead><tbody className="divide-y divide-[#eef1f4]">{documents.map((document) => { const TypeIcon = typeIcons[document.source_type] ?? FileText; return <tr key={document.id} className="hover:bg-[#f8fbfd]"><td className="px-6 py-4"><div className="flex min-w-56 items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{document.title}</p><p className="mt-0.5 text-xs text-[#9a9ba1]">by {document.uploaded_by_name ?? "Administrator"}</p></div><span className="flex shrink-0 items-center gap-2">{document.status === "failed" ? <button type="button" onClick={() => retryDocument(document)} disabled={retryingId !== null || deletingId !== null} title={`Retry processing ${document.title}`} className={`${chipButton} bg-[#dcebfb] text-[#238dd4] hover:bg-[#c9e0f7]`}>{retryingId === document.id ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}Retry</button> : null}<button type="button" onClick={() => deleteDocument(document)} disabled={deletingId !== null || retryingId !== null} title={`Delete ${document.title}`} className={`${chipButton} bg-rose-50 text-rose-700 hover:bg-rose-100`}>{deletingId === document.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Delete</button></span></div></td><td className="px-4 py-4 text-[#687684]"><span className="inline-flex items-center gap-1.5 capitalize"><TypeIcon className="size-4 text-[#238dd4]" />{document.source_type}</span></td><td className="px-4 py-4"><div className="flex flex-wrap gap-1">{document.category?.length ? document.category.map((item) => <span key={item} className="rounded-lg bg-[#f3f7fb] px-2 py-0.5 text-xs text-[#687684]">{item}</span>) : <span className="text-[#9a9ba1]">—</span>}</div></td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[document.status] ?? statusStyles.queued}`}>{document.status === "processing" || document.status === "queued" ? <LoaderCircle className="size-3 animate-spin" /> : null}{document.status}</span>{document.status === "failed" && document.error_message ? <p className="mt-1.5 max-w-xs text-xs leading-5 text-rose-700/90" title={document.error_message}>{document.error_message}</p> : null}</td><td className="px-6 py-4 text-[#687684]">{new Date(document.created_at).toLocaleString()}</td></tr> })}</tbody></table></div>
        )}
      </section>
    </AdminShell>
  )
}
