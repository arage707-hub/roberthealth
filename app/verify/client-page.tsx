"use client"

import { VerifyForm } from "@/components/auth/verify-form"

export default function VerifyClientPage() {
  const email = typeof window !== "undefined" ? window.localStorage.getItem("pendingSignupEmail") : undefined

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-6 lg:p-10">
      <section className="w-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-xl p-8 sm:p-10">
        <VerifyForm email={email ?? undefined} />
      </section>
    </main>
  )
}
