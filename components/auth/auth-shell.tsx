import type { ReactNode } from "react"

const stats = [
  { value: "10,000+", label: "Active Users" },
  { value: "87%", label: "Success Rate" },
  { value: "2.5M+", label: "Health Insights" },
]

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-6 lg:p-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-xl md:grid-cols-2">
        {/* Left brand panel */}
        <aside
          className="relative hidden flex-col justify-between overflow-hidden p-10 text-sidebar-foreground md:flex"
          style={{ background: "linear-gradient(135deg, #238dd4 0%, #33d201 100%)" }}
        >
          {/* ambient glows */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 top-0 h-72 w-72 rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(circle, oklch(0.55 0.08 250 / 0.55), transparent 70%)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, oklch(0.55 0.09 20 / 0.45), transparent 70%)" }}
          />

          <div className="relative z-10 flex flex-col items-center gap-2.5 text-center">
            <img src="/health.png" alt="HealthiPhy" className="h-[240px] w-[240px] rounded-lg object-contain" />
           
          </div>

          <div className="relative z-10 space-y-5">
            <h1 className="text-pretty text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
              Science-backed insights for a healthier you.
            </h1>
            <p className="max-w-sm text-pretty text-sm leading-relaxed text-sidebar-foreground/70">
              HealthiPhy combines AI-driven tools and community support to help you make informed decisions about your wellbeing.
            </p>
            <div className="flex gap-3 pt-2">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col rounded-2xl border border-sidebar-border bg-sidebar-accent/40 px-4 py-3"
                >
                  <span className="text-lg font-bold leading-none">{s.value}</span>
                  <span className="mt-1 text-xs text-sidebar-foreground/60">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs text-sidebar-foreground/50">© 2026 HealthiPhy</p>
        </aside>

        {/* Right form panel */}
        <section className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">{children}</section>
      </div>
    </main>
  )
}
