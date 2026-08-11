"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { SocialButtons } from "./social-buttons"

const fieldClass =
  "w-full rounded-full border border-transparent bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"

export function SignupForm() {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
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
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Let's begin your journey together</h1>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Sign up to get started</h2>

      <div className="mt-7">
        <SocialButtons />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="firstName" className="text-sm font-medium text-foreground">
              First name
            </label>
            <input
            id="firstName"
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Johan"
            className={fieldClass}
          />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lastName" className="text-sm font-medium text-foreground">
              Last name
            </label>
            <input
            id="lastName"
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Carter"
            className={fieldClass}
          />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="johan@medicare.com"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={fieldClass}
          />
        </div>

        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-primary accent-primary"
          />
          <span>
            I agree to the{" "}
            <a href="#" className="font-medium text-foreground underline underline-offset-2">
              Terms
            </a>{" "}
            and{" "}
            <a href="#" className="font-medium text-foreground underline underline-offset-2">
              Privacy Policy
            </a>
            .
          </span>
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <button
          type="submit"
          disabled={!agreed}
          className="w-full rounded-full bg-foreground px-4 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-foreground underline underline-offset-2">
          Sign in
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
