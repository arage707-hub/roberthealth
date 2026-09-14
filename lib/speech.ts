/**
 * Cross-browser speech helpers shared by the assessment reader and the voice guide.
 *
 * Browser quirks handled here so callers don't have to:
 *  - Safari / iOS / Firefox refuse speech that was not started by a user gesture. `primeSpeech`
 *    unlocks the engine on the first tap or key press, and `speakText` reports `blocked` so the
 *    UI can offer a "tap to hear" button instead of failing silently.
 *  - Safari drops an utterance spoken immediately after `cancel()`; we wait a beat in between.
 *  - Chromium stops utterances longer than ~15 s; text is spoken in sentence-sized chunks.
 *  - Safari and Edge load voices asynchronously; `loadVoices` waits for `voiceschanged`.
 *  - Safari garbage-collects utterances mid-speech (no `onend`); references are held until done.
 *  - Safari's recognizer often never marks a result `isFinal`; the last interim result is used.
 *  - Firefox (and some embedded browsers) have no SpeechRecognition; `speechSupport` says so.
 */

export type SpeechEngine = "chromium" | "webkit" | "gecko" | "unknown"

export type SpeechSupport = {
  synthesis: boolean
  recognition: boolean
  engine: SpeechEngine
  /** Human-readable reason voice answers are unavailable, or null when they work. */
  recognitionNote: string | null
}

// --- Recognition API typing (not in lib.dom for all targets) ---------------------------------
type RecognitionAlternative = { transcript: string; confidence?: number }
type RecognitionResultItem = { isFinal: boolean; length: number; 0: RecognitionAlternative }
type RecognitionResultList = { length: number; [index: number]: RecognitionResultItem }
export type RecognitionEvent = Event & { resultIndex: number; results: RecognitionResultList }
export type RecognitionErrorEvent = Event & { error: string; message?: string }
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onstart: (() => void) | null
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onspeechend: (() => void) | null
}
type RecognitionConstructor = new () => Recognition

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function detectEngine(): SpeechEngine {
  if (typeof navigator === "undefined") return "unknown"
  const ua = navigator.userAgent
  if (/Firefox\//.test(ua)) return "gecko"
  if (/Chrome\/|Chromium\/|Edg\/|CriOS\//.test(ua)) return "chromium"
  if (/Safari\//.test(ua) || /AppleWebKit\//.test(ua)) return "webkit"
  return "unknown"
}

export function speechSupport(): SpeechSupport {
  if (typeof window === "undefined") return { synthesis: false, recognition: false, engine: "unknown", recognitionNote: null }
  const synthesis = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window
  const engine = detectEngine()
  const recognition = recognitionConstructor() !== null
  const secure = window.isSecureContext
  let recognitionNote: string | null = null
  if (!recognition) {
    recognitionNote = engine === "gecko"
      ? "Voice answers aren't available in Firefox yet. Use Chrome, Edge, or Safari to answer by speaking."
      : "Voice answers aren't available in this browser. Use Chrome, Edge, or Safari to answer by speaking."
  } else if (!secure) {
    recognitionNote = "Voice answers need a secure (https) connection."
  }
  return { synthesis, recognition, engine, recognitionNote }
}

// --- Synthesis --------------------------------------------------------------------------------

let primed = false
let primeListenersAttached = false
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null
const liveUtterances = new Set<SpeechSynthesisUtterance>()
let activeSession = 0

/** Resolves with the voice list, waiting for `voiceschanged` when the browser loads voices lazily. */
export function loadVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve([])
  const immediate = window.speechSynthesis.getVoices()
  if (immediate.length) return Promise.resolve(immediate)
  if (voicesPromise) return voicesPromise
  voicesPromise = new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.speechSynthesis.removeEventListener?.("voiceschanged", finish)
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener?.("voiceschanged", finish)
    window.setTimeout(finish, timeoutMs)
  })
  return voicesPromise
}

export function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const wanted = lang.toLowerCase()
  const language = wanted.split("-")[0]
  const exact = voices.filter((voice) => voice.lang.toLowerCase() === wanted)
  const sameLanguage = voices.filter((voice) => voice.lang.toLowerCase().startsWith(language))
  const pool = exact.length ? exact : sameLanguage
  if (!pool.length) return null
  // Prefer local (offline) voices: they start instantly and never stall on the network.
  return pool.find((voice) => voice.localService && voice.default) ?? pool.find((voice) => voice.localService) ?? pool.find((voice) => voice.default) ?? pool[0]
}

/**
 * Unlocks speech on the first user gesture (Safari, iOS, Firefox require one). Safe to call
 * many times; listeners are attached once and removed after the first gesture.
 */
export function primeSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || primed || primeListenersAttached) return
  primeListenersAttached = true
  const unlock = () => {
    if (primed) return
    primed = true
    try {
      // A silent utterance started inside the gesture grants audio permission for later speech.
      const utterance = new SpeechSynthesisUtterance(" ")
      utterance.volume = 0
      utterance.rate = 10
      window.speechSynthesis.speak(utterance)
      // Don't let the unlock utterance linger in the queue ahead of real speech.
      window.setTimeout(() => { if (!liveUtterances.size) window.speechSynthesis.cancel() }, 250)
    } catch {
      // Ignore; the next real speak() will surface a "blocked" result if needed.
    }
    void loadVoices()
    for (const type of ["pointerdown", "keydown", "touchend"]) document.removeEventListener(type, unlock, true)
  }
  for (const type of ["pointerdown", "keydown", "touchend"]) document.addEventListener(type, unlock, true)
  void loadVoices()
}

/** Splits text into utterance-sized chunks (Chromium cuts off long utterances). */
export function chunkSpeech(text: string, maxLength = 180): string[] {
  const clean = text.replace(/\s+/g, " ").trim()
  if (!clean) return []
  const sentences = clean.split(/(?<=[.!?;:])\s+/)
  const chunks: string[] = []
  let current = ""
  for (const sentence of sentences) {
    if (sentence.length > maxLength) {
      if (current) chunks.push(current)
      current = ""
      // Break an over-long sentence at commas, then at word boundaries.
      let piece = ""
      for (const part of sentence.split(/(?<=,)\s+/)) {
        if ((piece + " " + part).trim().length > maxLength && piece) {
          chunks.push(piece.trim())
          piece = part
        } else {
          piece = (piece + " " + part).trim()
        }
      }
      while (piece.length > maxLength) {
        const cut = piece.lastIndexOf(" ", maxLength)
        chunks.push(piece.slice(0, cut > 40 ? cut : maxLength).trim())
        piece = piece.slice(cut > 40 ? cut : maxLength).trim()
      }
      if (piece) chunks.push(piece)
      continue
    }
    if ((current + " " + sentence).trim().length > maxLength && current) {
      chunks.push(current)
      current = sentence
    } else {
      current = (current + " " + sentence).trim()
    }
  }
  if (current) chunks.push(current)
  return chunks
}

export type SpeakEndReason = "completed" | "cancelled" | "blocked" | "error" | "unsupported"

export type SpeakOptions = {
  lang?: string
  rate?: number
  onStart?: () => void
  /** Fires exactly once when the whole text is done, stopped, or could not play. */
  onEnd?: (completed: boolean, reason: SpeakEndReason) => void
}

export type SpeakHandle = { cancel: () => void }

/** Stops any speech from this module (and anything else queued in the browser engine). */
export function stopSpeaking(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return
  activeSession++
  liveUtterances.clear()
  try {
    window.speechSynthesis.cancel()
  } catch {
    // Ignore.
  }
}

/**
 * Speaks `text` reliably across browsers. Chunks long text, waits for voices, holds utterance
 * references, and reports `blocked` when the browser refused to play without a gesture.
 */
export function speakText(text: string, options: SpeakOptions = {}): SpeakHandle {
  const noop: SpeakHandle = { cancel: () => undefined }
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    options.onEnd?.(false, "unsupported")
    return noop
  }
  const chunks = chunkSpeech(text)
  if (!chunks.length) {
    options.onEnd?.(true, "completed")
    return noop
  }

  stopSpeaking()
  const session = ++activeSession
  const synth = window.speechSynthesis
  const lang = options.lang ?? (typeof navigator !== "undefined" ? navigator.language : "") ?? "en-US"
  const rate = options.rate ?? 0.96
  let ended = false
  let started = false
  let startTimer: number | undefined
  const finish = (completed: boolean, reason: SpeakEndReason) => {
    if (ended) return
    ended = true
    if (startTimer) window.clearTimeout(startTimer)
    options.onEnd?.(completed, reason)
  }

  const run = async () => {
    const voices = await loadVoices()
    if (session !== activeSession) return finish(false, "cancelled")
    const voice = pickVoice(voices, lang)

    const speakChunk = (index: number) => {
      if (session !== activeSession) return finish(false, "cancelled")
      if (index >= chunks.length) return finish(true, "completed")
      const utterance = new SpeechSynthesisUtterance(chunks[index])
      utterance.lang = voice?.lang ?? lang
      utterance.rate = rate
      if (voice) utterance.voice = voice
      liveUtterances.add(utterance)
      utterance.onstart = () => {
        if (session !== activeSession) return
        if (!started) {
          started = true
          if (startTimer) window.clearTimeout(startTimer)
          options.onStart?.()
        }
      }
      utterance.onend = () => {
        liveUtterances.delete(utterance)
        if (session !== activeSession) return
        speakChunk(index + 1)
      }
      utterance.onerror = (event) => {
        liveUtterances.delete(utterance)
        if (session !== activeSession) return
        const code = (event as SpeechSynthesisErrorEvent).error
        if (code === "interrupted" || code === "canceled") return finish(false, "cancelled")
        if (code === "not-allowed") return finish(false, "blocked")
        // Some engines throw on the first chunk only (e.g. a voice that fails to load): retry once without a voice.
        if (index === 0 && !started && utterance.voice) {
          const retry = new SpeechSynthesisUtterance(chunks[index])
          retry.lang = lang
          retry.rate = rate
          retry.onstart = utterance.onstart
          retry.onend = utterance.onend
          retry.onerror = () => { liveUtterances.delete(retry); finish(false, "error") }
          liveUtterances.add(retry)
          synth.speak(retry)
          return
        }
        finish(false, "error")
      }
      synth.speak(utterance)
      if (index === 0) {
        // Nothing started after a generous wait (online voices can take a moment): treat as blocked
        // so the UI can ask for a tap. Skip the check if the engine reports it is genuinely working.
        startTimer = window.setTimeout(() => {
          if (started || session !== activeSession) return
          if (synth.speaking || synth.pending) {
            // Still queued: give it one more window before giving up.
            startTimer = window.setTimeout(() => {
              if (!started && session === activeSession) { stopSpeaking(); finish(false, "blocked") }
            }, 3000)
            return
          }
          stopSpeaking()
          finish(false, "blocked")
        }, 2500)
      }
    }

    // Safari drops an utterance spoken right after cancel(); a short pause avoids that.
    // Chromium occasionally wedges with `paused` true after a cancel; resume clears it.
    try { if (synth.paused) synth.resume() } catch { /* ignore */ }
    window.setTimeout(() => speakChunk(0), 90)
  }
  void run()

  return {
    cancel: () => {
      if (session !== activeSession) return
      stopSpeaking()
      finish(false, "cancelled")
    },
  }
}

// --- Recognition ------------------------------------------------------------------------------

export type RecognizerOptions = {
  lang?: string
  interimResults?: boolean
  /** Keep listening across pauses until stopped (dictation). Default: one phrase, then stop. */
  continuous?: boolean
  onStart?: () => void
  onInterim?: (transcript: string) => void
  /** Called once when listening ends. `transcript` may be empty when nothing was heard. */
  onResult?: (transcript: string, heardSpeech: boolean) => void
  /** Normalised error code: "not-allowed" | "no-speech" | "network" | "aborted" | "audio-capture" | "unknown". */
  onError?: (code: string, raw: string) => void
}

export type RecognizerHandle = { stop: () => void; abort: () => void }

/**
 * Starts one listening session and returns a handle. Works around Safari never marking results
 * final, and normalises error codes between engines.
 */
export function startRecognizer(options: RecognizerOptions = {}): RecognizerHandle | null {
  const Ctor = recognitionConstructor()
  if (!Ctor) return null

  const recognition = new Ctor()
  recognition.lang = options.lang ?? (typeof navigator !== "undefined" ? navigator.language : "") ?? "en-US"
  const continuous = options.continuous ?? false
  recognition.continuous = continuous
  recognition.interimResults = options.interimResults ?? true
  recognition.maxAlternatives = 3

  let finalTranscript = ""
  let interimTranscript = ""
  let heardSpeech = false
  let errored = false
  let delivered = false
  let aborted = false
  let silenceTimer: number | undefined

  const deliver = () => {
    if (delivered) return
    delivered = true
    if (silenceTimer) window.clearTimeout(silenceTimer)
    if (aborted) return
    const transcript = (finalTranscript || interimTranscript).trim()
    if (!errored || transcript) options.onResult?.(transcript, heardSpeech)
  }

  recognition.onstart = () => {
    options.onStart?.()
    // Safety net: some engines never fire onend when the mic stays silent.
    if (!continuous) silenceTimer = window.setTimeout(() => { try { recognition.stop() } catch { /* ignore */ } }, 12000)
  }
  recognition.onresult = (event) => {
    let interim = ""
    let final = ""
    for (let index = 0; index < event.results.length; index++) {
      const result = event.results[index]
      const text = result[0]?.transcript ?? ""
      if (result.isFinal) final += text
      else interim += text
    }
    heardSpeech = true
    if (final) finalTranscript = final
    interimTranscript = interim || interimTranscript
    options.onInterim?.((finalTranscript || interimTranscript).trim())
  }
  recognition.onspeechend = () => {
    // Safari may otherwise keep the session open for several seconds after the user stops talking.
    if (!continuous) window.setTimeout(() => { try { recognition.stop() } catch { /* ignore */ } }, 300)
  }
  recognition.onerror = (event) => {
    const raw = event.error || "unknown"
    if (raw === "aborted") { aborted = true; return }
    errored = true
    const code = raw === "not-allowed" || raw === "service-not-allowed" ? "not-allowed"
      : raw === "no-speech" ? "no-speech"
      : raw === "network" ? "network"
      : raw === "audio-capture" ? "audio-capture"
      : "unknown"
    options.onError?.(code, raw)
  }
  recognition.onend = () => deliver()

  try {
    recognition.start()
  } catch {
    // "already started" or a wedged engine: abort and retry once.
    try {
      recognition.abort()
      recognition.start()
    } catch {
      options.onError?.("unknown", "start-failed")
      return null
    }
  }

  return {
    stop: () => { try { recognition.stop() } catch { /* ignore */ } },
    abort: () => { aborted = true; try { recognition.abort() } catch { /* ignore */ } },
  }
}
