"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { SocialButtons } from "./social-buttons"

const fieldClass =
  "w-full rounded-full border border-transparent bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"

export function LoginForm() {
  const router = useRouter()
  const [remember, setRemember] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      const user = data?.user ?? data?.session?.user
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single()

        if (!profileData) {
          const first_name = (user.user_metadata as any)?.first_name ?? ""
          const last_name = (user.user_metadata as any)?.last_name ?? ""
          await supabase.from("profiles").insert([
            {
              id: user.id,
              first_name,
              last_name,
              role: "member",
            },
          ])
        }
      }

      router.push("/")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed")
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Welcome to HealthiPhy</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Let's begin your journey together</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        HealthiPhy offers science-backed insights, AI-driven tools, and community support to help you make informed decisions about your wellbeing. This platform is for informational purposes only and is not intended as medical advice.
      </p>

      <div className="mt-7">
        <SocialButtons />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@healthiphy.ai"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <a href="#" className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground">
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className={fieldClass}
          />
        </div>

        <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary accent-primary"
          />
          <span>Keep me signed in</span>
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <button
          type="submit"
          className="w-full rounded-full bg-foreground px-4 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-foreground underline underline-offset-2">
          Create one
        </Link>
      </p>
      <p className="mt-4 text-center">
        <Link href="/" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Back to dashboard
        </Link>
      </p>
    </div>
  )
}
