import type { ReactNode } from "react"
import { HeartPulse, ShieldCheck, Sparkles } from "lucide-react"

const features = [
  { icon: Sparkles, title: "AI health guide", text: "Chat with a guide that already knows your assessment." },
  { icon: HeartPulse, title: "Six personalized pathways", text: "Nutrition, physical, mental, toxin, genetic and medical scores." },
  { icon: ShieldCheck, title: "Private and secure", text: "Your health data stays yours, always." },
]

const stats = [
  { value: "10,000+", label: "Active users" },
  { value: "87%", label: "Success rate" },
  { value: "2.5M+", label: "Health insights" },
]

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#f3f7fb] p-4 text-[#292a34] sm:p-6 lg:p-10">
      {/* Ambient glows in the brand colors */}
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 size-[420px] rounded-full bg-[#238dd4]/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 size-[460px] rounded-full bg-[#33d201]/15 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-[0_30px_80px_-30px_rgba(35,141,212,0.35)] lg:grid-cols-[1.05fr_1fr]">
        {/* Brand panel: photo under a blue-to-green wash, desktop only */}
        <aside className="relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <img src="/nut-female.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#238dd4]/92 via-[#238dd4]/78 to-[#33d201]/82" />

          <div className="relative z-10">
            <span className="inline-flex rounded-2xl bg-white px-3 py-2.5 shadow-lg shadow-black/10">
              <img src="/health.png" alt="HealthiPhy.ai" className="h-9 w-auto object-contain" />
            </span>
          </div>

          <div className="relative z-10 space-y-7">
            <div>
              <h1 className="text-pretty text-4xl font-bold leading-[1.15] tracking-tight">Science-backed insights for a healthier you.</h1>
              <p className="mt-3 max-w-md text-pretty text-sm leading-6 text-white/80">HealthiPhy combines AI-driven tools and community support to help you make informed decisions about your wellbeing.</p>
            </div>

            <ul className="space-y-2.5">
              {features.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3 rounded-2xl bg-white/12 p-3 ring-1 ring-white/20 backdrop-blur-sm">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[#238dd4]"><Icon className="size-4" /></span>
                  <div><p className="text-sm font-semibold">{title}</p><p className="text-xs leading-5 text-white/75">{text}</p></div>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-3 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white/12 px-4 py-3 ring-1 ring-white/20 backdrop-blur-sm">
                  <p className="text-lg font-bold leading-none">{stat.value}</p>
                  <p className="mt-1.5 text-[11px] text-white/75">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs text-white/70">© 2026 HealthiPhy.ai</p>
        </aside>

        {/* Form panel */}
        <section className="flex flex-col p-6 sm:p-10 lg:p-12">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <img src="/health.png" alt="HealthiPhy.ai" className="h-9 w-auto object-contain" />
            <span aria-hidden className="h-1.5 w-16 rounded-full bg-gradient-to-r from-[#238dd4] to-[#33d201]" />
          </div>
          <div className="my-auto">{children}</div>
        </section>
      </div>
    </main>
  )
}
