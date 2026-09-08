"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowUp, AudioLines, Camera, FileText, FolderOpen, Image as ImageIcon, LoaderCircle, Mic, PanelRight, Plus, Search, Sparkles, User, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getSupabaseClient } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import { MobileTopBar } from "@/components/dashboard/site-nav"

type Attachment = { name: string; type: "image" | "document"; url?: string }
type Message = { id: number | string; role: "assistant" | "user"; text: string; createdAt: string; conversationKey: string; attachments?: Attachment[] }
type Conversation = { id: string; title: string; preview: string; updatedAt: string; messages: Message[] }
type RecognitionResult = { 0: { transcript: string } }
type RecognitionEvent = Event & { results: ArrayLike<RecognitionResult> }
type RecognitionError = Event & { error: string }
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; abort: () => void; onstart: (() => void) | null; onresult: ((event: RecognitionEvent) => void) | null; onerror: ((event: RecognitionError) => void) | null; onend: (() => void) | null }
type RecognitionConstructor = new () => Recognition

const apiBaseUrl = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "https://aiprocess.trippinweb.com").replace(/\/$/, "")
const allowedTypes = new Set(["application/pdf", "text/plain", "text/markdown", "text/csv", "image/jpeg", "image/png", "image/webp"])
const dayKey = (date: string) => "history-" + new Date(date).toISOString().slice(0, 10)

function cleanHistoryMessage(content: string) {
  const marker = "\n\nAttached: "
  const index = content.lastIndexOf(marker)
  if (index < 0) return { text: content, attachments: [] as Attachment[] }
  return {
    text: content.slice(0, index),
    attachments: content.slice(index + marker.length).split(", ").filter(Boolean).map((name) => ({
      name,
      type: /\.(jpe?g|png|webp)$/i.test(name) ? "image" as const : "document" as const,
    })),
  }
}

function shortText(value: string, length = 54) {
  const text = value.replace(/\s+/g, " ").trim()
  return text.length > length ? text.slice(0, length).trimEnd() + "..." : text
}

export function AiChat({ onOpenMenu, unreadCount = 0 }: { onOpenMenu?: () => void; unreadCount?: number } = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [activeConversation, setActiveConversation] = useState("")
  const [historyLoading, setHistoryLoading] = useState(true)
  const [input, setInput] = useState("")
  const [query, setQuery] = useState("")
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [mediaOpen, setMediaOpen] = useState(false)
  const [mobilePane, setMobilePane] = useState<"list" | "chat">("list")
  const [error, setError] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<Recognition | null>(null)
  const speechBaseInputRef = useRef("")

  useEffect(() => {
    document.body.dataset.voiceGuideChat = "true"
    window.dispatchEvent(new Event("voice-guide-context"))
    return () => {
      delete document.body.dataset.voiceGuideChat
      window.dispatchEvent(new Event("voice-guide-context"))
      recognitionRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    let active = true
    async function loadHistory() {
      try {
        const supabase = getSupabaseClient()
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!userData.user) throw new Error("Your session has expired. Please sign in again.")
        const { data, error: historyError } = await supabase.from("chat_messages").select("id, role, content, created_at").eq("user_id", userData.user.id).order("created_at", { ascending: true }).limit(300)
        if (historyError) throw historyError
        if (!active) return
        const saved = (data ?? []).filter((item) => item.role === "user" || item.role === "assistant").map((item) => {
          const parsed = cleanHistoryMessage(item.content)
          return { id: item.id, role: item.role as Message["role"], text: parsed.text, createdAt: item.created_at, conversationKey: dayKey(item.created_at), attachments: parsed.attachments }
        })
        setMessages(saved)
        setActiveConversation(saved.length ? saved[saved.length - 1].conversationKey : "new-" + Date.now())
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load chat history.")
      } finally {
        if (active) setHistoryLoading(false)
      }
    }
    void loadHistory()
    return () => { active = false }
  }, [])

  useEffect(() => {
    function addVoiceMessages(event: Event) {
      const detail = (event as CustomEvent<{ userText?: string; assistantText?: string }>).detail
      if (!detail?.userText || !detail.assistantText) return
      const now = new Date().toISOString()
      const key = activeConversation || "new-" + Date.now()
      const id = Date.now()
      setMessages((current) => [...current, { id, role: "user", text: detail.userText as string, createdAt: now, conversationKey: key }, { id: id + 1, role: "assistant", text: detail.assistantText as string, createdAt: now, conversationKey: key }])
      setActiveConversation(key)
    }
    window.addEventListener("voice-chat-message", addVoiceMessages)
    return () => window.removeEventListener("voice-chat-message", addVoiceMessages)
  }, [activeConversation])

  useEffect(() => {
    const panel = messagesRef.current
    if (!panel) return
    const frame = requestAnimationFrame(() => panel.scrollTo({ top: panel.scrollHeight, behavior: "smooth" }))
    return () => cancelAnimationFrame(frame)
  }, [messages, sending, activeConversation])

  useEffect(() => {
    if (!attachMenuOpen) return
    function closeOnOutside(event: MouseEvent | TouchEvent) {
      if (!attachMenuRef.current?.contains(event.target as Node)) setAttachMenuOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAttachMenuOpen(false)
    }
    document.addEventListener("mousedown", closeOnOutside)
    document.addEventListener("touchstart", closeOnOutside)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("mousedown", closeOnOutside)
      document.removeEventListener("touchstart", closeOnOutside)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [attachMenuOpen])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = Math.min(textarea.scrollHeight, 220) + "px"
  }, [input])

  const conversations = useMemo<Conversation[]>(() => {
    const groups = new Map<string, Message[]>()
    messages.forEach((message) => groups.set(message.conversationKey, [...(groups.get(message.conversationKey) ?? []), message]))
    if (activeConversation && !groups.has(activeConversation)) groups.set(activeConversation, [])
    return Array.from(groups.entries()).map(([id, items]) => {
      const firstUser = items.find((item) => item.role === "user")
      const last = items[items.length - 1]
      return { id, title: firstUser ? shortText(firstUser.text, 32) : "New health chat", preview: last ? shortText(last.text) : "Ask your Health AI guide anything", updatedAt: last?.createdAt ?? new Date().toISOString(), messages: items }
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [messages, activeConversation])

  const currentConversation = conversations.find((item) => item.id === activeConversation)
  const visibleMessages = currentConversation?.messages ?? []
  const filteredConversations = conversations.filter((item) => (item.title + " " + item.preview).toLowerCase().includes(query.toLowerCase()))
  const media = useMemo(() => messages.flatMap((message) => message.attachments ?? []), [messages])

  function newChat() {
    setActiveConversation("new-" + Date.now())
    setMobilePane("chat")
    setInput("")
    setAttachments([])
    setError("")
  }

  function selectConversation(id: string) {
    setActiveConversation(id)
    setMobilePane("chat")
    setError("")
  }

  function selectAttachments(input: HTMLInputElement) {
    const files = input.files
    input.value = ""
    if (!files?.length) return
    const selected = Array.from(files)
    if (selected.some((file) => !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024)) {
      setError("Only PDF, TXT, Markdown, CSV, JPG, PNG, and WebP files up to 10 MB are allowed.")
      return
    }
    setAttachments((current) => [...current, ...selected].slice(0, 3))
    setError("")
  }

  function openPicker(ref: typeof fileInputRef) {
    setAttachMenuOpen(false)
    ref.current?.click()
  }

  function toggleDictation() {
    if (listening) return recognitionRef.current?.stop()
    const speechWindow = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
    const RecognitionApi = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!RecognitionApi) return setError("Speech-to-text requires Chrome or Edge on HTTPS.")
    speechBaseInputRef.current = input.trim()
    const recognition = new RecognitionApi()
    recognition.lang = navigator.language || "en-US"
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onstart = () => setListening(true)
    recognition.onresult = (event) => {
      const spoken = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ").trim()
      setInput([speechBaseInputRef.current, spoken].filter(Boolean).join(" "))
    }
    recognition.onerror = (event) => {
      if (event.error === "not-allowed") setError("Microphone access was denied. Allow it in your browser and try again.")
      else if (event.error !== "aborted" && event.error !== "no-speech") setError("Speech-to-text stopped unexpectedly.")
    }
    recognition.onend = () => { setListening(false); recognitionRef.current = null }
    recognitionRef.current = recognition
    recognition.start()
  }

  async function sendMessage(text: string, files = attachments) {
    const value = text.trim()
    if ((!value && !files.length) || sending || historyLoading) return
    recognitionRef.current?.stop()
    const key = activeConversation || "new-" + Date.now()
    const now = new Date().toISOString()
    const id = Date.now()
    const attachedMedia: Attachment[] = files.map((file) => ({ name: file.name, type: file.type.startsWith("image/") ? "image" : "document", url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined }))
    setMessages((current) => [...current, { id, role: "user", text: value || "Please analyze the attached file(s).", createdAt: now, conversationKey: key, attachments: attachedMedia }])
    setActiveConversation(key)
    setInput("")
    setAttachments([])
    setError("")
    setSending(true)
    try {
      const { data, error: sessionError } = await getSupabaseClient().auth.getSession()
      if (sessionError || !data.session?.access_token) throw new Error("Your session has expired. Please sign in again.")
      const formData = new FormData()
      formData.append("message", value)
      files.forEach((file) => formData.append("attachments[]", file))
      const response = await fetch(apiBaseUrl + "/api/chat", { method: "POST", headers: { Accept: "application/json", Authorization: "Bearer " + data.session.access_token }, body: formData })
      const payload = await response.json() as { response?: string; message?: string }
      if (!response.ok || !payload.response) throw new Error(payload.message || "The health assistant could not respond.")
      setMessages((current) => [...current, { id: id + 1, role: "assistant", text: payload.response as string, createdAt: new Date().toISOString(), conversationKey: key }])
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "The health assistant could not respond.")
    } finally {
      setSending(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(input)
  }

  return (
    <section data-ai-chat-screen="true" className="flex h-full min-h-0 w-full overflow-hidden bg-white md:min-h-[700px]">
      <aside className={cn("relative w-full shrink-0 flex-col border-r border-[#e2eaf0] bg-white md:flex md:w-[300px]", mobilePane === "list" ? "flex" : "hidden")}>
        {/* Same logo / title / hamburger strip as the dashboard; the drawer itself is owned by the page */}
        <MobileTopBar title="Messages" unread={unreadCount} onOpenMenu={() => onOpenMenu ? onOpenMenu() : window.location.assign("/")} className="relative shrink-0 md:hidden" />
        <div className="border-b border-[#e8eef2] p-5">
          <div className="mb-4 flex items-center justify-between md:hidden"><h1 className="text-xl font-bold text-[#26333d]">Chats</h1><button type="button" onClick={newChat} aria-label="New chat" className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#238dd4] to-[#33d201] text-white"><Plus className="size-5" /></button></div>
          <button type="button" onClick={newChat} className="hidden w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#238dd4] to-[#33d201] py-3 text-sm font-bold text-white shadow-sm md:flex"><Plus className="size-4" /> New chat</button>
          <label className="mt-4 flex items-center gap-2 rounded-xl bg-[#f2f6f9] px-3 py-2.5 text-[#84919b]"><Search className="size-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search past chats" className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label>
        </div>
        <div className="scrollbar-hidden flex-1 overflow-y-auto p-3">
          {filteredConversations.map((conversation) => <button key={conversation.id} type="button" onClick={() => selectConversation(conversation.id)} className={cn("mb-2 w-full rounded-2xl p-3 text-left transition", conversation.id === activeConversation ? "bg-[#edf7fc] shadow-sm" : "hover:bg-[#f6f9fb]")}><div className="flex items-start gap-3"><span className={cn("mt-0.5 grid size-10 shrink-0 place-items-center rounded-full", conversation.id === activeConversation ? "bg-gradient-to-br from-[#238dd4] to-[#33d201] text-white" : "bg-[#e7f0f5] text-[#238dd4]")}><Sparkles className="size-4" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><b className="truncate text-sm text-[#26333d]">{conversation.title}</b><small className="shrink-0 text-[9px] text-[#9aa6af]">{new Date(conversation.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></span><span className="mt-1 block truncate text-xs text-[#89949d]">{conversation.preview}</span></span></div></button>)}
          {!historyLoading && !filteredConversations.length ? <p className="p-5 text-center text-xs text-[#8d99a2]">No past chats found.</p> : null}
        </div>
      </aside>

      <div className={cn("min-w-0 flex-1 flex-col bg-[#f5f8fa] md:flex", mobilePane === "chat" ? "flex" : "hidden")}>
        <header className="flex h-[74px] shrink-0 items-center justify-between border-b border-[#e2eaf0] bg-white px-3 md:h-[82px] md:px-5">
          <button type="button" onClick={() => { setMediaOpen(false); setMobilePane("list") }} aria-label="Back to chats" className="mr-2 grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef4f7] text-[#51636f] md:hidden"><ArrowLeft className="size-5" /></button>
          <div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#238dd4] to-[#33d201] text-white"><Sparkles className="size-5" /></span><div className="min-w-0"><h1 className="truncate font-bold text-[#26333d]">{currentConversation?.title ?? "New health chat"}</h1><p className="text-xs text-[#88959e]">Health AI Guide · Online</p></div></div>
          <button type="button" onClick={() => setMediaOpen((current) => !current)} title="Uploaded media" aria-label="Show uploaded media" aria-pressed={mediaOpen} className={cn("grid size-10 shrink-0 place-items-center rounded-xl transition md:size-11", mediaOpen ? "bg-[#dff8d7] text-[#247c0a]" : "bg-[#eef4f7] text-[#238dd4] hover:bg-[#e3eff5]")}><PanelRight className="size-5" /></button>
        </header>

        <div ref={messagesRef} className="scrollbar-hidden flex-1 overflow-y-auto px-5 py-6"><div className="mx-auto flex max-w-3xl flex-col gap-5">
          {historyLoading ? <div className="flex items-center justify-center gap-2 py-20 text-sm text-[#82909a]"><LoaderCircle className="size-4 animate-spin" /> Loading your chats...</div> : null}
          {!historyLoading && !visibleMessages.length ? <div className="mx-auto my-16 max-w-md text-center"><span className="mx-auto grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-[#238dd4] to-[#33d201] text-white shadow-lg"><Sparkles className="size-7" /></span><h2 className="mt-5 text-xl font-bold text-[#26333d]">How can I support your health today?</h2><p className="mt-2 text-sm leading-6 text-[#82909a]">Ask about your assessment, nutrition, daily habits, fitness, or upload a health document.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{["Summarize my assessment", "Improve my nutrition", "Create an exercise plan"].map((suggestion) => <button key={suggestion} type="button" onClick={() => void sendMessage(suggestion, [])} className="rounded-full border border-[#d9e5ec] bg-white px-3 py-2 text-xs font-semibold text-[#52636f] hover:border-[#238dd4]">{suggestion}</button>)}</div></div> : null}
          {visibleMessages.map((message) => <div key={message.id} className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}><span className={cn("grid size-9 shrink-0 place-items-center rounded-full", message.role === "assistant" ? "bg-gradient-to-br from-[#238dd4] to-[#33d201] text-white" : "bg-[#dce7ee] text-[#52636f]")}>{message.role === "assistant" ? <Sparkles className="size-4" /> : <User className="size-4" />}</span><div className={cn("max-w-[78%]", message.role === "user" && "text-right")}><div className={cn("rounded-2xl px-4 py-3 text-left text-sm leading-6 shadow-sm", message.role === "assistant" ? "rounded-tl-md bg-white text-[#33434e]" : "rounded-tr-md bg-gradient-to-r from-[#238dd4] to-[#36b96f] text-white")}>{message.role === "assistant" ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>, ul: ({ children }) => <ul className="my-2 list-disc pl-5">{children}</ul>, ol: ({ children }) => <ol className="my-2 list-decimal pl-5">{children}</ol>, strong: ({ children }) => <strong className="font-bold">{children}</strong> }}>{message.text}</ReactMarkdown> : <span className="whitespace-pre-wrap">{message.text}</span>}{message.attachments?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{message.attachments.map((file) => <span key={file.name} className="rounded-full bg-white/20 px-2 py-1 text-[10px]">{file.name}</span>)}</div> : null}</div><time className="mt-1 block text-[10px] text-[#9aa6af]">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div></div>)}
          {sending ? <div className="flex items-center gap-2 text-sm text-[#82909a]"><LoaderCircle className="size-4 animate-spin" /> Health AI is thinking...</div> : null}
          {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        </div></div>

        <div className="shrink-0 bg-[#f5f8fa] px-3 pb-4 pt-2 md:px-5">
          <div className="mx-auto max-w-3xl">
            {attachments.length ? <div className="mb-2 flex flex-wrap gap-2 px-2">{attachments.map((file) => <span key={file.name + file.lastModified} className="inline-flex items-center gap-1.5 rounded-full border border-[#d9e5ec] bg-white px-3 py-1.5 text-xs text-[#4d606d]">{file.name}<button type="button" aria-label={"Remove " + file.name} onClick={() => setAttachments((current) => current.filter((item) => item !== file))} className="rounded-full p-0.5 hover:bg-[#eef4f7]"><X className="size-3" /></button></span>)}</div> : null}
            <form onSubmit={submit} className="flex items-end gap-1 rounded-[28px] border border-[#d9e5ec] bg-white p-2 shadow-[0_2px_14px_rgba(16,35,49,0.06)] transition focus-within:border-[#b9d5e8] focus-within:shadow-[0_4px_18px_rgba(35,141,212,0.14)]">
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.csv,image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => selectAttachments(event.target)} />
              <input ref={galleryInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => selectAttachments(event.target)} />
              <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(event) => selectAttachments(event.target)} />
              <div ref={attachMenuRef} className="relative shrink-0">
                <button type="button" onClick={() => setAttachMenuOpen((current) => !current)} title="Add photos and files" aria-label="Add photos and files" aria-haspopup="menu" aria-expanded={attachMenuOpen} className={cn("grid size-11 place-items-center rounded-full text-[#52636f] transition hover:bg-[#eef4f7]", attachMenuOpen && "bg-[#eef4f7]")}><Plus className={cn("size-6 transition-transform", attachMenuOpen && "rotate-45")} /></button>
                {attachMenuOpen ? <div role="menu" className="absolute bottom-full left-0 z-30 mb-2 w-52 overflow-hidden rounded-2xl border border-[#dce7ed] bg-white p-1.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <button type="button" role="menuitem" onClick={() => openPicker(cameraInputRef)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#40515d] hover:bg-[#edf7fc] hover:text-[#238dd4]"><Camera className="size-5 shrink-0" /> Camera</button>
                  <button type="button" role="menuitem" onClick={() => openPicker(galleryInputRef)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#40515d] hover:bg-[#edf7fc] hover:text-[#238dd4]"><ImageIcon className="size-5 shrink-0" /> Photo gallery</button>
                  <button type="button" role="menuitem" onClick={() => openPicker(fileInputRef)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#40515d] hover:bg-[#edf7fc] hover:text-[#238dd4]"><FolderOpen className="size-5 shrink-0" /> Files</button>
                </div> : null}
              </div>
              <textarea ref={textareaRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(input) } }} rows={1} placeholder="Ask anything" className="max-h-[220px] min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-6 text-[#26333d] outline-none placeholder:text-[#94a0a8]" />
              <button type="button" onClick={toggleDictation} title={listening ? "Stop dictation" : "Dictate"} aria-label={listening ? "Stop speech to text" : "Start speech to text"} className={cn("grid size-11 shrink-0 place-items-center rounded-full transition", listening ? "bg-red-500 text-white" : "text-[#52636f] hover:bg-[#eef4f7]")}>{listening ? <AudioLines className="size-6 animate-pulse" /> : <Mic className="size-6" />}</button>
              {input.trim() || attachments.length
                ? <button type="submit" disabled={sending || historyLoading} title="Send" aria-label="Send message" className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#238dd4] to-[#33d201] text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"><ArrowUp className="size-5" /></button>
                : <button type="button" onClick={() => window.dispatchEvent(new Event("open-global-voice-guide"))} title="Talk to Guide" aria-label="Talk to your Health AI Guide" className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#238dd4] to-[#33d201] text-white shadow-sm transition hover:opacity-90"><AudioLines className="size-5" /></button>}
            </form>
          </div>
        </div>
      </div>

      {mediaOpen ? <><button type="button" onClick={() => setMediaOpen(false)} aria-label="Close media panel" className="fixed inset-0 z-[89] bg-[#102331]/35 backdrop-blur-[2px] md:hidden" /><aside className="fixed inset-y-0 right-0 z-[90] w-[88vw] max-w-[340px] shrink-0 animate-in overflow-y-auto border-l border-[#e2eaf0] bg-white shadow-2xl slide-in-from-right duration-300 md:static md:z-auto md:w-[280px] md:shadow-none">
        <div className="flex h-[82px] items-center justify-between border-b border-[#e8eef2] px-5"><div><h2 className="font-bold text-[#26333d]">Uploaded media</h2><p className="text-xs text-[#8b98a1]">{media.length} files</p></div><button type="button" onClick={() => setMediaOpen(false)} className="grid size-9 place-items-center rounded-xl bg-[#f1f5f7]"><X className="size-4" /></button></div>
        <div className="space-y-7 p-5">
          <section><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-bold text-[#40515d]"><ImageIcon className="size-4 text-[#238dd4]" /> Images</h3><span className="text-xs text-[#96a2aa]">{media.filter((item) => item.type === "image").length}</span></div><div className="grid grid-cols-2 gap-2">{media.filter((item) => item.type === "image").map((item, index) => item.url ? <img key={item.name + index} src={item.url} alt={item.name} title={item.name} className="aspect-square w-full rounded-xl bg-[#edf2f5] object-cover" /> : <div key={item.name + index} title={item.name} className="flex aspect-square items-center justify-center rounded-xl bg-[#edf2f5]"><ImageIcon className="size-6 text-[#8ea0ac]" /></div>)}</div>{!media.some((item) => item.type === "image") ? <p className="rounded-xl bg-[#f5f8fa] p-4 text-xs text-[#8c99a2]">No images uploaded yet.</p> : null}</section>
          <section><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-bold text-[#40515d]"><FileText className="size-4 text-[#33a910]" /> Documents</h3><span className="text-xs text-[#96a2aa]">{media.filter((item) => item.type === "document").length}</span></div><div className="space-y-2">{media.filter((item) => item.type === "document").map((item, index) => <div key={item.name + index} className="flex items-center gap-3 rounded-xl bg-[#f5f8fa] p-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dff8d7] text-[#27870c]"><FileText className="size-5" /></span><span className="min-w-0"><b className="block truncate text-xs text-[#40515d]">{item.name}</b><small className="text-[10px] uppercase text-[#94a0a8]">{item.name.split(".").pop()}</small></span></div>)}</div>{!media.some((item) => item.type === "document") ? <p className="rounded-xl bg-[#f5f8fa] p-4 text-xs text-[#8c99a2]">No documents uploaded yet.</p> : null}</section>
        </div>
      </aside></> : null}
    </section>
  )
}
