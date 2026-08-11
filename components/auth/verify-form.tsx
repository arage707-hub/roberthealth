"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const fieldClass =
  "w-full rounded-full border border-transparent bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"

export function VerifyForm({ email }: { email?: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  function handleLogin() {
    router.push("/login")
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verify your email</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Check your inbox</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a verification link to <span className="font-semibold text-foreground">{email ?? "your email"}</span>.
        Click the link in that email to activate your account.
      </p>

      <div className="mt-6 space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <button
          type="button"
          onClick={handleLogin}
          className="w-full rounded-full bg-foreground px-4 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Go to login
        </button>

        <p className="text-center text-sm text-muted-foreground">
          If you haven&apos;t received the email, wait a few minutes and check spam. If it still doesn&apos;t arrive, try signing up again.
        </p>
      </div>
    </div>
  )
}
