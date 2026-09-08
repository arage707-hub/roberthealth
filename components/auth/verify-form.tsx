"use client"

import { useRouter } from "next/navigation"
import { MailCheck } from "lucide-react"
import { Eyebrow, Heading, PrimaryButton } from "./auth-ui"

export function VerifyForm({ email }: { email?: string }) {
  const router = useRouter()

  return (
    <div className="mx-auto w-full max-w-sm">
      <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-[#238dd4] to-[#33d201] text-white shadow-lg shadow-[#238dd4]/25">
        <MailCheck className="size-7" />
      </span>
      <div className="mt-6"><Eyebrow>Verify your email</Eyebrow></div>
      <Heading
        title="Check your inbox"
        lead={<>We sent a verification link to <span className="font-semibold text-[#292a34]">{email ?? "your email"}</span>. Click the link in that email to activate your account.</>}
      />

      <div className="mt-6 space-y-4">
        <PrimaryButton type="button" onClick={() => router.push("/login")}>Go to login</PrimaryButton>
        <p className="text-center text-xs leading-5 text-[#9a9ba1]">
          If you haven&apos;t received the email, wait a few minutes and check spam. If it still doesn&apos;t arrive, try signing up again.
        </p>
      </div>
    </div>
  )
}
