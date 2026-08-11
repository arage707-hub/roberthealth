import { AuthGate } from "@/components/auth/auth-gate"
import { DashboardPage } from "@/components/dashboard/dashboard-page"

export default function Page() {
  return (
    <AuthGate>
      <DashboardPage />
    </AuthGate>
  )
}
