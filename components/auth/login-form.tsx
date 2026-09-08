"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { SocialButtons } from "./social-buttons"
import { Checkbox, ErrorNote, Eyebrow, Field, Heading, PasswordField, PrimaryButton, linkClass } from "./auth-ui"

export function LoginForm() {
  const router = useRouter()
  const [remember, setRemember] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

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
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <Eyebrow>Welcome back</Eyebrow>
      <Heading title="Sign in to HealthiPhy" lead="Pick up where you left off on your journey to better health." />

      <div className="mt-7">
        <SocialButtons />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field
          label="Email"
          id="email"
          icon={Mail}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@healthiphy.ai"
        />

        <PasswordField
          label="Password"
          id="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          hint={<Link href="/forgot-password" className="text-xs font-semibold text-[#238dd4] hover:underline underline-offset-4">Forgot password?</Link>}
        />

        <Checkbox label="Keep me signed in" checked={remember} onChange={(e) => setRemember(e.target.checked)} />

        {error ? <ErrorNote>{error}</ErrorNote> : null}

        <PrimaryButton loading={submitting}>{submitting ? "Signing in..." : "Sign in"}</PrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-[#687684]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className={linkClass}>Create one</Link>
      </p>
      <p className="mt-6 text-center text-xs leading-5 text-[#9a9ba1]">
        HealthiPhy provides information only and is not a substitute for medical advice.
        {" "}<Link href="/" className="underline underline-offset-2 hover:text-[#687684]">Back to dashboard</Link>
      </p>
    </div>
  )
}
