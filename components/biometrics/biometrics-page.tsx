"use client"

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronUp, FileText, FileUp, FlaskConical, History, Image as ImageIcon, LoaderCircle, Plus, RotateCcw, Sparkles, Trash2, X } from "lucide-react"
import { MemberShell } from "@/components/dashboard/member-shell"
import { getSupabaseClient } from "@/lib/supabase-client"
import { apiBaseUrl } from "@/lib/config"
import { formatDate, formatValue, markerIcons, type BiometricDocument, type BiometricMarker, type BiometricsOverview } from "@/lib/biometrics"
import { cn } from "@/lib/utils"

function responseError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const data = payload as { message?: string; error?: string; errors?: Record<string, string[]> }
    return (data.errors ? Object.values(data.errors).flat()[0] : null) ?? data.message ?? data.error ?? fallback
  }
  return fallback
}

async function request(path: string, init?: RequestInit) {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw error
  if (!data.session?.access_token) throw new Error("Your session has expired. Please sign in again.")
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, cache: "no-store", headers: { Accept: "application/json", Authorization: `Bearer ${data.session.access_token}`, ...init?.headers } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(responseError(payload, `Request failed with status ${response.status}.`))
  return payload
}

const statusStyles = {
  optimal: { label: "Within target", pill: "bg-[#dff8d7] text-[#1f6b12]", ring: "ring-[#33d201]/40" },
  attention: { label: "Needs attention", pill: "bg-[#fff2cc] text-[#8a6100]", ring: "ring-[#f5b301]/50" },
  recorded: { label: "Recorded", pill: "bg-[#dcebfb] text-[#1f5f8f]", ring: "ring-[#238dd4]/30" },
}

// ---------------------------------------------------------------------------
// Marker card
// ---------------------------------------------------------------------------

function MarkerCard({ marker, onSave, onDelete, busy }: { marker: BiometricMarker; onSave: (marker: BiometricMarker, form: { value: string; valueText: string; date: string; note: string }) => Promise<void>; onDelete: (readingId: string) => Promise<void>; busy: boolean }) {
  const [editing, setEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [value, setValue] = useState("")
  const [valueText, setValueText] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const Icon = markerIcons[marker.icon] ?? markerIcons.activity
  const latest = marker.latest
  const isNumber = marker.kind === "number"
  const status = latest ? (marker.status ? statusStyles[marker.status] : statusStyles.recorded) : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave(marker, { value, valueText, date, note })
      setEditing(false)
      setValue("")
      setValueText("")
      setNote("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className={cn("flex flex-col rounded-[20px] border border-[#dbe7f3] bg-[#e8f1fb] p-4 transition", status ? `ring-1 ${status.ring}` : "", editing && "bg-white")}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[#238dd4] shadow-sm"><Icon className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-5">{marker.name}</h3>
          <p className="mt-0.5 text-[11px] leading-4 text-[#687684]">{marker.description}</p>
        </div>
      </div>

      <div className="mt-3 flex-1">
        {editing ? (
          <form onSubmit={submit} className="space-y-2">
            {isNumber ? (
              <label className="block text-[11px] font-semibold text-[#687684]">Result{marker.unit ? ` (${marker.unit})` : ""}
                <input autoFocus required type="number" step="any" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Enter value" className="mt-1 w-full rounded-xl border border-[#dbe7f3] bg-white px-3 py-2 text-sm font-semibold text-[#292a34] outline-none focus:border-[#238dd4]" />
              </label>
            ) : (
              <label className="block text-[11px] font-semibold text-[#687684]">Result
                <input autoFocus required value={valueText} onChange={(event) => setValueText(event.target.value)} placeholder="e.g. No delayed allergies" className="mt-1 w-full rounded-xl border border-[#dbe7f3] bg-white px-3 py-2 text-sm font-semibold text-[#292a34] outline-none focus:border-[#238dd4]" />
              </label>
            )}
            <label className="block text-[11px] font-semibold text-[#687684]">Date measured
              <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dbe7f3] bg-white px-3 py-2 text-sm text-[#292a34] outline-none focus:border-[#238dd4]" />
            </label>
            <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="Note (optional)" className="w-full rounded-xl border border-[#dbe7f3] bg-white px-3 py-2 text-xs text-[#292a34] outline-none focus:border-[#238dd4]" />
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#238dd4] to-[#33d201] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{saving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}Save</button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-xl bg-[#f3f7fb] px-3 py-2 text-xs font-semibold text-[#687684]">Cancel</button>
            </div>
          </form>
        ) : latest ? (
          <div>
            <p className="text-[11px] text-[#687684]">Current Value</p>
            <p className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold leading-none">{isNumber ? formatValue(latest.value) : latest.value_text}</span>
              {isNumber && (latest.unit || marker.unit) ? <span className="text-xs text-[#687684]">{latest.unit || marker.unit}</span> : null}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {status ? <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", status.pill)}>{status.label}</span> : null}
              <span className="text-[11px] text-[#9a9ba1]">{latest.measured_at ? formatDate(latest.measured_at) : formatDate(latest.created_at)} · {latest.source === "document" ? "from report" : "entered"}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 text-center">
            <p className="text-xs text-[#687684]">Lab results required</p>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={() => setEditing(true)} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold text-[#238dd4] hover:underline disabled:opacity-60"><Plus className="size-3.5" />{latest ? "Update" : "Add Data"}</button>
          {marker.history.length ? <button type="button" onClick={() => setShowHistory((open) => !open)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#687684] hover:text-[#238dd4]"><History className="size-3.5" />{marker.history.length} {showHistory ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}</button> : null}
        </div>
      ) : null}

      {showHistory && marker.history.length ? (
        <ul className="mt-2 space-y-1 rounded-xl bg-white p-2 text-[11px]">
          {marker.history.map((reading) => (
            <li key={reading.id} className="flex items-center justify-between gap-2">
              <span><b>{isNumber ? formatValue(reading.value) : reading.value_text}</b>{isNumber && (reading.unit || marker.unit) ? ` ${reading.unit || marker.unit}` : ""} <span className="text-[#9a9ba1]">· {formatDate(reading.measured_at ?? reading.created_at)}{reading.source === "document" ? " · report" : ""}</span></span>
              <button type="button" onClick={() => void onDelete(reading.id)} disabled={busy} aria-label="Delete reading" className="text-[#9a9ba1] hover:text-rose-600 disabled:opacity-50"><Trash2 className="size-3.5" /></button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 border-t border-[#dbe7f3] pt-2">
        <p className="text-[10px] uppercase tracking-wide text-[#9a9ba1]">Target Range</p>
        <p className="text-xs font-semibold text-[#1f5f8f]">{marker.target}</p>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function BiometricsPage() {
  const [overview, setOverview] = useState<BiometricsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pendingDocId, setPendingDocId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const payload = (await request("/api/biometrics")) as BiometricsOverview
      setOverview(payload)
      if (!silent) setError("")
    } catch (loadError) {
      if (!silent) setError(loadError instanceof Error ? loadError.message : "Unable to load your biometrics.")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Lab reports are read in the background; keep polling while any is still in flight.
  const processing = overview?.documents.some((document) => document.status === "queued" || document.status === "processing") ?? false
  useEffect(() => {
    if (!processing) return
    const timer = window.setInterval(() => void load(true), 4000)
    return () => window.clearInterval(timer)
  }, [processing, load])

  async function saveReading(marker: BiometricMarker, form: { value: string; valueText: string; date: string; note: string }) {
    setError("")
    setMessage("")
    try {
      const payload = (await request("/api/biometrics/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marker_key: marker.key, value: marker.kind === "number" ? Number(form.value) : null, value_text: marker.kind === "text" ? form.valueText : null, measured_at: form.date || null, note: form.note || null }),
      })) as { overview?: Omit<BiometricsOverview, "documents"> }
      if (payload.overview) setOverview((current) => current ? { ...current, ...payload.overview } : current)
      setMessage(`Saved ${marker.name}.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the reading.")
      throw saveError
    }
  }

  async function deleteReading(readingId: string) {
    if (!window.confirm("Delete this reading?")) return
    setBusy(true)
    setError("")
    try {
      const payload = (await request(`/api/biometrics/readings/${readingId}`, { method: "DELETE" })) as { overview?: Omit<BiometricsOverview, "documents"> }
      if (payload.overview) setOverview((current) => current ? { ...current, ...payload.overview } : current)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete the reading.")
    } finally {
      setBusy(false)
    }
  }

  async function uploadFile(file: File | null | undefined) {
    if (!file) return
    setUploading(true)
    setError("")
    setMessage("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const payload = (await request("/api/biometrics/documents", { method: "POST", body: formData })) as { data?: BiometricDocument }
      if (payload.data) {
        setPendingDocId(payload.data.id)
        setOverview((current) => current ? { ...current, documents: [payload.data as BiometricDocument, ...current.documents] } : current)
      }
      setMessage(`Uploaded ${file.name}. Reading your results now, this usually takes under a minute.`)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  // When the pending upload finishes, say how many results landed.
  useEffect(() => {
    if (!pendingDocId || !overview) return
    const document = overview.documents.find((item) => item.id === pendingDocId)
    if (!document || document.status === "queued" || document.status === "processing") return
    setPendingDocId(null)
    if (document.status === "complete") setMessage(document.readings_count ? `Done: ${document.readings_count} result${document.readings_count === 1 ? "" : "s"} were added from ${document.original_filename}.` : `No HealthiPhy panel markers were found in ${document.original_filename}. You can still add results by hand.`)
    else setError(document.error_message || "The report could not be read.")
  }, [overview, pendingDocId])

  async function documentAction(document: BiometricDocument, action: "retry" | "delete") {
    if (action === "delete" && !window.confirm(`Remove ${document.original_filename} and the results extracted from it? Results you entered by hand are kept.`)) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      if (action === "retry") {
        const payload = (await request(`/api/biometrics/documents/${document.id}/retry`, { method: "POST" })) as { data?: BiometricDocument }
        setOverview((current) => current ? { ...current, documents: current.documents.map((item) => item.id === document.id ? { ...item, status: "queued", error_message: null, ...payload.data } : item) } : current)
        setPendingDocId(document.id)
      } else {
        const payload = (await request(`/api/biometrics/documents/${document.id}`, { method: "DELETE" })) as { overview?: Omit<BiometricsOverview, "documents"> }
        setOverview((current) => current ? { ...current, ...(payload.overview ?? {}), documents: current.documents.filter((item) => item.id !== document.id) } : current)
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update the document.")
    } finally {
      setBusy(false)
    }
  }

  const summary = overview?.summary
  const stats = useMemo(() => [
    ["Markers recorded", summary ? `${summary.recorded} / ${summary.total_markers}` : "—", FlaskConical, "#dcebfb", "#238dd4"],
    ["Within target", summary ? String(summary.optimal) : "—", CheckCircle2, "#dff8d7", "#2fae19"],
    ["Needs attention", summary ? String(summary.attention) : "—", AlertTriangle, "#fff2cc", "#d99a00"],
    ["Lab reports", overview ? String(overview.documents.length) : "—", FileText, "#eee7ff", "#8b5cf6"],
  ] as const, [summary, overview])

  return (
    <MemberShell active="Biometrics" title="Biometrics for Longevity" subtitle="AgingSOS Ultimate Panel. Add lab results by hand or upload a report and let the AI read it. Your Health AI Guide and health choices use these values.">
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map(([label, value, Icon, bg, accent]) => (
          <article key={label} className="rounded-[20px] bg-white p-5 shadow-sm shadow-[#238dd4]/5"><div className="flex items-center justify-between"><h3 className="text-[15px]">{label}</h3><span className="grid size-8 place-items-center rounded-xl" style={{ background: bg, color: accent }}><Icon className="size-4" /></span></div><p className="mt-3 text-2xl font-bold">{loading ? "—" : value}</p></article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); void uploadFile(event.dataTransfer.files?.[0]) }}
          className={cn("rounded-[20px] border-2 border-dashed bg-white p-5 shadow-sm shadow-[#238dd4]/5 transition sm:p-6", dragging ? "border-[#33d201] bg-[#dff8d7]/40" : "border-[#cbd9e5]")}
        >
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#238dd4] to-[#33d201] text-white"><FileUp className="size-7" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">Upload a lab report</h2>
              <p className="mt-1 text-sm leading-6 text-[#687684]">Drop a PDF or a photo of your results here. The AI reads every marker it recognises from the HealthiPhy panels and fills in the cards below. Scanned reports and phone photos work too.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="sr-only" id="biometric-file" onChange={(event) => void uploadFile(event.target.files?.[0])} />
              <label htmlFor="biometric-file" className={cn("inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#238dd4] to-[#33d201] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90", uploading && "pointer-events-none opacity-60")}>{uploading ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" />}{uploading ? "Uploading..." : "Choose file"}</label>
              <p className="text-center text-[11px] text-[#9a9ba1]">PDF, JPG, PNG, WebP · up to 20 MB</p>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] bg-white p-5 shadow-sm shadow-[#238dd4]/5">
          <div className="flex items-center justify-between"><h2 className="font-bold">Your reports</h2><span className="text-xs text-[#9a9ba1]">{overview?.documents.length ?? 0} uploaded</span></div>
          {!overview?.documents.length ? <p className="mt-4 rounded-2xl border border-dashed border-[#cbd9e5] bg-[#f8fbfd] px-4 py-6 text-center text-xs text-[#7d8994]">No reports yet.</p> : (
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
              {overview.documents.map((document) => {
                const active = document.status === "queued" || document.status === "processing"
                const DocIcon = document.mime_type?.startsWith("image/") ? ImageIcon : FileText
                return (
                  <li key={document.id} className="rounded-xl bg-[#f3f7fb] p-3 text-xs">
                    <div className="flex items-start gap-2">
                      <DocIcon className="mt-0.5 size-4 shrink-0 text-[#238dd4]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[#292a34]">{document.original_filename}</p>
                        <p className="mt-0.5 text-[#687684]">{formatDate(document.created_at)} · {active ? <span className="inline-flex items-center gap-1 text-[#238dd4]"><LoaderCircle className="size-3 animate-spin" />{document.status === "queued" ? "Waiting" : "Reading results..."}</span> : document.status === "complete" ? <span className="text-[#1f6b12]">{document.readings_count} result{document.readings_count === 1 ? "" : "s"} added</span> : <span className="text-rose-700">Failed</span>}</p>
                        {document.status === "failed" && document.error_message ? <p className="mt-1 text-rose-700/90">{document.error_message}</p> : null}
                        {document.status === "complete" && document.unmatched?.length ? <p className="mt-1 text-[#9a9ba1]">Also seen but not on the panel: {document.unmatched.slice(0, 4).map((item) => item.label).join(", ")}{document.unmatched.length > 4 ? "…" : ""}</p> : null}
                      </div>
                      <span className="flex shrink-0 gap-1">
                        {document.status === "failed" ? <button type="button" onClick={() => void documentAction(document, "retry")} disabled={busy} title="Try again" className="grid size-7 place-items-center rounded-lg bg-white text-[#238dd4] hover:bg-[#dcebfb] disabled:opacity-50"><RotateCcw className="size-3.5" /></button> : null}
                        <button type="button" onClick={() => void documentAction(document, "delete")} disabled={busy || active} title="Remove report and its results" className="grid size-7 place-items-center rounded-lg bg-white text-[#9a9ba1] hover:text-rose-600 disabled:opacity-50"><Trash2 className="size-3.5" /></button>
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {message ? <p className="mt-5 flex items-center gap-2 rounded-xl bg-[#dff8d7] px-4 py-3 text-sm text-[#1f6b12]"><CheckCircle2 className="size-4 shrink-0" />{message}</p> : null}
      {error ? <p role="alert" className="mt-5 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"><X className="size-4 shrink-0" />{error}</p> : null}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div key={item} className="h-44 animate-pulse rounded-[20px] bg-white" />)}</div>
      ) : overview?.panels.map((panel) => (
        <section key={panel.key} className="mt-8">
          <div className="rounded-[20px] bg-gradient-to-r from-[#1f5f8f] to-[#238dd4] px-5 py-4 text-white shadow-sm">
            {panel.eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">{panel.eyebrow}</p> : null}
            <h2 className="mt-0.5 flex items-center gap-2 text-lg font-bold"><Sparkles className="size-4" />{panel.title}</h2>
          </div>
          {panel.sections.map((section) => (
            <div key={section.key} className="mt-5">
              {section.title ? <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#687684]">{section.title}</p> : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {section.markers.map((marker) => <MarkerCard key={`${section.key}-${marker.key}`} marker={marker} onSave={saveReading} onDelete={deleteReading} busy={busy} />)}
              </div>
            </div>
          ))}
        </section>
      ))}

      <p className="mt-8 text-center text-[11px] leading-5 text-[#a0a1a6]">Target ranges are general longevity guidelines, not a diagnosis. Discuss any result outside its target with a qualified healthcare professional.</p>
    </MemberShell>
  )
}
