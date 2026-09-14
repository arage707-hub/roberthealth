"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, ExternalLink, FileUp, ImageOff, LoaderCircle, Pencil, Plus, RotateCcw, Search, ShoppingBag, Sparkles, Trash2, X } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { apiBaseUrl } from "@/lib/config"
import { healthCategories } from "@/lib/health-categories"
import { AdminShell, card, chipButton, input, primaryButton, softButton, tableHead } from "@/components/admin/admin-shell"

type Product = {
  id: string
  name: string
  description: string
  price: number | string | null
  currency: string
  purchase_url: string
  image_url: string | null
  brand: string | null
  category: string[] | null
  is_active: boolean
  status: "queued" | "processing" | "complete" | "failed"
  error_message?: string | null
  created_at: string
  updated_at?: string
}

type ProductForm = { name: string; brand: string; description: string; price: string; currency: string; purchase_url: string; image_url: string; category: string[]; is_active: boolean }

const emptyForm: ProductForm = { name: "", brand: "", description: "", price: "", currency: "USD", purchase_url: "", image_url: "", category: [], is_active: true }

const statusStyles: Record<Product["status"], string> = {
  queued: "bg-[#eef4fa] text-[#687684]",
  processing: "bg-[#dcebfb] text-[#238dd4]",
  complete: "bg-[#dff8d7] text-[#1f6b12]",
  failed: "bg-rose-50 text-rose-700",
}

const csvTemplate = [
  "name,brand,description,price,currency,url,image_url,categories",
  "Omega-3 Fish Oil,HealthiPhy,High-potency EPA/DHA fish oil supporting heart and brain health.,29.99,USD,https://example.com/omega-3,https://example.com/omega-3.jpg,Nutrition|Medical",
  "Blue Light Glasses,,Reduce evening screen glare to support deeper sleep.,45,USD,https://example.com/blue-light,,Physical|Mental",
].join("\n")

function responseError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const data = payload as { message?: string; error?: string; errors?: Record<string, string[]> }
    return (data.errors ? Object.values(data.errors).flat()[0] : null) ?? data.message ?? data.error ?? fallback
  }
  return fallback
}

async function adminRequest(path: string, init?: RequestInit) {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw error
  if (!data.session?.access_token) throw new Error("Your session has expired. Please sign in again.")
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, cache: "no-store", headers: { Accept: "application/json", Authorization: `Bearer ${data.session.access_token}`, ...init?.headers } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(responseError(payload, `Request failed with status ${response.status}.`))
  return payload
}

function formatPrice(product: Product) {
  if (product.price === null || product.price === "" || product.price === undefined) return "—"
  const value = Number(product.price)
  if (Number.isNaN(value)) return String(product.price)
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: product.currency || "USD" }).format(value)
  } catch {
    return `${product.currency} ${value.toFixed(2)}`
  }
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importReport, setImportReport] = useState<{ imported: number; skipped: number; errors: { line: number; name: string; message: string }[] } | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const loadProducts = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
      setError("")
    }
    try {
      const payload = (await adminRequest("/api/admin/products")) as { data?: Product[] }
      setProducts(payload.data ?? [])
    } catch (loadError) {
      if (!silent) setError(loadError instanceof Error ? loadError.message : "Unable to load products.")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { void loadProducts() }, [loadProducts])

  // Embedding runs on the queue; keep the table fresh while anything is still in flight.
  const hasActiveJobs = products.some((product) => product.status === "queued" || product.status === "processing")
  useEffect(() => {
    if (!hasActiveJobs) return
    const timer = window.setInterval(() => void loadProducts(true), 5000)
    return () => window.clearInterval(timer)
  }, [hasActiveJobs, loadProducts])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? products.filter((product) => `${product.name} ${product.brand ?? ""} ${product.description} ${(product.category ?? []).join(" ")}`.toLowerCase().includes(needle)) : products
  }, [products, query])

  const stats = {
    total: products.length,
    ready: products.filter((product) => product.status === "complete" && product.is_active).length,
    active: products.filter((product) => product.status === "queued" || product.status === "processing").length,
    failed: products.filter((product) => product.status === "failed").length,
  }

  function setField<K extends keyof ProductForm>(field: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function toggleCategory(category: string) {
    setForm((current) => ({ ...current, category: current.category.includes(category) ? current.category.filter((item) => item !== category) : [...current.category, category] }))
  }

  function startEdit(product: Product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      brand: product.brand ?? "",
      description: product.description,
      price: product.price === null || product.price === undefined ? "" : String(product.price),
      currency: product.currency || "USD",
      purchase_url: product.purchase_url,
      image_url: product.image_url ?? "",
      category: product.category ?? [],
      is_active: product.is_active,
    })
    setMessage("")
    setError("")
    document.getElementById("product-form")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const body = {
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        description: form.description.trim(),
        price: form.price.trim() === "" ? null : Number(form.price),
        currency: form.currency.trim().toUpperCase() || "USD",
        purchase_url: form.purchase_url.trim(),
        image_url: form.image_url.trim() || null,
        category: form.category,
        is_active: form.is_active,
      }
      if (editingId) {
        const payload = (await adminRequest(`/api/admin/products/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })) as { data?: Product }
        if (payload.data) setProducts((current) => current.map((item) => item.id === editingId ? payload.data as Product : item))
        setMessage(`Saved ${body.name}.${payload.data?.status === "queued" ? " Re-embedding for recommendations." : ""}`)
      } else {
        const payload = (await adminRequest("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })) as { data?: Product }
        if (payload.data) setProducts((current) => [payload.data as Product, ...current])
        setMessage(`Added ${body.name}. The AI embedding is queued.`)
      }
      cancelEdit()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the product.")
    } finally {
      setSaving(false)
    }
  }

  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!csvFile) {
      setError("Choose a CSV file to import.")
      return
    }
    setImporting(true)
    setError("")
    setMessage("")
    setImportReport(null)
    try {
      const formData = new FormData()
      formData.append("file", csvFile)
      const payload = (await adminRequest("/api/admin/products/import", { method: "POST", body: formData })) as { imported: number; skipped: number; errors: { line: number; name: string; message: string }[] }
      setImportReport(payload)
      setMessage(`Imported ${payload.imported} product${payload.imported === 1 ? "" : "s"}. Embeddings are queued.`)
      setCsvFile(null)
      const inputElement = document.getElementById("product-csv") as HTMLInputElement | null
      if (inputElement) inputElement.value = ""
      await loadProducts(true)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Unable to import the CSV.")
    } finally {
      setImporting(false)
    }
  }

  async function act(product: Product, action: "toggle" | "retry" | "delete") {
    if (action === "delete" && !window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setPendingId(product.id)
    setError("")
    setMessage("")
    try {
      if (action === "delete") {
        await adminRequest(`/api/admin/products/${product.id}`, { method: "DELETE" })
        setProducts((current) => current.filter((item) => item.id !== product.id))
        if (editingId === product.id) cancelEdit()
        setMessage(`Deleted ${product.name}.`)
      } else if (action === "retry") {
        const payload = (await adminRequest(`/api/admin/products/${product.id}/retry`, { method: "POST" })) as { data?: Product }
        setProducts((current) => current.map((item) => item.id === product.id ? { ...item, status: "queued", error_message: null, ...payload.data } : item))
        setMessage(`Re-queued ${product.name} for embedding.`)
      } else {
        const payload = (await adminRequest(`/api/admin/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !product.is_active }) })) as { data?: Product }
        setProducts((current) => current.map((item) => item.id === product.id ? { ...item, is_active: !product.is_active, ...payload.data } : item))
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update the product.")
    } finally {
      setPendingId(null)
    }
  }

  return (
    <AdminShell active="Products" title="Products" subtitle="Catalog the AI can recommend after a health assessment" actions={<>
      <label className="flex h-12 items-center gap-3 rounded-2xl bg-white px-4 text-[#98999f] shadow-sm shadow-[#238dd4]/5 sm:w-[280px]"><Search className="size-5 text-[#238dd4]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm text-[#292a34] outline-none" placeholder="Search products" /></label>
      <button type="button" onClick={() => void loadProducts()} disabled={loading} className={`${softButton} h-12`}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}Refresh</button>
    </>}>
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          ["Products", stats.total, ShoppingBag, "#dcebfb", "#238dd4"],
          ["Ready to recommend", stats.ready, Sparkles, "#dff8d7", "#2fae19"],
          ["Embedding", stats.active, LoaderCircle, "#eee7ff", "#8b5cf6"],
          ["Failed", stats.failed, X, "#ffe4ec", "#df4f7b"],
        ].map(([label, value, Icon, bg, accent]) => {
          const StatIcon = Icon as typeof ShoppingBag
          return <article key={String(label)} className={card}><div className="flex items-center justify-between"><h3 className="text-[15px]">{String(label)}</h3><span className="grid size-8 place-items-center rounded-xl" style={{ background: String(bg), color: String(accent) }}><StatIcon className="size-4" /></span></div><p className="mt-3 text-2xl font-bold">{loading ? "—" : String(value)}</p></article>
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <form id="product-form" onSubmit={submit} className={`${card} scroll-mt-24 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#dcebfb] text-[#238dd4]">{editingId ? <Pencil className="size-5" /> : <Plus className="size-5" />}</span><div><h2 className="font-bold">{editingId ? "Edit product" : "Add a product"}</h2><p className="text-xs text-[#9a9ba1]">The name, brand, pathways, and description are what the AI matches against.</p></div></div>
            {editingId ? <button type="button" onClick={cancelEdit} className={`${chipButton} bg-[#f3f7fb] text-[#687684] hover:bg-[#eef4fa]`}><X className="size-4" />Cancel</button> : null}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium"><span>Product name</span><input required maxLength={200} value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="e.g. Omega-3 Fish Oil" className={`${input} ring-[#eef1f4]`} /></label>
            <label className="space-y-2 text-sm font-medium"><span>Brand <span className="font-normal text-[#9a9ba1]">(optional)</span></span><input maxLength={120} value={form.brand} onChange={(event) => setField("brand", event.target.value)} placeholder="e.g. HealthiPhy" className={`${input} ring-[#eef1f4]`} /></label>
            <label className="space-y-2 text-sm font-medium md:col-span-2"><span>Description</span><textarea required maxLength={5000} rows={4} value={form.description} onChange={(event) => setField("description", event.target.value)} placeholder="What it is, what it helps with, and who it suits. The AI uses this to decide when to recommend it." className={`${input} ring-[#eef1f4] resize-y`} /></label>
            <div className="grid grid-cols-[1fr_96px] gap-3">
              <label className="space-y-2 text-sm font-medium"><span>Price <span className="font-normal text-[#9a9ba1]">(optional)</span></span><input type="number" min={0} step="0.01" value={form.price} onChange={(event) => setField("price", event.target.value)} placeholder="29.99" className={`${input} ring-[#eef1f4]`} /></label>
              <label className="space-y-2 text-sm font-medium"><span>Currency</span><input maxLength={3} value={form.currency} onChange={(event) => setField("currency", event.target.value.toUpperCase())} className={`${input} ring-[#eef1f4] uppercase`} /></label>
            </div>
            <label className="space-y-2 text-sm font-medium"><span>Buy now link</span><input required type="url" maxLength={2000} value={form.purchase_url} onChange={(event) => setField("purchase_url", event.target.value)} placeholder="https://store.example.com/product" className={`${input} ring-[#eef1f4]`} /></label>
            <label className="space-y-2 text-sm font-medium md:col-span-2"><span>Image link <span className="font-normal text-[#9a9ba1]">(optional)</span></span><input type="url" maxLength={2000} value={form.image_url} onChange={(event) => setField("image_url", event.target.value)} placeholder="https://store.example.com/product.jpg" className={`${input} ring-[#eef1f4]`} /></label>
          </div>

          <fieldset className="mt-5"><legend className="text-sm font-medium">Health pathways <span className="font-normal text-[#9a9ba1]">(which scores this product helps improve)</span></legend><div className="mt-3 flex flex-wrap gap-2">{healthCategories.map((item) => { const checked = form.category.includes(item.key); const Icon = item.icon; return <label key={item.key} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${checked ? "text-[#292a34]" : "bg-[#f3f7fb] text-[#687684] hover:bg-[#eef4fa]"}`} style={checked ? { background: item.bg } : undefined}><input type="checkbox" checked={checked} onChange={() => toggleCategory(item.key)} className="sr-only" /><Icon className="size-3.5" style={checked ? { color: item.accent } : undefined} />{item.key}</label> })}</div></fieldset>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-medium"><span className={`relative h-6 w-11 rounded-full transition-colors ${form.is_active ? "bg-gradient-to-r from-[#238dd4] to-[#33d201]" : "bg-[#cbd9e5]"}`}><input type="checkbox" checked={form.is_active} onChange={(event) => setField("is_active", event.target.checked)} className="sr-only" /><span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0.5"}`} /></span>{form.is_active ? "Available for recommendations" : "Hidden from recommendations"}</label>
            <button type="submit" disabled={saving} className={primaryButton}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : editingId ? <CheckCircle2 className="size-4" /> : <Plus className="size-4" />}{saving ? "Saving..." : editingId ? "Save changes" : "Add product"}</button>
          </div>
        </form>

        <form onSubmit={importCsv} className={`${card} sm:p-6`}>
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#dff8d7] text-[#2fae19]"><FileUp className="size-5" /></span><div><h2 className="font-bold">Import a catalog</h2><p className="text-xs text-[#9a9ba1]">CSV with a header row</p></div></div>
          <p className="mt-4 text-sm leading-6 text-[#687684]">Columns: <b>name</b>, <b>description</b>, <b>url</b> (required), plus optional brand, price, currency, image_url, and categories separated by <code className="rounded bg-[#f3f7fb] px-1">|</code>.</p>
          <label className="mt-4 block space-y-2 text-sm font-medium"><span>CSV file</span><input id="product-csv" type="file" accept=".csv,text/csv" onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)} className={`${input} ring-[#eef1f4] py-2.5 file:mr-3 file:rounded-full file:border-0 file:bg-[#dff8d7] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#1f6b12]`} /></label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={importing || !csvFile} className={primaryButton}>{importing ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" />}{importing ? "Importing..." : "Import products"}</button>
            <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`} download="healthiphy-products-template.csv" className={softButton}>Download template</a>
          </div>
          {importReport ? <div className="mt-4 rounded-2xl bg-[#f3f7fb] p-4 text-sm"><p className="font-semibold">{importReport.imported} imported · {importReport.skipped} skipped</p>{importReport.errors.length ? <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-rose-700">{importReport.errors.map((item) => <li key={`${item.line}-${item.name}`}>Line {item.line}{item.name ? ` (${item.name})` : ""}: {item.message}</li>)}</ul> : null}</div> : null}
        </form>
      </section>

      {message ? <p className="mt-5 flex items-center gap-2 rounded-xl bg-[#dff8d7] px-4 py-3 text-sm text-[#1f6b12]"><CheckCircle2 className="size-4" />{message}</p> : null}
      {error ? <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <section className="mt-6 overflow-hidden rounded-[20px] bg-white shadow-sm shadow-[#238dd4]/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1f4] px-5 py-5 sm:px-6"><div><h2 className="font-bold">Catalog</h2><p className="mt-1 text-xs text-[#9a9ba1]">{filtered.length} of {products.length} shown{hasActiveJobs ? " · refreshing automatically" : ""}</p></div></div>
        {loading ? <div className="flex items-center justify-center py-12 text-sm text-[#9a9ba1]"><LoaderCircle className="mr-2 size-4 animate-spin" />Loading products...</div> : products.length === 0 ? <div className="m-5 flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd9e5] bg-[#f8fbfd] text-sm text-[#7d8994]">No products yet. Add one above or import a CSV.</div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className={tableHead}><tr><th className="px-6 py-3 font-semibold">Product</th><th className="px-4 py-3 font-semibold">Price</th><th className="px-4 py-3 font-semibold">Pathways</th><th className="px-4 py-3 font-semibold">AI status</th><th className="px-4 py-3 font-semibold">Visible</th><th className="px-6 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-[#eef1f4]">{filtered.map((product) => { const busy = pendingId === product.id; return <tr key={product.id} className={`hover:bg-[#f8fbfd] ${editingId === product.id ? "bg-[#f3f7fb]" : ""}`}>
            <td className="px-6 py-4"><div className="flex min-w-72 items-start gap-3">{product.image_url ? <img src={product.image_url} alt="" className="size-12 shrink-0 rounded-xl bg-[#f3f7fb] object-cover" /> : <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#f3f7fb] text-[#a0a1a6]"><ImageOff className="size-5" /></span>}<div className="min-w-0"><p className="font-semibold">{product.name}{product.brand ? <span className="ml-2 text-xs font-normal text-[#9a9ba1]">{product.brand}</span> : null}</p><p className="mt-0.5 line-clamp-2 max-w-md text-xs leading-5 text-[#687684]">{product.description}</p><a href={product.purchase_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#238dd4] hover:underline"><ExternalLink className="size-3" />{hostOf(product.purchase_url)}</a></div></div></td>
            <td className="px-4 py-4 font-semibold">{formatPrice(product)}</td>
            <td className="px-4 py-4"><div className="flex max-w-40 flex-wrap gap-1">{product.category?.length ? product.category.map((item) => <span key={item} className="rounded-lg bg-[#f3f7fb] px-2 py-0.5 text-xs text-[#687684]">{item}</span>) : <span className="text-xs text-[#9a9ba1]">All pathways</span>}</div></td>
            <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[product.status] ?? statusStyles.queued}`}>{product.status === "processing" || product.status === "queued" ? <LoaderCircle className="size-3 animate-spin" /> : null}{product.status === "complete" ? "Ready" : product.status}</span>{product.status === "failed" && product.error_message ? <p className="mt-1.5 max-w-xs text-xs leading-5 text-rose-700/90" title={product.error_message}>{product.error_message}</p> : null}</td>
            <td className="px-4 py-4"><button type="button" role="switch" aria-checked={product.is_active} disabled={busy} onClick={() => void act(product, "toggle")} title={product.is_active ? "Hide from recommendations" : "Show in recommendations"} className="inline-flex items-center gap-2 text-xs font-semibold disabled:opacity-60"><span className={`relative h-5 w-9 rounded-full transition-colors ${product.is_active ? "bg-gradient-to-r from-[#238dd4] to-[#33d201]" : "bg-[#cbd9e5]"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${product.is_active ? "translate-x-4" : "translate-x-0.5"}`} /></span><span className={product.is_active ? "text-[#238dd4]" : "text-[#9a9ba1]"}>{product.is_active ? "On" : "Off"}</span></button></td>
            <td className="px-6 py-4"><div className="flex justify-end gap-2">{product.status === "failed" ? <button type="button" disabled={busy} onClick={() => void act(product, "retry")} className={`${chipButton} bg-[#dcebfb] text-[#238dd4] hover:bg-[#c9e0f7]`}><RotateCcw className="size-4" />Retry</button> : null}<button type="button" disabled={busy} onClick={() => startEdit(product)} className={`${chipButton} bg-[#f3f7fb] text-[#687684] hover:bg-[#eef4fa]`}><Pencil className="size-4" />Edit</button><button type="button" disabled={busy} onClick={() => void act(product, "delete")} className={`${chipButton} bg-rose-50 text-rose-700 hover:bg-rose-100`}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</button></div></td>
          </tr> })}</tbody></table>{filtered.length === 0 ? <p className="p-10 text-center text-sm text-[#9a9ba1]">No products match your search.</p> : null}</div>
        )}
      </section>
    </AdminShell>
  )
}
