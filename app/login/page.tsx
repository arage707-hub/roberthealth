import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Sign in — healthiphy.ai",
  description: "Sign in to healthiphy.ai to access personalized health insights and AI-driven tools.",
}

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  )
}
