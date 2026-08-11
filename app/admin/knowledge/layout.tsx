import { AdminGate } from "@/components/auth/admin-gate"
import { AuthGate } from "@/components/auth/auth-gate"

export default function AdminKnowledgeLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate><AdminGate>{children}</AdminGate></AuthGate>
}
