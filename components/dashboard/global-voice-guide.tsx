"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { AudioLines, LoaderCircle, Mic, Sparkles, X } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"

type VoiceStage = "idle" | "listening" | "thinking" | "speaking" | "error"
type RecognitionResult = { 0: { transcript: string } }
type RecognitionEvent = Event & { results: ArrayLike<RecognitionResult> }
type RecognitionError = Event & { error: string }
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onstart: (() => void) | null
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: RecognitionError) => void) | null
  onend: (() => void) | null
}
type RecognitionConstructor = new () => Recognition

const apiBaseUrl = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "https://aiprocess.trippinweb.com").replace(/\/$/, "")
const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify"]

export function GlobalVoiceGuide() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<VoiceStage>("idle")
  const [transcript, setTranscript] = useState("")
  const [reply, setReply] = useState("")
  const [error, setError] = useState("")
  const [splashes, setSplashes] = useState<number[]>([])
  const [atPageEnd, setAtPageEnd] = useState(false)
  const [onChatScreen, setOnChatScreen] = useState(false)
  const recognitionRef = useRef<Recognition | null>(null)
  const sessionOpenRef = useRef(false)
  const sendingRef = useRef(false)

  useEffect(() => {
    function updateChatContext() {
      setOnChatScreen(document.body.dataset.voiceGuideChat === "true")
    }
    updateChatContext()
    window.addEventListener("voice-guide-context", updateChatContext)
    return () => window.removeEventListener("voice-guide-context", updateChatContext)
  }, [])

  useEffect(() => {
    function updateScrollPosition() {
      const root = document.documentElement
      // A page that can't scroll (e.g. while data is still loading) is not "at the end".
      const scrollable = root.scrollHeight > window.innerHeight + 160
      setAtPageEnd(scrollable && window.scrollY + window.innerHeight >= root.scrollHeight - 120)
    }
    updateScrollPosition()
    window.addEventListener("scroll", updateScrollPosition, true)
    window.addEventListener("resize", updateScrollPosition)
    // Content loading in after mount changes the page height without any scroll event.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateScrollPosition)
    observer?.observe(document.body)
    return () => {
      window.removeEventListener("scroll", updateScrollPosition, true)
      window.removeEventListener("resize", updateScrollPosition)
      observer?.disconnect()
    }
  }, [pathname])

  // Dock switches happen in two steps: slide out and fade in the direction of travel,
  // then reappear at the other edge, fading in from just beyond it.
  const targetDock: "top" | "bottom" = atPageEnd ? "top" : "bottom"
  const [dock, setDock] = useState<"top" | "bottom">("bottom")
  const [dockPhase, setDockPhase] = useState<"idle" | "leaving" | "entering">("idle")
  useEffect(() => {
    if (targetDock === dock) {
      if (dockPhase === "leaving") setDockPhase("idle")
      return
    }
    setDockPhase("leaving")
    const timer = window.setTimeout(() => {
      setDock(targetDock)
      setDockPhase("entering")
      requestAnimationFrame(() => requestAnimationFrame(() => setDockPhase("idle")))
    }, 320)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDock, dock])

  useEffect(() => () => {
    sessionOpenRef.current = false
    recognitionRef.current?.abort()
    window.speechSynthesis?.cancel()
  }, [])

  useEffect(() => {
    const handleOpenRequest = () => openPopup()
    window.addEventListener("open-global-voice-guide", handleOpenRequest)
    return () => window.removeEventListener("open-global-voice-guide", handleOpenRequest)
  }, [])

  if (authRoutes.some((route) => pathname.startsWith(route))) return null

  function openPopup() {
    sessionOpenRef.current = true
    setOpen(true)
    setStage("idle")
    setTranscript("")
    setReply("")
    setError("")
  }

  function closePopup() {
    sessionOpenRef.current = false
    recognitionRef.current?.abort()
    recognitionRef.current = null
    window.speechSynthesis?.cancel()
    sendingRef.current = false
    setOpen(false)
    setStage("idle")
  }

  function speak(text: string) {
    if (!sessionOpenRef.current || !("speechSynthesis" in window)) {
      setStage("idle")
      return
    }
    const cleanText = text
      .replace(/[#*_>~\[\]]/g, "")
      .replace(/\((https?:\/\/[^)]+)\)/g, "")
      .replace(/\s+/g, " ")
      .trim()
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = navigator.language || "en-US"
    utterance.rate = 0.96
    const language = utterance.lang.split("-")[0]
    const preferredVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.startsWith(language))
    if (preferredVoice) utterance.voice = preferredVoice
    utterance.onstart = () => setStage("speaking")
    utterance.onend = () => {
      if (sessionOpenRef.current) setStage("idle")
    }
    utterance.onerror = () => {
      if (sessionOpenRef.current) {
        setError("The spoken response could not be played. Tap the sphere to continue.")
        setStage("error")
      }
    }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  async function askGuide(message: string) {
    if (sendingRef.current) return
    sendingRef.current = true
    setStage("thinking")
    setError("")

    try {
      const { data, error: sessionError } = await getSupabaseClient().auth.getSession()
      if (sessionError || !data.session?.access_token) throw new Error("Please sign in again to use the voice guide.")
      const formData = new FormData()
      formData.append("message", message)
      const response = await fetch(apiBaseUrl + "/api/chat", {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + data.session.access_token,
        },
        body: formData,
      })
      const payload = await response.json() as { response?: string; message?: string }
      if (!response.ok || !payload.response) throw new Error(payload.message || "The health guide could not respond.")
      setReply(payload.response)
      window.dispatchEvent(new CustomEvent("voice-chat-message", {
        detail: { userText: message, assistantText: payload.response },
      }))
      speak(payload.response)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The health guide could not respond.")
      setStage("error")
    } finally {
      sendingRef.current = false
    }
  }

  function startListening() {
    if (sendingRef.current) return
    const speechWindow = window as typeof window & {
      SpeechRecognition?: RecognitionConstructor
      webkitSpeechRecognition?: RecognitionConstructor
    }
    const RecognitionApi = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!RecognitionApi) {
      setError("Voice conversation requires Chrome or Edge on HTTPS.")
      setStage("error")
      return
    }

    recognitionRef.current?.abort()
    window.speechSynthesis?.cancel()
    setTranscript("")
    setReply("")
    setError("")
    let latestTranscript = ""
    let failed = false
    const recognition = new RecognitionApi()
    recognition.lang = navigator.language || "en-US"
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onstart = () => setStage("listening")
    recognition.onresult = (event) => {
      latestTranscript = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ").trim()
      setTranscript(latestTranscript)
    }
    recognition.onerror = (event) => {
      failed = true
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access was denied. Allow it in your browser and try again.")
      } else if (event.error === "no-speech") {
        setError("I did not hear anything. Tap the sphere and try again.")
      } else if (event.error !== "aborted") {
        setError("Voice input stopped unexpectedly. Please try again.")
      }
      if (event.error !== "aborted") setStage("error")
    }
    recognition.onend = () => {
      recognitionRef.current = null
      if (!failed && latestTranscript && sessionOpenRef.current) void askGuide(latestTranscript)
      else if (!failed && sessionOpenRef.current) setStage("idle")
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setError("Voice conversation could not start. Please try again.")
      setStage("error")
    }
  }

  function splash() {
    const id = Date.now()
    setSplashes((current) => [...current, id])
    window.setTimeout(() => setSplashes((current) => current.filter((item) => item !== id)), 1000)
  }

  function handleSphere() {
    if (stage === "thinking") return
    splash()
    if (stage === "listening") {
      recognitionRef.current?.stop()
      return
    }
    if (stage === "speaking") {
      window.speechSynthesis?.cancel()
      setStage("idle")
      return
    }
    startListening()
  }

  const statusText = stage === "listening"
    ? "Listening... tap when finished"
    : stage === "thinking"
      ? "Thinking about your question..."
      : stage === "speaking"
        ? "Speaking... tap to stop"
        : stage === "error"
          ? "Tap the sphere to try again"
          : "Tap the sphere and start speaking"
  // While leaving, drift toward the edge it's heading to; while entering, start from just beyond the new edge.
  const dockMotion =
    dockPhase === "leaving" ? `pointer-events-none opacity-0 ${targetDock === "top" ? "-translate-y-8" : "translate-y-8"}`
      : dockPhase === "entering" ? `pointer-events-none opacity-0 ${dock === "top" ? "-translate-y-8" : "translate-y-8"}`
        : "opacity-100 translate-y-0 hover:-translate-y-1"

  return (
    <>
      {!onChatScreen ? <button
        type="button"
        onClick={openPopup}
        aria-label="Talk to your Health AI Guide"
        className={
          "fixed left-1/2 z-[80] flex h-[78px] w-[340px] -translate-x-1/2 items-center gap-4 rounded-[24px] border border-white/60 px-3.5 text-left shadow-[0_16px_42px_rgba(20,63,91,0.24),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-2xl transition-[transform,opacity,box-shadow] duration-300 ease-out hover:shadow-[0_20px_50px_rgba(20,63,91,0.3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#238dd4]/25 " +
          (dock === "top" ? "top-5 " : "bottom-5 ") + dockMotion
        }
        style={{ backgroundImage: "linear-gradient(115deg, rgba(35,141,212,0.30), rgba(255,255,255,0.52) 48%, rgba(51,210,1,0.30))" }}
      >
        <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#238dd4] shadow-[inset_-8px_-9px_16px_rgba(6,74,135,0.35),inset_6px_5px_12px_rgba(255,255,255,0.28),0_6px_16px_rgba(35,141,212,0.3)]">
          <span className="absolute -inset-3 animate-[spin_7s_linear_infinite] rounded-[45%_55%_63%_37%/55%_38%_62%_45%] bg-gradient-to-br from-[#33d201] via-[#20bdc7] to-[#238dd4]" />
          <span className="absolute -bottom-4 -left-2 size-11 animate-pulse rounded-full bg-[#88f06a]/65 blur-sm" />
          <Sparkles className="relative size-6 text-white drop-shadow" />
        </span>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/55 text-[#238dd4] shadow-sm backdrop-blur">
          <AudioLines className="size-8" strokeWidth={2.2} />
        </span>
        <span className="text-[17px] font-bold leading-[1.05] text-[#233746]">Talk to<br />Guide</span>
      </button> : null}

      {open ? (
        <div className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-[#071521]/75 p-4 backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="global-voice-title">
          <section className="relative w-full max-w-[620px] overflow-hidden rounded-[36px] border border-white/40 bg-gradient-to-b from-white via-[#f4faff] to-[#edf9ee] px-6 py-8 text-center shadow-[0_35px_100px_rgba(0,0,0,0.35)] sm:px-12 sm:py-10">
            <div className="pointer-events-none absolute -left-20 -top-24 size-64 rounded-full bg-[#238dd4]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-16 size-72 rounded-full bg-[#33d201]/20 blur-3xl" />
            <button type="button" onClick={closePopup} aria-label="Close voice chat" className="absolute right-5 top-5 z-20 grid size-10 place-items-center rounded-full bg-white/80 text-[#647381] shadow-sm hover:bg-white">
              <X className="size-5" />
            </button>
            <div className="relative z-10 mx-auto flex max-w-md flex-col items-center">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#238dd4]">Voice conversation</p>
              <h2 id="global-voice-title" className="mt-3 text-2xl font-bold text-[#172633]">Talk with your Health AI</h2>
              <p className="mt-2 text-sm text-[#71808d]">Ask naturally, then hear your personalized answer.</p>
              <button type="button" onClick={handleSphere} disabled={stage === "thinking"} aria-label={statusText} className="group relative mt-9 grid size-64 place-items-center rounded-full outline-none transition-transform hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-[#238dd4]/30 disabled:cursor-wait sm:size-72">
                {/* Click splash: a burst of the brand colours plus a thinning ring, one per tap */}
                {splashes.map((id, index) => <span key={id} className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className={"absolute inset-6 rounded-full blur-md voice-splash " + (index % 2 ? "bg-[conic-gradient(from_90deg,#33d201,#238dd4,#7dd3fc,#33d201)]" : "bg-[conic-gradient(from_0deg,#238dd4,#33d201,#a3e635,#238dd4)]")} />
                  <span className="absolute inset-4 rounded-full border-[#ffffff] border-solid shadow-[0_0_30px_rgba(35,141,212,0.5)] voice-splash-ring" />
                </span>)}
                {/* Background light: breathes while speaking, soft pulse while listening/thinking, dim when idle */}
                <span className={"absolute inset-4 rounded-full bg-gradient-to-br from-[#238dd4] to-[#33d201] blur-2xl " + (stage === "speaking" ? "voice-glowing" : stage === "idle" || stage === "error" ? "opacity-35" : "animate-pulse opacity-70")} />
                {stage === "speaking" ? <span className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(51,210,1,0.28)_0%,rgba(35,141,212,0.18)_45%,transparent_72%)] voice-glowing" /> : null}
                {/* Light rings radiating outward while the guide talks */}
                {stage === "speaking" ? [0, 0.7, 1.4].map((delay) => <span key={delay} className="pointer-events-none absolute inset-3 rounded-full border-2 border-white/80 shadow-[0_0_24px_rgba(51,210,1,0.45)] voice-radiating" style={{ animationDelay: `${delay}s` }} />) : null}
                <span className={"absolute inset-3 rounded-full border border-white/70 " + (stage === "listening" ? "animate-ping" : "")} />
                {/* The sphere itself shrinks and grows in an uneven rhythm while speaking */}
                <span className={"absolute inset-5 overflow-hidden rounded-full bg-[#238dd4] shadow-[inset_-28px_-30px_55px_rgba(6,74,135,0.36),inset_24px_20px_45px_rgba(255,255,255,0.3),0_20px_50px_rgba(35,141,212,0.28)] " + (stage === "speaking" ? "voice-talking" : "")}>
                  <span className="absolute -inset-14 animate-[spin_9s_linear_infinite] rounded-[42%_58%_63%_37%/43%_38%_62%_57%] bg-gradient-to-br from-[#33d201] via-[#1fbec4] to-[#238dd4]" />
                  <span className="absolute -bottom-16 -left-10 size-56 animate-[spin_7s_linear_infinite_reverse] rounded-[58%_42%_35%_65%/52%_62%_38%_48%] bg-[#64e43f]/80 blur-md" />
                  <span className="absolute -right-16 -top-16 size-56 animate-[spin_11s_linear_infinite] rounded-[45%_55%_67%_33%/62%_37%_63%_38%] bg-[#58bcec]/85 blur-sm" />
                  <span className="absolute left-10 top-7 size-24 rounded-full bg-white/35 blur-xl" />
                </span>
                <span className="relative z-10 grid min-h-20 min-w-40 place-items-center rounded-2xl bg-white/90 px-5 py-3 shadow-xl backdrop-blur-md">
                  <img src="/health.png" alt="HealthiPhy.ai" className="h-auto w-36 object-contain" />
                </span>
              </button>
              <div className="mt-7 flex min-h-7 items-center gap-2 font-semibold text-[#253746]">
                {stage === "thinking" ? <LoaderCircle className="size-5 animate-spin text-[#238dd4]" /> : <Mic className={"size-5 " + (stage === "listening" ? "text-red-500" : "text-[#238dd4]")} />}
                <span>{statusText}</span>
              </div>
              {transcript ? <p className="mt-4 max-h-20 overflow-y-auto rounded-2xl bg-white/75 px-5 py-3 text-sm leading-6 text-[#536572]"><b className="text-[#238dd4]">You:</b> {transcript}</p> : null}
              {stage === "speaking" && reply ? <p className="mt-3 max-h-28 overflow-y-auto px-3 text-sm leading-6 text-[#536572]">{reply.replace(/[#*_>~]/g, "")}</p> : null}
              {stage === "error" && error ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-5 py-3 text-sm text-red-700">{error}</p> : null}
              <p className="mt-6 text-[11px] leading-5 text-[#84919b]">Voice recognition and playback use your browser. Only transcribed text is sent to the health assistant.</p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
