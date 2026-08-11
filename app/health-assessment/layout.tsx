import { AuthGate } from "@/components/auth/auth-gate"

export default function HealthAssessmentLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>
}
