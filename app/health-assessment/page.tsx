import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { HealthQuiz } from "@/components/health/health-quiz"

export const metadata = {
  title: "Health Assessment — healthiphy.ai",
  description: "Answer 30 quick questions to assess your overall health.",
}

export default function HealthAssessmentPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f3f7fb] px-4 py-6 text-[#292a34] sm:px-6 sm:py-10">
      {/* Ambient corner glows in the brand colors, same as the sign-in pages */}
      <div aria-hidden className="pointer-events-none fixed -left-32 -top-32 size-[420px] rounded-full bg-[#238dd4]/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none fixed -bottom-40 -right-24 size-[460px] rounded-full bg-[#33d201]/15 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-2xl items-center justify-between gap-4">
        <img src="/health.png" alt="HealthiPhy.ai" className="h-12 w-36 object-contain object-left" />
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#687684] shadow-sm shadow-[#238dd4]/5 transition hover:text-[#238dd4]"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </div>
      <div className="relative mx-auto mt-6 flex w-full max-w-2xl justify-center">
        <HealthQuiz />
      </div>
    </main>
  )
}
