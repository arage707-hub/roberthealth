import type { Metadata } from "next"
import VerifyClientPage from "./client-page"

export const metadata: Metadata = {
  title: "Verify email — healthiphy.ai",
  description: "Verify your email to complete account creation.",
}

export default function VerifyPage() {
  return <VerifyClientPage />
}
