"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { ErrorNote, Eyebrow, Heading, Note, PasswordField, PrimaryButton, linkClass } from "./auth-ui"

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
      <Eyebrow>Password recovery</Eyebrow>
      <Heading title="Choose a new password" lead="Create a strong password you don't use on other websites." />

      {success ? (
        <div className="mt-6">
          <Note tone="success">
            <p>Your password has been updated. You can now sign in.</p>
            <Link href="/login" className="font-semibold underline underline-offset-4">Go to sign in</Link>
          </Note>
        </div>
      ) : !ready ? (
        <div className="mt-6">
          <Note tone="warning"><p>This reset link is invalid or has expired. Request a new password-reset link.</p></Note>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <PasswordField label="New password" id="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
          <PasswordField label="Confirm new password" id="confirmPassword" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your new password" />
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          <PrimaryButton loading={saving}>{saving ? "Updating password..." : "Update password"}</PrimaryButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-[#687684]"><Link href="/forgot-password" className={linkClass}>Request a new link</Link></p>
    </div>
  )
}
