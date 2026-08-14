"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { LoaderCircle, Paperclip, Plus, Send, Sparkles, User, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getSupabaseClient } from "@/lib/supabase-client"

type Message = {
  id: number | string
  role: "assistant" | "user"
  text: string
  attachments?: string[]
}

const starterMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    text: "Hi Johan! I’m your personal health assistant. Ask me about your assessment, daily habits, nutrition, fitness, or anything else related to your wellbeing.",
  },
]

const suggestions = [
  "Summarize my health assessment",
  "How can I improve my nutrition score?",
  "Create a simple exercise plan",
]

export function AiChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const chatRef = useRef<HTMLElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [composerPosition, setComposerPosition] = useState<{ left: number; width: number } | null>(null)

  useEffect(() => {
    let active = true

    async function loadHistory() {
      try {
        const supabase = getSupabaseClient()
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!userData.user) throw new Error("Your session has expired. Please sign in again.")

        const { data, error: historyError } = await supabase
          .from("chat_messages")
          .select("id, role, content, created_at")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: true })
          .limit(200)

        if (historyError) throw historyError
        if (!active) return

        const savedMessages: Message[] = (data ?? [])
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({
            id: message.id,
            role: message.role as Message["role"],
            text: message.content,
          }))

        setMessages(savedMessages.length > 0 ? savedMessages : starterMessages)
      } catch (historyError) {
        if (!active) return
        setMessages(starterMessages)
        setError(historyError instanceof Error ? historyError.message : "Unable to load chat history.")
      } finally {
        if (active) setHistoryLoading(false)
      }
    }

    void loadHistory()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const chat = chatRef.current
    if (!chat) return

    function updateComposerPosition() {
      const bounds = chat!.getBoundingClientRect()
      setComposerPosition({ left: bounds.left, width: bounds.width })
    }

    updateComposerPosition()
    const observer = new ResizeObserver(updateComposerPosition)
    observer.observe(chat)
    window.addEventListener("resize", updateComposerPosition)
    window.addEventListener("scroll", updateComposerPosition, true)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateComposerPosition)
      window.removeEventListener("scroll", updateComposerPosition, true)
    }
  }, [])

  useEffect(() => {
    const messagesPanel = messagesRef.current
    if (!messagesPanel) return

    const frame = window.requestAnimationFrame(() => {
      messagesPanel.scrollTo({
        top: messagesPanel.scrollHeight,
        behavior: "smooth",
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [messages, sending, error])

  async function sendMessage(text: string, files = attachments) {
    const value = text.trim()
    if ((!value && files.length === 0) || sending || historyLoading) return

    const userMessageId = Date.now()
    setMessages((current) => [...current, {
      id: userMessageId,
      role: "user",
      text: value || "Please analyze the attached file(s).",
      attachments: files.map((file) => file.name),
    }])
    setInput("")
    setAttachments([])
    setError("")
    setSending(true)

    try {
      const apiBaseUrl = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "https://aiprocess.trippinweb.com").replace(/\/$/, "")

      const supabase = getSupabaseClient()
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!data.session?.access_token) throw new Error("Your session has expired. Please sign in again.")

      const formData = new FormData()
      formData.append("message", value)
      files.forEach((file) => formData.append("attachments[]", file))
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: formData,
      })
      const payload = (await response.json()) as { response?: string; message?: string }
      if (!response.ok || !payload.response) {
        throw new Error(payload.message || "The health assistant could not respond.")
      }

      setMessages((current) => [
        ...current,
        { id: userMessageId + 1, role: "assistant", text: payload.response as string },
      ])
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "The health assistant could not respond.")
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(input)
  }

  function selectAttachments(files: FileList | null) {
    if (!files) return
    const allowed = new Set(["application/pdf", "text/plain", "text/markdown", "text/csv", "image/jpeg", "image/png", "image/webp"])
    const selected = Array.from(files)
    const invalid = selected.find((file) => !allowed.has(file.type) || file.size > 10 * 1024 * 1024)
    if (invalid) {
      setError("Only PDF, TXT, Markdown, CSV, JPG, PNG, and WebP files up to 10 MB are allowed. Code and executable files are blocked.")
      return
    }
    setAttachments((current) => [...current, ...selected].slice(0, 3))
    setError("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <section ref={chatRef} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card pb-28 shadow-sm">
      <header className="shrink-0 flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Health AI Assistant</h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" /> Online and ready to help
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setMessages(starterMessages)
            setError("")
          }}
          className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New chat</span>
        </button>
      </header>

      <div ref={messagesRef} className="scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-7">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5">
          {historyLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Loading chat history...
            </div>
          ) : null}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                  message.role === "assistant"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {message.role === "assistant" ? <Sparkles className="size-4" /> : <User className="size-4" />}
              </div>
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "assistant"
                    ? "rounded-tl-md bg-secondary text-foreground"
                    : "rounded-tr-md bg-primary text-primary-foreground"
                }`}
              >
                {message.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h2 className="mb-2 mt-4 text-base font-bold first:mt-0">{children}</h2>,
                      h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-bold first:mt-0">{children}</h2>,
                      h3: ({ children }) => <h3 className="mb-1.5 mt-3 font-semibold first:mt-0">{children}</h3>,
                      p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
                      ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
                      li: ({ children }) => <li className="pl-1 marker:text-primary">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      blockquote: ({ children }) => (
                        <blockquote className="my-3 border-l-2 border-primary/50 pl-3 italic text-muted-foreground">
                          {children}
                        </blockquote>
                      ),
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-primary underline underline-offset-2"
                        >
                          {children}
                        </a>
                      ),
                      code: ({ children }) => (
                        <code className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
                      ),
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                ) : (
                  <div><span className="whitespace-pre-wrap">{message.text}</span>{message.attachments?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{message.attachments.map((name) => <span key={name} className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-xs">📎 {name}</span>)}</div> : null}</div>
                )}
              </div>
            </div>
          ))}

          {messages.length === 1 ? (
            <div className="grid gap-2 pt-2 sm:grid-cols-3">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void sendMessage(suggestion)}
                  className="rounded-2xl border border-border bg-background p-3 text-left text-xs font-medium leading-5 text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          {sending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Thinking...
            </div>
          ) : null}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>
      </div>

      <div
        className="fixed bottom-0 z-40 border-t border-border bg-card/95 p-3 shadow-[0_-12px_35px_-18px_rgba(0,0,0,0.4)] backdrop-blur sm:px-7 sm:pb-4"
        style={composerPosition ? { left: composerPosition.left, width: composerPosition.width } : { visibility: "hidden" }}
      >
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/30">
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.csv,image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => selectAttachments(event.target.files)} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending || historyLoading || attachments.length >= 3} aria-label="Attach document or image" title="Attach PDF, text file, CSV, or image" className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"><Paperclip className="size-4" /></button>
          <textarea
            value={input}
            disabled={historyLoading}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void sendMessage(input)
              }
            }}
            rows={1}
            placeholder="Message your health assistant..."
            aria-label="Chat message"
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={(!input.trim() && attachments.length === 0) || sending || historyLoading}
            aria-label="Send message"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
        {attachments.length ? <div className="mx-auto mt-2 flex max-w-3xl flex-wrap gap-2">{attachments.map((file) => <span key={`${file.name}-${file.lastModified}`} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground">📎 {file.name}<button type="button" onClick={() => setAttachments((current) => current.filter((item) => item !== file))} aria-label={`Remove ${file.name}`} className="rounded-full text-muted-foreground hover:text-foreground"><X className="size-3" /></button></span>)}</div> : null}
        <p className="mt-2 text-center text-[11px] text-muted-foreground">PDF, text, CSV, and images only (max 3 files, 10 MB each). AI can make mistakes—verify important health information.</p>
      </div>
    </section>
  )
}
