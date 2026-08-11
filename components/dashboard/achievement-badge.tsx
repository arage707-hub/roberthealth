import { BrainCircuit, CheckCheck, ClipboardCheck, Crown, Diamond, Flame, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const designs: Record<string, { Icon: LucideIcon; ring: string; core: string; glow: string }> = {
  starter: { Icon: ClipboardCheck, ring: "from-slate-100 via-slate-500 to-slate-200", core: "from-slate-700 to-slate-950", glow: "shadow-slate-400/50" },
  on_track: { Icon: Flame, ring: "from-orange-200 via-amber-700 to-orange-300", core: "from-amber-700 to-stone-950", glow: "shadow-amber-600/50" },
  analyst: { Icon: BrainCircuit, ring: "from-yellow-100 via-yellow-500 to-amber-800", core: "from-amber-500 to-yellow-950", glow: "shadow-yellow-500/50" },
  optimized: { Icon: CheckCheck, ring: "from-fuchsia-200 via-violet-600 to-purple-950", core: "from-violet-500 to-purple-950", glow: "shadow-violet-500/50" },
  health_champion: { Icon: Crown, ring: "from-rose-200 via-red-600 to-red-950", core: "from-red-500 to-rose-950", glow: "shadow-red-500/50" },
  ultimate: { Icon: Diamond, ring: "from-cyan-200 via-fuchsia-500 to-amber-300", core: "from-slate-700 via-purple-950 to-black", glow: "shadow-fuchsia-500/60" },
}

export function AchievementBadge({ code, name, unlocked, compact = false }: { code: string; name: string; unlocked: boolean; compact?: boolean }) {
  const design = designs[code] ?? designs.starter
  const Icon = design.Icon
  return <span className={cn("flex flex-col items-center text-center", !unlocked && "grayscale opacity-45")}>
    <span className={cn("relative isolate flex items-center justify-center rounded-full bg-gradient-to-br p-[5px] shadow-lg", design.ring, design.glow, compact ? "size-14" : "size-[78px]")}>
      <span className={cn("absolute inset-[5px] rounded-full border border-white/50 bg-gradient-to-br", design.core)} />
      <span className="badge-shine absolute inset-[5px] overflow-hidden rounded-full" aria-hidden="true"><span className="absolute -inset-y-4 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/75 to-transparent blur-[1px]" /></span>
      <span className="absolute top-2 z-10 text-[7px] tracking-[2px] text-white/80">✦ ✦ ✦</span>
      <Icon className={cn("relative z-10 text-white drop-shadow-md", compact ? "size-6" : "size-8")} strokeWidth={1.8} />
      <span className={cn("absolute -bottom-1 z-20 rounded-full border border-white/60 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide text-white", unlocked ? "bg-emerald-500" : "bg-slate-700")}>{unlocked ? "Earned" : "Locked"}</span>
    </span>
    {!compact ? <span className="mt-2 text-[11px] font-bold leading-tight text-foreground">{name}</span> : null}
  </span>
}
