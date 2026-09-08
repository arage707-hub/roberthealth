"use client"

import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { AlertCircle, CheckCircle2, Eye, EyeOff, LoaderCircle, Lock, TriangleAlert } from "lucide-react"

/** Shared building blocks for the sign-in, sign-up and recovery screens, styled to match the dashboard theme. */

export const fieldClass =
  "h-12 w-full rounded-2xl border border-transparent bg-[#f3f7fb] pl-11 pr-4 text-sm text-[#292a34] transition placeholder:text-[#9a9ba1] focus:border-[#238dd4] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#238dd4]/15"

export const linkClass = "font-semibold text-[#238dd4] transition hover:text-[#1b74b0] hover:underline underline-offset-4"

type FieldProps = { label: string; icon: LucideIcon; id: string; hint?: ReactNode; trailing?: ReactNode } & InputHTMLAttributes<HTMLInputElement>

export function Field({ label, icon: Icon, id, hint, trailing, className = "", ...props }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-semibold text-[#292a34]">{label}</label>
        {hint}
      </div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#238dd4]" />
        <input id={id} name={id} className={`${fieldClass} ${trailing ? "pr-12" : ""} ${className}`} {...props} />
        {trailing ? <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</span> : null}
      </div>
    </div>
  )
}

export function PasswordField(props: Omit<FieldProps, "icon" | "type" | "trailing">) {
  const [visible, setVisible] = useState(false)
  return (
    <Field
      {...props}
      icon={Lock}
      type={visible ? "text" : "password"}
      trailing={
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Hide password" : "Show password"} className="grid size-9 place-items-center rounded-xl text-[#687684] transition hover:bg-[#eef4fa] hover:text-[#292a34]">
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  )
}

export function PrimaryButton({ loading = false, children, disabled, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      {...props}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#238dd4] to-[#33d201] text-sm font-semibold text-white shadow-lg shadow-[#238dd4]/25 transition hover:opacity-95 hover:shadow-xl hover:shadow-[#238dd4]/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${className}`}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

export function Checkbox({ label, ...props }: { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[#687684]">
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-[#cbd9e5] accent-[#238dd4]" {...props} />
      <span>{label}</span>
    </label>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="inline-flex items-center gap-2 rounded-full bg-[#eef4fa] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#238dd4]">{children}</p>
}

export function Heading({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <>
      <h2 className="mt-4 text-[28px] font-bold leading-tight tracking-tight text-[#292a34] sm:text-3xl">{title}</h2>
      {lead ? <p className="mt-2 text-sm leading-6 text-[#687684]">{lead}</p> : null}
    </>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{children}</span></p>
}

export function Note({ tone, children }: { tone: "success" | "warning"; children: ReactNode }) {
  const success = tone === "success"
  const Icon = success ? CheckCircle2 : TriangleAlert
  return (
    <div className={`flex items-start gap-3 rounded-2xl px-4 py-4 text-sm leading-6 ${success ? "bg-[#dff8d7] text-[#1f6b12]" : "bg-amber-50 text-amber-800"}`}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-2">{children}</div>
    </div>
  )
}
