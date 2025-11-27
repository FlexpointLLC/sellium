"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowRight } from "phosphor-react"
import { createClient } from "@/lib/supabase/client"

const businessTypes = [
  { value: "fashion", label: "Fashion & Apparel" },
  { value: "electronics", label: "Electronics & Gadgets" },
  { value: "food", label: "Food & Beverages" },
  { value: "health", label: "Health & Beauty" },
  { value: "home", label: "Home & Garden" },
  { value: "sports", label: "Sports & Outdoors" },
  { value: "toys", label: "Toys & Games" },
  { value: "books", label: "Books & Stationery" },
  { value: "jewelry", label: "Jewelry & Accessories" },
  { value: "art", label: "Art & Crafts" },
  { value: "automotive", label: "Automotive" },
  { value: "pets", label: "Pets & Animals" },
  { value: "services", label: "Services" },
  { value: "digital", label: "Digital Products" },
  { value: "other", label: "Other" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    businessType: "",
  })
  const [errors, setErrors] = useState({
    name: "",
    username: "",
    businessType: "",
  })

  // Check if user is authenticated and onboarding status
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      setUser(user)
      
      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, username, onboarding_completed")
        .eq("id", user.id)
        .single()

      if (profile?.onboarding_completed) {
        // User already completed onboarding, redirect to dashboard
        router.push("/dashboard")
        return
      }

      // Pre-fill name from profile or user metadata if available
      const fullName = profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || ""
      const existingUsername = profile?.username || ""
      
      if (fullName || existingUsername) {
        setFormData(prev => ({ 
          ...prev, 
          name: fullName,
          username: existingUsername 
        }))
      }
    }
    checkUser()
  }, [supabase, router])

  const validateUsername = (username: string) => {
    // Only allow lowercase letters, numbers, and hyphens
    const regex = /^[a-z0-9-]+$/
    if (!username) return "Username is required"
    if (username.length < 3) return "Username must be at least 3 characters"
    if (username.length > 30) return "Username must be less than 30 characters"
    if (!regex.test(username)) return "Only lowercase letters, numbers, and hyphens allowed"
    if (username.startsWith("-") || username.endsWith("-")) return "Username cannot start or end with a hyphen"
    return ""
  }

  const handleUsernameChange = async (value: string) => {
    // Convert to lowercase and replace spaces with hyphens
    const formatted = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    setFormData({ ...formData, username: formatted })
    
    const validationError = validateUsername(formatted)
    if (validationError) {
      setErrors({ ...errors, username: validationError })
      return
    }

    // Check if username is available in both profiles and stores
    setCheckingUsername(true)
    
    const [profileCheck, storeCheck] = await Promise.all([
      supabase.from("profiles").select("id").eq("username", formatted).single(),
      supabase.from("stores").select("id").eq("username", formatted).single()
    ])

    if (profileCheck.data || storeCheck.data) {
      setErrors({ ...errors, username: "This username is already taken" })
    } else {
      setErrors({ ...errors, username: "" })
    }
    setCheckingUsername(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all fields
    const nameError = formData.name.trim() ? "" : "Name is required"
    const usernameError = validateUsername(formData.username)
    const businessTypeError = formData.businessType ? "" : "Please select a business type"

    setErrors({
      name: nameError,
      username: usernameError,
      businessType: businessTypeError,
    })

    if (nameError || usernameError || businessTypeError) return

    setIsLoading(true)

    try {
      if (!user) {
        setErrors({ ...errors, name: "You must be logged in" })
        return
      }

      // Update profile with name, username, and set onboarding_completed to true
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          name: formData.name.trim(),
          username: formData.username,
          onboarding_completed: true,
        })

      if (profileError) {
        console.error("Profile error:", profileError)
        if (profileError.code === "23505") {
          setErrors({ ...errors, username: "This username is already taken" })
          return
        }
      }

      // Create store with default limits for free plan
      const { error: storeError } = await supabase
        .from("stores")
        .insert({
          user_id: user.id,
          username: formData.username,
          name: `${formData.name.trim()}'s Store`,
          business_type: formData.businessType,
          plan: 'free',
          traffic_limit: 2000,
          product_limit: 100,
        })

      if (storeError) {
        if (storeError.code === "23505") {
          setErrors({ ...errors, username: "This username is already taken" })
        } else {
          console.error("Store error:", storeError)
          setErrors({ ...errors, name: "Failed to create store. Please try again." })
        }
        return
      }

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Onboarding error:", error)
      setErrors({ ...errors, name: "An unexpected error occurred" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome to Sellium</h1>
            <p className="text-3xl text-muted-foreground tracking-tight">
              Let&apos;s set up your store.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: "" })
                }}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="your-store-name"
                  value={formData.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className={errors.username ? "border-destructive" : ""}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your store will be available at sellium.store/{formData.username || "your-store-name"}
              </p>
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>

            {/* Business Type Field */}
            <div className="space-y-2">
              <Label htmlFor="businessType">Type of Business</Label>
              <Select
                value={formData.businessType}
                onValueChange={(value) => {
                  setFormData({ ...formData, businessType: value })
                  if (errors.businessType) setErrors({ ...errors, businessType: "" })
                }}
              >
                <SelectTrigger className={errors.businessType ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select your business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.businessType && (
                <p className="text-sm text-destructive">{errors.businessType}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                "Setting up..."
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
  )
}

