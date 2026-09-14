import type { LucideIcon } from "lucide-react"
import { Activity, Droplet, Gauge, Heart, ShieldCheck, Sun } from "lucide-react"

export type BiometricReading = {
  id: string
  marker_key: string
  value: number | string | null
  value_text: string | null
  unit: string | null
  measured_at: string | null
  source: "manual" | "document"
  document_id: string | null
  note: string | null
  created_at: string
}

export type BiometricStatus = "optimal" | "attention" | null

export type BiometricMarker = {
  key: string
  name: string
  description: string
  unit: string | null
  target: string
  kind: "number" | "text"
  icon: string
  pathways: string[]
  latest: BiometricReading | null
  status: BiometricStatus
  history: BiometricReading[]
}

export type BiometricSection = { key: string; title: string | null; markers: BiometricMarker[] }
export type BiometricPanel = { key: string; title: string; eyebrow: string | null; sections: BiometricSection[] }

export type BiometricDocument = {
  id: string
  original_filename: string
  mime_type: string | null
  status: "queued" | "processing" | "complete" | "failed"
  error_message: string | null
  readings_count: number
  unmatched: { label: string; value: number | null; value_text: string; unit: string }[] | null
  created_at: string
  updated_at: string
}

export type BiometricsOverview = {
  panels: BiometricPanel[]
  summary: { total_markers: number; recorded: number; optimal: number; attention: number }
  documents: BiometricDocument[]
}

export const markerIcons: Record<string, LucideIcon> = {
  activity: Activity,
  shield: ShieldCheck,
  heart: Heart,
  droplet: Droplet,
  sun: Sun,
  gauge: Gauge,
}

/** Formats a stored numeric value without trailing zeros. */
export function formatValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return ""
  const number = Number(value)
  if (Number.isNaN(number)) return String(value)
  return number.toLocaleString(undefined, { maximumFractionDigits: 3 })
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return ""
  const parsed = new Date(date.length === 10 ? `${date}T00:00:00` : date)
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}
