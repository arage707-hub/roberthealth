"use client"

import { Apple, Brain, Dna, Dumbbell, LoaderCircle, MoreVertical, ShieldAlert, Stethoscope } from "lucide-react"
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { useLatestAssessment } from "@/lib/use-latest-assessment"

const chartConfig = {
  value: { label: "Health percentage" },
  nutrition: { label: "Nutrition", color: "var(--chart-1)" },
  toxin: { label: "Toxin", color: "var(--chart-2)" },
  mental: { label: "Mental", color: "var(--chart-3)" },
  physical: { label: "Physical", color: "var(--chart-4)" },
  genetic: { label: "Genetic", color: "var(--chart-5)" },
  medical: { label: "Medical", color: "var(--primary)" },
} satisfies ChartConfig

const categoryDefinitions = [
  { key: "nutrition", label: "Nutrition", short: "Nutrition", column: "nutrition_percentage", icon: Apple },
  { key: "toxin", label: "Toxin", short: "Toxin", column: "toxin_percentage", icon: ShieldAlert },
  { key: "mental", label: "Mental", short: "Mental", column: "mental_percentage", icon: Brain },
  { key: "physical", label: "Physical", short: "Physical", column: "physical_percentage", icon: Dumbbell },
  { key: "genetic", label: "Genetic", short: "Genetic", column: "genetic_percentage", icon: Dna },
  { key: "medical", label: "Medical", short: "Medical", column: "medical_percentage", icon: Stethoscope },
] as const

export function PatientsStatistics() {
  const { assessment, loading, error } = useLatestAssessment()

  const healthStats = categoryDefinitions.map((category) => ({
    ...category,
    value: assessment?.[category.column] ?? 0,
  }))

  return (
    <section className="flex min-w-0 flex-col rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Your Health Summary</h2>
          <p className="text-sm text-muted-foreground">After answering the questionnaire: how healthy you are, what to improve, and AI suggestions.</p>
        </div>
        <div className="flex items-center gap-2">
          {assessment ? (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
              Overall {assessment.health_percentage}%
            </span>
          ) : null}
          <button
            type="button"
            aria-label="More options"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <MoreVertical className="size-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 size-4 animate-spin" /> Loading your health summary...
        </div>
      ) : error ? (
        <div className="flex h-[240px] items-center justify-center px-6 text-center text-sm text-destructive">
          {error}
        </div>
      ) : !assessment ? (
        <div className="flex h-[240px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
          Complete the health assessment to see your category percentages.
        </div>
      ) : (
      <ChartContainer config={chartConfig} className="mt-4 h-[240px] w-full">
        <BarChart data={healthStats} margin={{ top: 28, left: 0, right: 0, bottom: 20 }} barCategoryGap="22%">
          <defs>
            {healthStats.map((d) => (
              <linearGradient key={d.key} id={`grad-${d.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`var(--color-${d.key})`} stopOpacity={0.95} />
                <stop offset="100%" stopColor={`var(--color-${d.key})`} stopOpacity={0.25} />
              </linearGradient>
            ))}
          </defs>
          <XAxis dataKey="short" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
          <YAxis hide domain={[0, 100]} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {healthStats.map((d) => (
              <Cell key={d.key} fill={`url(#grad-${d.key})`} stroke={`var(--color-${d.key})`} strokeOpacity={0.4} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              offset={10}
              className="fill-foreground text-sm font-semibold"
              formatter={(value) => `${Number(value)}%`}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      )}

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4">
        {categoryDefinitions.map(({ key, icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="flex size-5 items-center justify-center rounded-md"
              style={{ backgroundColor: `var(--color-${key})`, opacity: 0.9 }}
            >
              <Icon className="size-3 text-foreground/70" />
            </span>
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
