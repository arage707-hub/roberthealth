import { avatarTone, initials } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

export function UserAvatar({
  name,
  size = 40,
  className,
}: {
  name: string
  size?: number
  className?: string
}) {
  const tone = avatarTone(name)
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", className)}
      style={{
        width: size,
        height: size,
        background: tone.bg,
        color: tone.fg,
        fontSize: size * 0.36,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
