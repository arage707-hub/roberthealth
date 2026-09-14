"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, ExternalLink, ImageOff, ShoppingBag, Sparkles } from "lucide-react"
import { categoryFor, healthCategories } from "@/lib/health-categories"
import type { RecommendedProduct } from "@/lib/use-dashboard-data"

function formatPrice(product: RecommendedProduct["product"]) {
  if (product.price === null || product.price === undefined || product.price === "") return null
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
    return ""
  }
}

export function ProductCard({ item }: { item: RecommendedProduct }) {
  const pathway = categoryFor(item.category)
  const Icon = pathway.icon
  const price = formatPrice(item.product)
  return (
    <article className="flex flex-col overflow-hidden rounded-[20px] border border-[#eef1f4] bg-white transition hover:shadow-md hover:shadow-[#238dd4]/10">
      <div className="relative aspect-[4/3] bg-[#f3f7fb]">
        {item.product.image_url ? <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-contain p-4" loading="lazy" /> : <span className="grid h-full w-full place-items-center text-[#a0a1a6]"><ImageOff className="size-8" /></span>}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold" style={{ background: pathway.bg, color: pathway.accent }}><Icon className="size-3.5" />{pathway.key}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h3 className="line-clamp-2 font-bold leading-5">{item.product.name}</h3>{item.product.brand ? <p className="mt-0.5 text-xs text-[#9a9ba1]">{item.product.brand}</p> : null}</div>
          {price ? <span className="shrink-0 rounded-lg bg-[#f3f7fb] px-2.5 py-1 text-sm font-bold">{price}</span> : null}
        </div>
        <p className="mt-3 text-sm leading-6 text-[#687684]"><span className="font-semibold text-[#292a34]">Why this helps: </span>{item.reason}</p>
        {item.supports_task ? <p className="mt-2 inline-flex items-start gap-1.5 text-xs leading-5 text-[#238dd4]"><Sparkles className="mt-0.5 size-3.5 shrink-0" /><span>Supports your choice: <b>{item.supports_task}</b></span></p> : null}
        <div className="mt-auto pt-4">
          <a href={item.product.purchase_url} target="_blank" rel="noopener noreferrer sponsored" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#238dd4] to-[#33d201] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
            <ShoppingBag className="size-4" />Buy now<span className="text-xs font-normal text-white/80">· {hostOf(item.product.purchase_url)}</span><ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  )
}

const benefitWords = /\b(support|supports|helps?|promot\w*|improv\w*|reduc\w*|boost\w*|maintain\w*|enhanc\w*|essential|provid\w*|restor\w*|protect\w*|balanc\w*|optim\w*|relie\w*|strengthen\w*|nourish\w*|energ\w*|calm\w*|sleep)\b/i

// Store boilerplate that is noise inside a product description (sample requests, video links, FDA footers).
const junkLine = /^(request a free sample|in order to receive a sample|click here|watch video|read more here|successful outcome study|patent number|consider the following|\*+\s*this statement has not been evaluated|\*?\s*https?:\/\/)/i

/**
 * Splits a raw catalog description into the store's own "Benefits" bullets (when it has
 * such a section) and the remaining body text, with boilerplate lines removed.
 */
export function splitDescription(description: string): { benefits: string[]; body: string } {
  const benefits: string[] = []
  const body: string[] = []
  let inBenefits = false
  for (const raw of description.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === "") {
      inBenefits = false
      continue
    }
    if (/^benefits:?$/i.test(line)) {
      inBenefits = true
      continue
    }
    if (junkLine.test(line)) {
      inBenefits = false
      continue
    }
    const cleaned = line.replace(/\s*\*+\s*$/, "").replace(/\.\*(\s|$)/g, ".$1").trim()
    if (inBenefits && cleaned.length >= 15 && cleaned.length <= 220) benefits.push(cleaned)
    else body.push(cleaned)
  }
  return { benefits, body: body.join(" ").replace(/\s+/g, " ").trim() }
}

/** Up to `max` benefits: the store's bullets when present, otherwise benefit-style sentences. */
export function extractBenefits(description: string, max = 4): string[] {
  const { benefits, body } = splitDescription(description)
  if (benefits.length) return benefits.slice(0, max)

  const sentences = body
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 30 && sentence.length <= 220)
  const picked: string[] = []
  for (const sentence of sentences) {
    if (benefitWords.test(sentence) && !picked.includes(sentence)) picked.push(sentence)
    if (picked.length >= max) break
  }
  return picked
}

/**
 * Product strip shown under a health choice the product supports. Collapsed it is one
 * line (image, name, why it helps, price, buy). Clicking it expands the product's
 * details: key benefits from the description, how it helps this member, and pathways.
 */
export function ProductBar({ item }: { item: RecommendedProduct }) {
  const [open, setOpen] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const price = formatPrice(item.product)
  const { benefits, description } = useMemo(() => ({ benefits: extractBenefits(item.product.description), description: splitDescription(item.product.description).body }), [item.product.description])
  const panelId = `product-details-${item.id}`
  const buyLink = (
    <a href={item.product.purchase_url} target="_blank" rel="noopener noreferrer sponsored" title={`Buy ${item.product.name} at ${hostOf(item.product.purchase_url)}`} onClick={(event) => event.stopPropagation()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#238dd4] to-[#33d201] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90">
      <ShoppingBag className="size-3.5" />Buy<span className="hidden sm:inline"> now</span>
    </a>
  )

  return (
    <div className={`w-full min-w-0 max-w-full overflow-hidden rounded-xl border transition ${open ? "border-[#238dd4]/40 bg-white shadow-sm shadow-[#238dd4]/10" : "border-[#e2eaf1] bg-[#f8fbfd]"}`}>
      <div className="flex w-full min-w-0 items-center gap-2 py-2 pl-2 pr-2 text-sm sm:gap-3 sm:pr-2.5">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={panelId} className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left sm:gap-3">
          {item.product.image_url ? <img src={item.product.image_url} alt="" className="size-11 shrink-0 rounded-lg bg-white object-contain p-0.5" loading="lazy" /> : <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white text-[#a0a1a6]"><ImageOff className="size-4" /></span>}
          <span className="block min-w-0 flex-1 overflow-hidden">
            <span className="block truncate"><span className="font-semibold text-[#292a34]">{item.product.name}</span><span className="text-[#687684]"> · {item.reason}</span></span>
            <span className="mt-0.5 block truncate text-xs text-[#9a9ba1]"><span className="sm:hidden">{price ? `${price} · ` : ""}</span>{open ? "Hide details" : "Tap for details and benefits"}</span>
          </span>
          <ChevronDown className={`size-4 shrink-0 text-[#9a9ba1] transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {price ? <span className="hidden shrink-0 rounded-lg bg-white px-2.5 py-1 text-sm font-bold sm:inline-block">{price}</span> : null}
        {buyLink}
      </div>

      {open ? (
        <div id={panelId} className="min-w-0 border-t border-[#eef1f4] px-3 pb-4 pt-3 sm:px-4">
          <div className="grid min-w-0 gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
            <a href={item.product.purchase_url} target="_blank" rel="noopener noreferrer sponsored" className="grid aspect-square place-items-center rounded-xl bg-[#f3f7fb]" aria-label={`View ${item.product.name}`}>
              {item.product.image_url ? <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-contain p-2" /> : <ImageOff className="size-8 text-[#a0a1a6]" />}
            </a>
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-bold leading-5">{item.product.name}</p>{item.product.brand ? <p className="text-xs text-[#9a9ba1]">{item.product.brand}</p> : null}</div>
                {price ? <span className="rounded-lg bg-[#f3f7fb] px-2.5 py-1 text-sm font-bold">{price}</span> : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">{(item.product.category ?? []).map((key) => { const meta = categoryFor(key); return <span key={key} className="rounded-lg px-2 py-0.5 text-[11px] font-semibold" style={{ background: meta.bg, color: meta.accent }}>{key}</span> })}</div>

              <p className="mt-3 break-words rounded-xl bg-[#dff8d7]/60 px-3 py-2 text-sm leading-6 text-[#292a34]"><span className="font-semibold">How it helps you: </span>{item.reason}</p>

              {benefits.length ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#238dd4]">Key benefits</p>
                  <ul className="mt-1.5 space-y-1.5">{benefits.map((benefit) => <li key={benefit} className="flex min-w-0 gap-2 text-sm leading-6 text-[#292a34]"><Sparkles className="mt-1.5 size-3.5 shrink-0 text-[#2fae19]" /><span className="min-w-0 break-words">{benefit}</span></li>)}</ul>
                </div>
              ) : null}

              {description ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#238dd4]">About this product</p>
                  <p className={`mt-1 break-words text-sm leading-6 text-[#687684] ${showFullDescription ? "" : "line-clamp-3"}`}>{description}</p>
                  {description.length > 240 ? <button type="button" onClick={() => setShowFullDescription((value) => !value)} className="mt-1 text-xs font-semibold text-[#238dd4] hover:underline">{showFullDescription ? "Show less" : "Read more"}</button> : null}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a href={item.product.purchase_url} target="_blank" rel="noopener noreferrer sponsored" className="inline-flex max-w-full items-center gap-2 rounded-xl bg-gradient-to-r from-[#238dd4] to-[#33d201] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"><ShoppingBag className="size-4 shrink-0" />Buy now<span className="truncate text-xs font-normal text-white/80">· {hostOf(item.product.purchase_url)}</span><ExternalLink className="size-3.5 shrink-0" /></a>
                <p className="text-[11px] leading-5 text-[#a0a1a6]">General wellness support, not medical advice.</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * "Recommended Product Choices": catalog products the AI picked to help the member act on
 * their health choices, grouped by pathway. Used on the dashboard and the Health Choices page.
 */
export function RecommendedProducts({ products, loading, generating, hasTasks, initialLimit = 6, matching = false, onMatch }: { products: RecommendedProduct[]; loading: boolean; generating: boolean; hasTasks: boolean; initialLimit?: number; matching?: boolean; onMatch?: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [pathway, setPathway] = useState("All")

  // One pick per pathway first (best rank), then the rest, so the collapsed view spans the plan.
  const ordered = useMemo(() => {
    const sorted = [...products].sort((a, b) => a.rank - b.rank)
    const first: RecommendedProduct[] = []
    const rest: RecommendedProduct[] = []
    for (const item of sorted) {
      if (!first.some((chosen) => chosen.category === item.category)) first.push(item)
      else rest.push(item)
    }
    const byPathway = [...first, ...rest].sort((a, b) => {
      const order = healthCategories.findIndex((c) => c.key === a.category) - healthCategories.findIndex((c) => c.key === b.category)
      return first.includes(a) === first.includes(b) ? order : first.includes(a) ? -1 : 1
    })
    return byPathway
  }, [products])

  const filtered = pathway === "All" ? ordered : ordered.filter((item) => item.category === pathway)
  const visible = expanded || pathway !== "All" ? filtered : filtered.slice(0, initialLimit)
  const pathwaysPresent = healthCategories.filter((c) => products.some((item) => item.category === c.key))

  if (!loading && !generating && !matching && products.length === 0) {
    if (!hasTasks) return null
    return (
      <section className="rounded-[20px] bg-white px-4 pb-6 pt-6 sm:px-6">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#dcebfb] text-[#238dd4]"><ShoppingBag className="size-5" /></span><div><h2 className="font-bold">Recommended Product Choices</h2><p className="mt-0.5 text-xs text-[#93949a]">Products that help you follow through on your health choices</p></div></div>
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-[#cbd9e5] bg-[#f8fbfd] px-6 py-8 text-center text-sm text-[#7d8994]">
          <p>No product suggestions yet for this plan.</p>
          {onMatch ? <button type="button" onClick={onMatch} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#238dd4] to-[#33d201] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"><Sparkles className="size-4" />Find products for my choices</button> : null}
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-[20px] bg-white px-4 pb-6 pt-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#dcebfb] text-[#238dd4]"><ShoppingBag className="size-5" /></span><div><h2 className="font-bold">Recommended Product Choices</h2><p className="mt-0.5 text-xs text-[#93949a]">{loading || generating || matching ? "Matching products to your plan..." : "Products that help you follow through on your health choices"}</p></div></div>
        {pathwaysPresent.length > 1 ? (
          <div className="max-w-full">
            <div role="group" aria-label="Filter products by pathway" className="flex flex-wrap gap-1 rounded-2xl bg-[#f3f7fb] p-1 sm:inline-flex sm:rounded-full">
              {["All", ...pathwaysPresent.map((c) => c.key)].map((key) => { const active = pathway === key; const meta = key === "All" ? null : categoryFor(key); return <button key={key} type="button" onClick={() => setPathway(key)} aria-pressed={active} className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${active ? "bg-white text-[#292a34] shadow-sm" : "text-[#687684] hover:text-[#292a34]"}`} style={active && meta ? { background: meta.bg } : undefined}>{key}</button> })}
            </div>
          </div>
        ) : null}
      </div>

      {loading || ((generating || matching) && products.length === 0) ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="animate-pulse overflow-hidden rounded-[20px] border border-[#eef1f4]"><div className="aspect-[4/3] bg-[#eef4fa]" /><div className="space-y-3 p-4"><div className="h-4 w-2/3 rounded bg-[#eef4fa]" /><div className="h-3 w-full rounded bg-[#eef4fa]" /><div className="h-3 w-5/6 rounded bg-[#eef4fa]" /><div className="mt-2 h-9 rounded-xl bg-[#eef4fa]" /></div></div>)}</div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <ProductCard key={item.id} item={item} />)}</div>
      )}

      {pathway === "All" && filtered.length > initialLimit ? (
        <div className="mt-5 flex justify-center border-t border-[#eef1f4] pt-5"><button type="button" onClick={() => setExpanded((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-[#eef4fa] px-5 py-2.5 text-sm font-semibold text-[#238dd4] transition hover:bg-[#dcebfb]">{expanded ? <>Show fewer <ChevronUp className="size-4" /></> : <>View all product choices ({filtered.length}) <ChevronDown className="size-4" /></>}</button></div>
      ) : null}

      <p className="mt-5 text-center text-[11px] leading-5 text-[#a0a1a6]">Product suggestions support general wellness and are not medical advice. Purchases are made on the seller&apos;s website.</p>
    </section>
  )
}
