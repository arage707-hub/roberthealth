"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, HeartPulse, LoaderCircle, Mic, MicOff, RotateCcw, Volume2, VolumeX, X } from "lucide-react"
import { healthQuestions, type HealthOption } from "@/lib/health-questions"
import { calculateHealthScores } from "@/lib/health-scoring"
import { categoryFor, healthCategories } from "@/lib/health-categories"
import { getSupabaseClient } from "@/lib/supabase-client"
import { primeSpeech, speakText, speechSupport, startRecognizer, stopSpeaking, type RecognizerHandle, type SpeakEndReason, type SpeakHandle } from "@/lib/speech"
import { cn } from "@/lib/utils"

const lime = "#dff8d7"

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

const VOICE_ANSWER_KEY = "healthAssessmentVoiceAnswers"
const optionLetters = ["A", "B", "C", "D", "E", "F"]

// ---------------------------------------------------------------------------
// Matching a spoken phrase to one of the answer options
// ---------------------------------------------------------------------------

const numberWords: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  eleven: "11", twelve: "12", fifteen: "15", twenty: "20", thirty: "30",
}
const letterSounds: Record<string, number> = { a: 0, hey: 0, eh: 0, b: 1, be: 1, bee: 1, c: 2, see: 2, sea: 2, d: 3, de: 3, dee: 3 }
const ordinalWords: Record<string, number> = { first: 0, "1st": 0, second: 1, "2nd": 1, third: 2, "3rd": 2, fourth: 3, "4th": 3, last: -1 }

function normalizeSpeech(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9+\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => numberWords[word] ?? word)
    .join(" ")
}

/** Returns the option the phrase most likely refers to, or null when nothing matches confidently. */
export function matchSpokenOption(phrase: string, options: HealthOption[]): HealthOption | null {
  const spoken = normalizeSpeech(phrase)
  if (!spoken) return null
  const normalizedLabels = options.map((option) => normalizeSpeech(option.label))

  // 1. The full label spoken on its own.
  const exact = normalizedLabels.findIndex((label) => label === spoken)
  if (exact >= 0) return options[exact]

  // 2. A letter, position, or number: "b", "option two", "the third one", "number 4".
  const positionPrefix = /\b(option|answer|number|choice|letter)\b/.test(spoken)
  const words = spoken.replace(/\b(option|answer|number|choice|letter|the|pick|select|choose|i|id|say|go|with|please|is|its|it)\b/g, " ").replace(/\s+/g, " ").trim()
  if (words in letterSounds && letterSounds[words] < options.length) return options[letterSounds[words]]
  if (words in ordinalWords) {
    const index = ordinalWords[words] === -1 ? options.length - 1 : ordinalWords[words]
    return options[index] ?? null
  }
  if (/^[1-9]$/.test(words)) {
    // "option 2" is always a position. A bare digit is a position unless an option literally
    // contains that number ("5 or more"), in which case the person meant the option.
    if (!positionPrefix) {
      const numericLabel = normalizedLabels.findIndex((label) => label.split(" ").includes(words))
      if (numericLabel >= 0) return options[numericLabel]
    }
    const index = Number(words) - 1
    return options[index] ?? null
  }

  // 3. The label spoken inside a longer sentence ("I'd say fair"), or a distinctive part of it.
  const padded = ` ${spoken} `
  const contained = normalizedLabels
    .map((label, index) => ({ index, label }))
    .filter(({ label }) => padded.includes(` ${label} `) || (spoken.length >= 4 && ` ${label} `.includes(padded)))
    .sort((a, b) => b.label.length - a.label.length)
  if (contained.length === 1 || (contained.length > 1 && contained[0].label.length > contained[1].label.length)) return options[contained[0].index]

  // 4. Word overlap, requiring a clear winner.
  const spokenTokens = new Set(spoken.split(" ").filter((token) => token.length > 1 || /\d/.test(token)))
  const scored = normalizedLabels.map((label, index) => {
    const tokens = label.split(" ").filter((token) => token.length > 1 || /\d/.test(token))
    const hits = tokens.filter((token) => spokenTokens.has(token)).length
    return { index, score: tokens.length ? hits / tokens.length : 0, hits }
  }).sort((a, b) => b.score - a.score || b.hits - a.hits)
  if (scored[0] && scored[0].hits > 0 && scored[0].score >= 0.5 && (!scored[1] || scored[0].score > scored[1].score)) return options[scored[0].index]

  return null
}

// ---------------------------------------------------------------------------
// Read aloud (browser speech synthesis via the shared, cross-browser helper)
// ---------------------------------------------------------------------------

/**
 * Reads the current question (and its options) aloud. It is always on when the
 * assessment opens; every new question is spoken automatically until the person
 * turns it off for this visit. `blocked` becomes true when the browser refused to
 * speak without a tap (Safari, iOS, Firefox), so the UI can ask for one.
 */
function useReadAloud() {
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [speaking, setSpeaking] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const handleRef = useRef<SpeakHandle | null>(null)

  useEffect(() => {
    const support = speechSupport()
    setSupported(support.synthesis)
    if (!support.synthesis) return
    primeSpeech()
    return () => stopSpeaking()
  }, [])

  const stop = useCallback(() => {
    handleRef.current?.cancel()
    handleRef.current = null
    stopSpeaking()
    setSpeaking(false)
  }, [])

  /** Speaks `text`; `onDone` fires exactly once when the reading finishes, is stopped, or fails. */
  const speak = useCallback((text: string, onDone?: (completed: boolean, reason: SpeakEndReason) => void) => {
    handleRef.current?.cancel()
    setBlocked(false)
    const handle = speakText(text, {
      onStart: () => setSpeaking(true),
      onEnd: (completed, reason) => {
        if (handleRef.current === handle) handleRef.current = null
        setSpeaking(false)
        if (reason === "blocked") setBlocked(true)
        onDone?.(completed, reason)
      },
    })
    handleRef.current = handle
  }, [])

  return { supported, enabled, speaking, blocked, speak, stop, setEnabled }
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
  const category = categoryFor(question?.category ?? "")
  const CategoryIcon = category.icon
  const readAloud = useReadAloud()

  // ----- Voice answers -----
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [voiceNote, setVoiceNote] = useState<string | null>(null)
  const [voiceMode, setVoiceMode] = useState(false)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState("")
  const [voiceHint, setVoiceHint] = useState("")
  const [micNeedsTap, setMicNeedsTap] = useState(false)
  const recognitionRef = useRef<RecognizerHandle | null>(null)
  const voiceModeRef = useRef(false)
  const retriesRef = useRef(0)
  const questionRef = useRef(question)
  questionRef.current = question

  const questionSpeech = question
    ? `Question ${step + 1} of ${total}. ${question.question} Your options are: ${question.options.map((option, index) => `${optionLetters[index]}, ${option.label}`).join(". ")}.`
    : ""

  useEffect(() => {
    const support = speechSupport()
    setVoiceSupported(support.recognition && support.recognitionNote === null)
    setVoiceNote(support.recognitionNote)
    try {
      const saved = localStorage.getItem(VOICE_ANSWER_KEY) === "on"
      setVoiceMode(saved)
      voiceModeRef.current = saved
    } catch {
      // Ignore storage errors.
    }
    return () => {
      voiceModeRef.current = false
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  function stopListening() {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    recognition?.abort()
    setListening(false)
  }

  function setVoiceModePersisted(value: boolean) {
    voiceModeRef.current = value
    setVoiceMode(value)
    try {
      localStorage.setItem(VOICE_ANSWER_KEY, value ? "on" : "off")
    } catch {
      // Ignore storage errors.
    }
  }

  /**
   * Opens the microphone for one answer. `fromGesture` is true when a tap started it, which
   * Safari needs the first time (it only grants the mic from inside a user gesture).
   */
  function startListening(fromGesture = false) {
    const current = questionRef.current
    if (!voiceModeRef.current || !current) return
    if (micNeedsTap && !fromGesture) return
    stopListening()
    // Never listen while the page is still talking: the mic would transcribe the question.
    stopSpeaking()

    let handled = false
    const handle = startRecognizer({
      onStart: () => setListening(true),
      onInterim: (transcript) => setHeard(transcript),
      onResult: (transcript, heardSpeech) => {
        if (handled) return
        handled = true
        if (recognitionRef.current === handle) recognitionRef.current = null
        setListening(false)
        if (!voiceModeRef.current) return
        handleTranscript(transcript, heardSpeech)
      },
      onError: (code) => {
        if (recognitionRef.current === handle) recognitionRef.current = null
        setListening(false)
        if (code === "not-allowed") {
          // Safari: the first start must come from a tap. Any browser: permission may be denied.
          setMicNeedsTap(true)
          setVoiceHint(fromGesture
            ? "Microphone access was blocked. Allow the microphone for this site in your browser settings, then tap the mic again."
            : "Tap the microphone to allow voice answers in this browser.")
          handled = true
        } else if (code === "audio-capture") {
          setVoiceHint("No microphone was found. Check that one is connected and allowed for this site.")
          handled = true
        } else if (code === "network") {
          setVoiceHint("Voice recognition needs an internet connection in this browser. Tap an option instead, or try again.")
          handled = true
        }
      },
    })

    if (!handle) {
      setListening(false)
      setVoiceHint("Voice input could not start in this browser. Tap an option instead.")
      return
    }
    if (fromGesture) setMicNeedsTap(false)
    recognitionRef.current = handle
    setHeard("")
    setListening(true)
  }

  function handleTranscript(transcript: string, gotSpeech: boolean) {
    const current = questionRef.current
    if (!current) return
    const match = transcript ? matchSpokenOption(transcript, current.options) : null

    if (match) {
      retriesRef.current = 0
      setVoiceHint("")
      setHeard(transcript)
      selectOption(match.label)
      return
    }

    if (retriesRef.current < 2) {
      retriesRef.current += 1
      const hint = transcript
        ? `I heard "${transcript}", which doesn't match an option. Say the answer, or a letter from A to ${optionLetters[current.options.length - 1]}.`
        : "I didn't hear anything. Say your answer, or a letter from A to D."
      setVoiceHint(hint)
      if (readAloud.enabled && gotSpeech && transcript) {
        readAloud.speak("Sorry, I didn't catch that. Please say your answer or a letter.", () => startListening())
      } else {
        startListening()
      }
      return
    }

    retriesRef.current = 0
    setVoiceHint("I couldn't match your answer. Tap an option, or tap the microphone to try again.")
  }

  // Read each question as it appears (while read-aloud is on), then listen for the answer (while
  // voice mode is on). Selecting an answer counts as a user gesture, so browsers allow both to
  // continue automatically for the following questions.
  useEffect(() => {
    if (done || !questionSpeech) return
    retriesRef.current = 0
    setHeard("")
    setVoiceHint("")
    if (readAloud.supported && readAloud.enabled) {
      readAloud.speak(questionSpeech, (completed, reason) => {
        // Listen after the reading finishes. If the browser refused to speak (needs a tap), still
        // let voice mode listen so the person isn't stuck.
        if ((completed || reason === "blocked" || reason === "unsupported") && voiceModeRef.current) startListening()
      })
    } else if (voiceModeRef.current) {
      startListening()
    }
    return () => {
      readAloud.stop()
      stopListening()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, done, readAloud.supported, readAloud.enabled])

  /** Called from a tap when the browser blocked automatic speech; the tap unlocks it. */
  function hearQuestion() {
    readAloud.speak(questionSpeech, (completed) => { if (completed && voiceModeRef.current) startListening(true) })
  }

  function stopReading() {
    readAloud.stop()
    if (voiceModeRef.current) startListening(true)
  }

  function turnReadAloudOff() {
    readAloud.stop()
    readAloud.setEnabled(false)
    if (voiceModeRef.current) startListening(true)
  }

  function toggleReadAloud() {
    if (readAloud.enabled) {
      turnReadAloudOff()
      return
    }
    readAloud.setEnabled(true)
    readAloud.speak(questionSpeech, (completed) => { if (completed && voiceModeRef.current) startListening(true) })
  }

  function toggleVoiceMode() {
    if (voiceMode) {
      setVoiceModePersisted(false)
      stopListening()
      setVoiceHint("")
      return
    }
    setVoiceModePersisted(true)
    setVoiceHint("")
    retriesRef.current = 0
    if (readAloud.speaking) return // listening starts as soon as the question finishes being read
    readAloud.stop()
    startListening(true)
  }

  function selectOption(value: string) {
    stopListening()
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
    const overall = scores?.healthPercentage ?? 0
    return (
      <div className="w-full max-w-2xl rounded-[20px] bg-white p-6 shadow-[0_30px_80px_-30px_rgba(35,141,212,0.35)] sm:p-10">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#238dd4] to-[#33d201] text-white"><Check className="size-7" /></span>
          <div>
            <h1 className="text-pretty text-2xl font-bold sm:text-3xl">Assessment complete</h1>
            <p className="mt-1 text-sm leading-6 text-[#9a9ba1]">You answered all {total} questions. Submit to unlock your pathway scores and personalized health choices.</p>
          </div>
        </div>

        {scores ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-[240px_1fr]">
            <div className="rounded-[20px] bg-[#f3f7fb] p-5">
              <h2 className="font-bold">Overall Health</h2>
              <div className="relative mx-auto mt-3 h-[112px] w-[210px] overflow-hidden">
                <svg className="absolute inset-0" viewBox="0 0 260 145" aria-hidden>
                  <path d="M25 125 A105 105 0 0 1 235 125" fill="none" stroke="#e2eaf1" strokeWidth="18" strokeLinecap="round" />
                  <path d="M25 125 A105 105 0 0 1 235 125" fill="none" stroke={overall >= 70 ? "#33d201" : "#238dd4"} strokeWidth="18" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(0, Math.min(100, overall))} 100`} />
                </svg>
                <p className="absolute inset-x-0 bottom-2 text-center text-3xl font-bold">{overall}<span className="text-xl">%</span></p>
              </div>
              <div className="flex justify-between px-2 text-xs text-[#8f9096]"><b>0</b><span>{Math.max(0, 100 - overall)} points to optimal</span><b>100</b></div>
            </div>
            <div className="space-y-2">
              {healthCategories.map((item) => {
                const score = scores.categoryPercentages[item.key as keyof typeof scores.categoryPercentages] ?? 0
                const Icon = item.icon
                return (
                  <div key={item.key} className="flex items-center gap-3 rounded-xl bg-[#f5f8fb] px-3 py-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: item.bg }}><Icon className="size-4" style={{ color: item.accent }} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-xs text-[#898a90]"><span>{item.key}</span><b className="text-[#353640]">{score}%</b></div>
                      <div className="mt-1 h-1.5 rounded-full bg-white"><div className="h-full rounded-full" style={{ width: `${score}%`, background: item.accent }} /></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        <details className="mt-6 rounded-[20px] bg-[#f3f7fb] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#238dd4]">Review your {total} answers</summary>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {healthQuestions.map((q, i) => {
              const item = categoryFor(q.category)
              return (
                <div key={q.id} className="flex items-start justify-between gap-4 rounded-xl bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: item.accent }}>{q.category} · {q.subcategory}</p>
                    <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                  </div>
                  <span className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-[#292a34]" style={{ background: lime }}>{answers[q.id]}</span>
                </div>
              )
            })}
          </div>
        </details>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={submitAssessment}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#238dd4] to-[#33d201] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            {isSubmitting ? "Submitting..." : "Submit assessment"}
          </button>
          <button
            type="button"
            onClick={restart}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#eef4fa] px-6 py-3 text-sm font-semibold text-[#238dd4] transition hover:bg-[#dcebfb] disabled:opacity-60"
          >
            <RotateCcw className="size-4" />
            Retake assessment
          </button>
        </div>
        {submitError ? (
          <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitError}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl rounded-[20px] bg-white p-6 shadow-[0_30px_80px_-30px_rgba(35,141,212,0.35)] sm:p-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#238dd4]">
          <span className="grid size-8 place-items-center rounded-xl bg-[#dcebfb]"><HeartPulse className="size-4" /></span>
          <span className="text-sm font-semibold">Health Assessment</span>
        </div>
        <div className="flex items-center gap-2">
          {voiceSupported ? (
            <button
              type="button"
              onClick={toggleVoiceMode}
              aria-pressed={voiceMode}
              aria-label={voiceMode ? "Turn off voice answers" : "Answer by voice"}
              title={voiceMode ? "Voice answers are on. Tap to turn off." : "Answer questions with your microphone"}
              className={cn(
                "relative grid size-9 place-items-center rounded-full transition",
                voiceMode ? "bg-gradient-to-br from-[#238dd4] to-[#33d201] text-white shadow-sm" : "bg-[#eef4fa] text-[#687684] hover:text-[#238dd4]",
              )}
            >
              {listening ? <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[#238dd4]/40" /> : null}
              {voiceMode ? <Mic className="relative size-4" /> : <MicOff className="relative size-4" />}
            </button>
          ) : null}
          {readAloud.supported ? (
            <button
              type="button"
              onClick={toggleReadAloud}
              aria-pressed={readAloud.enabled}
              aria-label={readAloud.enabled ? "Turn off read aloud" : "Turn on read aloud"}
              title={readAloud.enabled ? "Read aloud is on. Tap to turn off." : "Read questions aloud"}
              className={cn(
                "relative grid size-9 place-items-center rounded-full transition",
                readAloud.enabled ? "bg-gradient-to-br from-[#238dd4] to-[#33d201] text-white shadow-sm" : "bg-[#eef4fa] text-[#687684] hover:text-[#238dd4]",
              )}
            >
              {readAloud.speaking ? <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[#33d201]/40" /> : null}
              {readAloud.enabled ? <Volume2 className="relative size-4" /> : <VolumeX className="relative size-4" />}
            </button>
          ) : null}
          <span className="rounded-full bg-[#f3f7fb] px-3 py-1 text-sm font-semibold">
            {step + 1} <span className="font-normal text-[#9a9ba1]">/ {total}</span>
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#eef4fa]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#238dd4] to-[#33d201] transition-all duration-300 ease-out"
          style={{ width: `${Math.max(progress, (step / total) * 100)}%` }}
        />
      </div>

      {/* Read-aloud banner: makes it obvious the site is speaking, with a way to stop or turn it off */}
      {readAloud.supported && readAloud.enabled ? (
        <div role="status" aria-live="polite" className={cn("mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition", readAloud.speaking ? "bg-gradient-to-r from-[#dcebfb] to-[#dff8d7] text-[#1f5f8f]" : readAloud.blocked ? "bg-[#fff2cc] text-[#8a6100]" : "bg-[#f3f7fb] text-[#687684]")}>
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", readAloud.speaking ? "bg-white text-[#238dd4] shadow-sm" : "bg-white text-[#9a9ba1]")}>
            {readAloud.speaking ? <span className="sound-bars" aria-hidden><span className="bg-[#238dd4]" /><span className="bg-[#2fae19]" /><span className="bg-[#238dd4]" /><span className="bg-[#2fae19]" /></span> : <Volume2 className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{readAloud.speaking ? "Reading the question aloud..." : readAloud.blocked ? "Tap to hear the question" : "Read aloud is on"}</p>
            <p className="truncate text-xs opacity-80">{readAloud.speaking ? "Each question and its options are spoken for you." : readAloud.blocked ? "This browser only plays speech after a tap. One tap is enough for the rest of the assessment." : "The next question will be read to you."}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {readAloud.speaking ? <button type="button" onClick={stopReading} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#238dd4] shadow-sm hover:bg-[#eef4fa]">Stop</button> : null}
            {!readAloud.speaking && readAloud.blocked ? <button type="button" onClick={hearQuestion} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#238dd4] to-[#33d201] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"><Volume2 className="size-3.5" />Play</button> : null}
            <button type="button" onClick={turnReadAloudOff} aria-label="Turn off read aloud" title="Turn off read aloud" className="grid size-8 place-items-center rounded-full bg-white text-[#687684] shadow-sm hover:text-rose-600"><X className="size-4" /></button>
          </div>
        </div>
      ) : null}
      {!readAloud.supported ? <p className="mt-4 rounded-xl bg-[#f3f7fb] px-4 py-2.5 text-xs text-[#687684]">This browser can&apos;t read questions aloud. Chrome, Edge, Safari, and Firefox all support it.</p> : null}

      {/* Pathway strip: which of the six pathways this question belongs to */}
      <div className="scrollbar-hidden mt-4 -mx-2 flex gap-1.5 overflow-x-auto px-2">
        {healthCategories.map((item) => {
          const Icon = item.icon
          const isCurrent = item.key === category.key
          return (
            <span key={item.key} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition", isCurrent ? "text-[#292a34]" : "text-[#a0a1a6]")} style={isCurrent ? { background: item.bg } : undefined}>
              <Icon className="size-3.5" style={isCurrent ? { color: item.accent } : undefined} />{item.key}
            </span>
          )
        })}
      </div>

      {/* Question */}
      <div className="mt-6 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: category.bg }}><CategoryIcon className="size-6" style={{ color: category.accent }} /></span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: category.accent }}>
            {question.category} · {question.subcategory}
          </p>
          <h1 className="mt-1 text-balance text-2xl font-bold leading-snug sm:text-[28px]">
            {question.question}
          </h1>
        </div>
        {readAloud.supported ? (
          <button
            type="button"
            onClick={() => (readAloud.speaking ? readAloud.stop() : hearQuestion())}
            aria-label={readAloud.speaking ? "Stop reading" : "Read this question aloud"}
            title={readAloud.speaking ? "Stop reading" : "Read this question aloud"}
            className={cn("mt-1 grid size-10 shrink-0 place-items-center rounded-xl transition", readAloud.speaking ? "text-white" : "bg-[#f3f7fb] text-[#238dd4] hover:bg-[#dcebfb]")}
            style={readAloud.speaking ? { background: category.accent } : undefined}
          >
            {readAloud.speaking ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
        ) : null}
      </div>

      {/* Voice status */}
      {voiceSupported && voiceMode ? (
        <div className={cn("mt-5 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition", listening ? "bg-[#dcebfb] text-[#1f5f8f]" : "bg-[#f3f7fb] text-[#687684]")}>
          <button type="button" onClick={() => (listening ? stopListening() : (readAloud.stop(), startListening(true)))} aria-label={listening ? "Stop listening" : "Start listening"} className={cn("relative grid size-10 shrink-0 place-items-center rounded-full transition", listening ? "bg-[#238dd4] text-white" : "bg-white text-[#238dd4] shadow-sm")}>
            {listening ? <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[#238dd4]/40" /> : null}
            <Mic className="relative size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{listening ? "Listening... say your answer" : readAloud.speaking ? "Reading the question..." : micNeedsTap ? "Tap the mic to allow voice answers" : "Tap the mic and say your answer"}</p>
            <p className="truncate text-xs opacity-80">{heard ? `Heard: "${heard}"` : `Say the answer, or a letter from A to ${optionLetters[question.options.length - 1]}`}</p>
          </div>
        </div>
      ) : null}
      {!voiceSupported && voiceNote ? <p className="mt-3 rounded-xl bg-[#f3f7fb] px-4 py-2.5 text-xs text-[#687684]">{voiceNote}</p> : null}
      {voiceHint ? <p role="status" className="mt-3 rounded-xl bg-[#fff2cc] px-4 py-2.5 text-sm text-[#8a6100]">{voiceHint}</p> : null}

      {/* Options */}
      <fieldset className="mt-6 space-y-3">
        <legend className="sr-only">{question.question}</legend>
        {question.options.map((option, optionIndex) => {
          const isSelected = selected === option.label
          return (
            <label
              key={option.label}
              className={cn(
                "flex cursor-pointer items-center gap-4 rounded-2xl px-5 py-4 transition-all",
                isSelected
                  ? "text-[#292a34] shadow-sm ring-2 ring-[#33d201]/50"
                  : "bg-[#f3f7fb] text-[#292a34] hover:bg-[#eef4fa]",
              )}
              style={isSelected ? { background: lime } : undefined}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-xl text-xs font-bold transition-colors",
                  isSelected ? "bg-[#2fae19] text-white" : "bg-white text-[#687684] shadow-sm",
                )}
                aria-hidden
              >
                {isSelected ? <Check className="size-4" /> : optionLetters[optionIndex]}
              </span>
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.label}
                checked={isSelected}
                onChange={() => selectOption(option.label)}
                className="sr-only"
              />
              <span className="text-base font-medium">{option.label}</span>
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
          className="inline-flex items-center gap-2 rounded-full bg-[#eef4fa] px-4 py-2 text-sm font-semibold text-[#687684] transition hover:text-[#238dd4] disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <span className="text-sm text-[#9a9ba1]">{answeredCount} answered</span>
        <button
          type="button"
          onClick={() => selected && (step < total - 1 ? setStep((s) => s + 1) : setDone(true))}
          disabled={!selected}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#238dd4] to-[#33d201] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {step === total - 1 ? "Finish" : "Next"}
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
