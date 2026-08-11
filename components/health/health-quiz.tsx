"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, HeartPulse, LoaderCircle, RotateCcw } from "lucide-react"
import { healthQuestions } from "@/lib/health-questions"
import { calculateHealthScores } from "@/lib/health-scoring"
import { getSupabaseClient } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"

function submissionErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object") {
    const supabaseError = error as { message?: string; details?: string; hint?: string; code?: string }
    const parts = [supabaseError.message, supabaseError.details, supabaseError.hint].filter(Boolean)
    if (parts.length) return parts.join(" ")
    if (supabaseError.code) return `Supabase error: ${supabaseError.code}`
  }
  return "Unable to submit the assessment. Please try again."
}

export function HealthQuiz() {
  const router = useRouter()
  const total = healthQuestions.length
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [done, setDone] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const question = healthQuestions[step]
  const selected = answers[question?.id]
  const answeredCount = Object.keys(answers).length
  const progress = done ? 100 : Math.round((step / total) * 100)
  const scores = done && answeredCount === total ? calculateHealthScores(answers) : null

  function selectOption(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }))
    // brief pause so the selection is visible before advancing
    window.setTimeout(() => {
      if (step < total - 1) {
        setStep((s) => s + 1)
      } else {
        setDone(true)
      }
    }, 260)
  }

  function goBack() {
    if (done) {
      setDone(true)
      return
    }
    if (step > 0) setStep((s) => s - 1)
  }

  function restart() {
    setAnswers({})
    setStep(0)
    setDone(false)
    setSubmitError("")
  }

  async function submitAssessment() {
    if (isSubmitting || Object.keys(answers).length !== total) return

    setIsSubmitting(true)
    setSubmitError("")
    let assessmentId: string | null = null

    try {
      const assessmentScores = calculateHealthScores(answers)
      const supabase = getSupabaseClient()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw new Error(`Authentication failed: ${submissionErrorMessage(userError)}`)
      if (!userData.user) throw new Error("Your session has expired. Please sign in again.")

      const { data: assessment, error: assessmentError } = await supabase
        .from("assessments")
        .insert({
          user_id: userData.user.id,
          status: "completed",
          score: assessmentScores.healthPercentage,
          health_percentage: assessmentScores.healthPercentage,
          nutrition_percentage: assessmentScores.categoryPercentages.Nutrition,
          toxin_percentage: assessmentScores.categoryPercentages.Toxin,
          mental_percentage: assessmentScores.categoryPercentages.Mental,
          physical_percentage: assessmentScores.categoryPercentages.Physical,
          genetic_percentage: assessmentScores.categoryPercentages.Genetic,
          medical_percentage: assessmentScores.categoryPercentages.Medical,
        })
        .select("id")
        .single()

      if (assessmentError) throw new Error(`Could not create the assessment: ${submissionErrorMessage(assessmentError)}`)
      assessmentId = assessment.id

      const answerRows = healthQuestions.map((item) => ({
        assessment_id: assessment.id,
        question_id: item.id,
        answer: answers[item.id],
        score: assessmentScores.questionScores[item.id],
        category: item.category,
        subcategory: item.subcategory,
      }))
      const { error: answersError } = await supabase.from("assessment_answers").insert(answerRows)
      if (answersError) throw new Error(`Could not save the answers: ${submissionErrorMessage(answersError)}`)

      // Redirect immediately. The dashboard progressively generates and displays each pathway.
      sessionStorage.setItem("healthTaskGenerationPending", "true")

      localStorage.setItem("healthAssessmentCompleted", "true")
      sessionStorage.setItem("assessmentSubmissionConfirmed", "true")
      router.push("/")
    } catch (error) {
      if (assessmentId) {
        const supabase = getSupabaseClient()
        await supabase.from("assessments").delete().eq("id", assessmentId)
      }
      setSubmitError(submissionErrorMessage(error))
      setIsSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-success/15 text-success">
          <Check className="size-7" />
        </div>
        <h1 className="mt-6 text-pretty text-2xl font-bold text-card-foreground sm:text-3xl">
          Assessment complete
        </h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          You answered all {total} questions. Here is a summary of your responses. Share these with your care team
          for a personalized review.
        </p>

        {scores ? (
          <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-4">
            <p className="text-sm font-semibold text-card-foreground">Overall health: {scores.healthPercentage}%</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(scores.categoryPercentages).map(([category, percentage]) => (
                <p key={category} className="text-sm text-muted-foreground">
                  {category}: <span className="font-semibold text-card-foreground">{percentage}%</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 max-h-80 space-y-2 overflow-y-auto pr-1">
          {healthQuestions.map((q, i) => (
            <div
              key={q.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-secondary/40 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  {q.category} · {q.subcategory}
                </p>
                <p className="text-sm font-medium text-card-foreground">
                  {i + 1}. {q.question}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {answers[q.id]}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={submitAssessment}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            {isSubmitting ? "Submitting..." : "Submit assessment"}
          </button>
          <button
            type="button"
            onClick={restart}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-card-foreground transition-colors hover:bg-secondary"
          >
            <RotateCcw className="size-4" />
            Retake assessment
          </button>
        </div>
        {submitError ? (
          <p role="alert" className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submitError}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <HeartPulse className="size-5" />
          <span className="text-sm font-semibold">Health Assessment</span>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {step + 1} <span className="text-muted-foreground/60">/ {total}</span>
        </span>
      </div>

      {/* Progress */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${Math.max(progress, (step / total) * 100)}%` }}
        />
      </div>

      {/* Question */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {question.category} · {question.subcategory}
        </p>
        <h1 className="mt-2 text-balance text-2xl font-bold leading-snug text-card-foreground sm:text-3xl">
          {question.question}
        </h1>
      </div>

      {/* Options */}
      <fieldset className="mt-6 space-y-3">
        <legend className="sr-only">{question.question}</legend>
        {question.options.map((option) => {
          const isSelected = selected === option.label
          return (
            <label
              key={option.label}
              className={cn(
                "flex cursor-pointer items-center gap-4 rounded-2xl border px-5 py-4 transition-all",
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border bg-secondary/40 hover:border-primary/40 hover:bg-secondary",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected ? "border-primary" : "border-muted-foreground/40",
                )}
              >
                {isSelected && <span className="size-2.5 rounded-full bg-primary" />}
              </span>
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.label}
                checked={isSelected}
                onChange={() => selectOption(option.label)}
                className="sr-only"
              />
              <span className="text-base font-medium text-card-foreground">{option.label}</span>
            </label>
          )
        })}
      </fieldset>

      {/* Footer navigation */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-card-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <span className="text-sm text-muted-foreground">{answeredCount} answered</span>
        <button
          type="button"
          onClick={() => selected && (step < total - 1 ? setStep((s) => s + 1) : setDone(true))}
          disabled={!selected}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {step === total - 1 ? "Finish" : "Next"}
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
