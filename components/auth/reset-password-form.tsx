"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"

const fieldClass =
  "w-full rounded-full border border-transparent bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"

export function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseClient()
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || Boolean(session)) setReady(true)
    })

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setError(sessionError.message)
      if (data.session) setReady(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.")
      return
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.")
      return
    }

    setSaving(true)
    try {
      const { error: updateError } = await getSupabaseClient().auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(true)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update your password.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password recovery</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Choose a new password</h2>
      <p className="mt-2 text-sm text-muted-foreground">Create a strong password you don&apos;t use on other websites.</p>

      {success ? (
        <div className="mt-6 space-y-4 rounded-2xl bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <p>Your password has been updated. You can now sign in.</p>
          <Link href="/login" className="font-semibold underline underline-offset-2">Go to sign in</Link>
        </div>
      ) : !ready ? (
        <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">This reset link is invalid or has expired. Request a new password-reset link.</div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">New password</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm new password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={fieldClass} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button type="submit" disabled={saving} className="w-full rounded-full bg-foreground px-4 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Updating password..." : "Update password"}</button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground"><Link href="/forgot-password" className="font-semibold text-foreground underline underline-offset-2">Request a new link</Link></p>
    </div>
  )
}
