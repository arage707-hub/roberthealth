"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"

const fieldClass =
  "w-full rounded-full border border-transparent bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://roberthealth.vercel.app").replace(/\/$/, "")

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSending(true)

    try {
      const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password`,
      })
      if (resetError) throw resetError
      setSent(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send the password reset email.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password recovery</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Reset your password</h2>
      <p className="mt-2 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a secure link to choose a new password.</p>

      {sent ? (
        <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          If an account exists for that email, a password-reset link has been sent. Check your inbox and spam folder.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@healthiphy.ai" className={fieldClass} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button type="submit" disabled={sending} className="w-full rounded-full bg-foreground px-4 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {sending ? "Sending link..." : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground"><Link href="/login" className="font-semibold text-foreground underline underline-offset-2">Back to sign in</Link></p>
    </div>
  )
}
