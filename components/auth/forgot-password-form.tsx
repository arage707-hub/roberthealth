"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { Mail } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { ErrorNote, Eyebrow, Field, Heading, Note, PrimaryButton, linkClass } from "./auth-ui"

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
      <Eyebrow>Password recovery</Eyebrow>
      <Heading title="Reset your password" lead="Enter your email and we'll send you a secure link to choose a new password." />

      {sent ? (
        <div className="mt-6">
          <Note tone="success">
            <p>If an account exists for that email, a password-reset link has been sent. Check your inbox and spam folder.</p>
          </Note>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Email" id="email" icon={Mail} type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@healthiphy.ai" />
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          <PrimaryButton loading={sending}>{sending ? "Sending link..." : "Send reset link"}</PrimaryButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-[#687684]"><Link href="/login" className={linkClass}>Back to sign in</Link></p>
    </div>
  )
}
