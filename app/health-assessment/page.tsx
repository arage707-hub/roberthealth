import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { HealthQuiz } from "@/components/health/health-quiz"

export const metadata = {
  title: "Health Assessment — healthiphy.ai",
  description: "Answer 30 quick questions to assess your overall health.",
}

export default function HealthAssessmentPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <div className="w-full max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </div>
      <HealthQuiz />
    </main>
  )
}
