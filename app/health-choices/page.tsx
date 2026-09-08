import type { Metadata } from "next"
import { AuthGate } from "@/components/auth/auth-gate"
import { HealthChoicesPage } from "@/components/health/health-choices-page"

export const metadata: Metadata = {
  title: "Health Choices — healthiphy.ai",
  description: "Track and complete the AI-generated health choices from your latest assessment.",
}

export default function Page() {
  return (
    <AuthGate>
      <HealthChoicesPage />
    </AuthGate>
  )
}
