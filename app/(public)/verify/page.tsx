"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "phosphor-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

function VerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const supabase = createClient()
  
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return

    const newOtp = [...otp]
    
    // Handle paste
    if (value.length > 1) {
      const digits = value.slice(0, 6).split("")
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit
        }
      })
      setOtp(newOtp)
      // Focus last filled input or next empty one
      const nextIndex = Math.min(index + digits.length, 5)
      inputRefs.current[nextIndex]?.focus()
      return
    }

    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pastedData) {
      const newOtp = [...otp]
      pastedData.split("").forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit
      })
      setOtp(newOtp)
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus()
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.join("")
    
    if (code.length !== 6) {
      setError("Please enter all 6 digits")
      return
    }

    setError(null)
    setLoading(true)

    try {
      // Verify OTP with Supabase
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      
      // On success, redirect to dashboard
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError("Invalid verification code. Please try again.")
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    
    setResending(true)
    setError(null)

    try {
      // Resend OTP via Supabase
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setCountdown(60) // 60 second cooldown
      }
    } catch (err) {
      setError("Failed to resend code. Please try again.")
    } finally {
      setResending(false)
    }
  }

  // Redirect to login if no email
  if (!email) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <p className="text-muted-foreground">No email provided.</p>
          <Button asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} weight="bold" />
          Back to login
        </Link>

        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Check your email.
          </h1>
          <p className="text-3xl text-muted-foreground tracking-tight">
            We sent a verification code to
          </p>
          <p className="text-base font-medium">
            {email}
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Verification code
            </label>
            <div className="flex gap-2" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading}
                  className="flex h-[70px] w-12 rounded-md border border-input bg-background text-center text-2xl font-semibold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11"
            disabled={loading || otp.join("").length !== 6}
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </form>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Can&apos;t find your code? Check your spam folder.
          </p>
          <p className="text-sm text-muted-foreground">
            Haven&apos;t received the code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="text-foreground hover:underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending 
                ? "Sending..." 
                : countdown > 0 
                  ? `Resend in ${countdown}s` 
                  : "Get a new code"
              }
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              Check your email.
            </h1>
            <p className="text-3xl text-muted-foreground tracking-tight">
              Loading...
            </p>
          </div>
        </div>
      </div>
    }>
      <VerifyForm />
    </Suspense>
  )
}

