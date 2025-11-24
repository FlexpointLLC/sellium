"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Get redirect URL from query params, default to home
  const redirectTo = searchParams.get("redirectTo") || "/"

  const handleGoogleLogin = async () => {
    setError(null)
    setLoading(true)

    try {
      // TODO: Implement Google OAuth
      console.log("Google login")
      setError("Google login not implemented yet")
      setLoading(false)
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // TODO: Implement email magic link
      console.log("Email login:", email)
      setError("Email login not implemented yet")
      setLoading(false)
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Your marketplace.
          </h1>
          <p className="text-3xl text-muted-foreground tracking-tight">
            Log in to your Sellium account
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-11 justify-center gap-3"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <img
            src="/Google__G__logo.svg"
            alt="Google"
            className="h-5 w-5"
          />
          Continue with Google
        </Button>

        <form onSubmit={handleEmailContinue} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Use an organization email to easily collaborate with teammates
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-11"
            disabled={loading || !email}
          >
            {loading ? "Continuing..." : "Continue"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          By continuing, you acknowledge that you understand and agree to the{" "}
          <Link
            href="/terms"
            className="text-foreground hover:underline underline-offset-2"
          >
            Terms & Conditions
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-foreground hover:underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              Your marketplace.
            </h1>
            <p className="text-3xl text-muted-foreground tracking-tight">
              Log in to your Sellium account
            </p>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
