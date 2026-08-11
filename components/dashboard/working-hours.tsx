"use client"

import { ChevronDown } from "lucide-react"
import { Label, Pie, PieChart } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { workingHours } from "@/lib/dashboard-data"

const chartConfig = {
  reception: { label: "Patient reception", color: "var(--chart-5)" },
  document: { label: "Document processing", color: "var(--chart-2)" },
  online: { label: "Online consultations", color: "var(--chart-3)" },
} satisfies ChartConfig

const data = workingHours.map((w) => ({ ...w, fill: `var(--color-${w.key})` }))
const total = 40

export function WorkingHours() {
  return (
    <section className="flex min-w-0 flex-col rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">AI Suggestions</h2>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          Week
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </div>

      <ChartContainer config={chartConfig} className="mx-auto my-2 aspect-square h-[190px] w-[190px]">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={62} outerRadius={82} strokeWidth={4} paddingAngle={3} cornerRadius={6}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 6} className="fill-foreground text-2xl font-bold">
                        {total}
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 14} className="fill-muted-foreground text-xs">
                        Total Hours
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="mt-2 space-y-2.5">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2.5 text-sm">
            <span className="w-5 font-semibold text-foreground">{d.value}</span>
            <span className="size-2 rounded-full" style={{ backgroundColor: d.fill }} />
            <span className="text-muted-foreground">{d.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
