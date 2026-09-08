"use client"

import { AuthShell } from "@/components/auth/auth-shell"
import { VerifyForm } from "@/components/auth/verify-form"

export default function VerifyClientPage() {
  const email = typeof window !== "undefined" ? window.localStorage.getItem("pendingSignupEmail") : undefined

  return (
    <AuthShell>
      <VerifyForm email={email ?? undefined} />
    </AuthShell>
  )
}
