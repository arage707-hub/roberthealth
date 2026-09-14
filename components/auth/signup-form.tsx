"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, UserRound } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import { SocialButtons } from "./social-buttons"
import { Checkbox, ErrorNote, Eyebrow, Field, Heading, PasswordField, PrimaryButton, linkClass } from "./auth-ui"
import { siteUrl } from "@/lib/config"

export function SignupForm() {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteUrl}/verify`,
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      const userId = data?.user?.id ?? data?.session?.user?.id
      if (userId) {
        await supabase.from("profiles").insert([
          {
            id: userId,
            first_name: firstName,
            last_name: lastName,
            role: "member",
          },
        ])
      }

      window.localStorage.setItem("pendingSignupEmail", email)
      router.push("/verify")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Signup failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <Eyebrow>Get started</Eyebrow>
      <Heading title="Create your account" lead="Let's begin your journey together. It only takes a minute." />

      <div className="mt-7">
        <SocialButtons />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First name"
            id="firstName"
            icon={UserRound}
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Johan"
          />
          <Field
            label="Last name"
            id="lastName"
            icon={UserRound}
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Carter"
          />
        </div>

        <Field
          label="Email"
          id="email"
          icon={Mail}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="johan@example.com"
        />

        <PasswordField
          label="Password"
          id="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />

        <Checkbox
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          label={<>I agree to the <a href="#" className={linkClass}>Terms</a> and <a href="#" className={linkClass}>Privacy Policy</a>.</>}
        />

        {error ? <ErrorNote>{error}</ErrorNote> : null}

        <PrimaryButton loading={submitting} disabled={!agreed}>{submitting ? "Creating account..." : "Create account"}</PrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-[#687684]">
        Already have an account?{" "}
        <Link href="/login" className={linkClass}>Sign in</Link>
      </p>
      <p className="mt-6 text-center text-xs leading-5 text-[#9a9ba1]">
        HealthiPhy provides information only and is not a substitute for medical advice.
        {" "}<Link href="/" className="underline underline-offset-2 hover:text-[#687684]">Back to dashboard</Link>
      </p>
    </div>
  )
}
