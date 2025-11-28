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
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .insert({
          user_id: user.id,
          username: formData.username,
          name: `${formData.name.trim()}'s Store`,
          business_type: formData.businessType,
          plan: 'free',
          traffic_limit: 2000,
          product_limit: 100,
          currency: 'BDT',
        })
        .select()
        .single()

      if (storeError) {
        if (storeError.code === "23505") {
          setErrors({ ...errors, username: "This username is already taken" })
        } else {
          console.error("Store error:", storeError)
          setErrors({ ...errors, name: "Failed to create store. Please try again." })
        }
        return
      }

      // Create default store pages with demo content
      if (storeData) {
        const defaultPages = [
          {
            store_id: storeData.id,
            slug: 'about',
            title: 'About Us',
            content: `<h1>Welcome to Our Store</h1>
<p>We are passionate about providing you with the best products and exceptional service. Our journey began with a simple mission: to make quality products accessible to everyone.</p>

<h2>Our Story</h2>
<p>Founded in 2024, we started as a small team with big dreams. Over the years, we&apos;ve grown into a trusted name in the industry, serving thousands of satisfied customers worldwide.</p>

<h2>Our Mission</h2>
<p>Our mission is to deliver high-quality products that exceed your expectations while providing outstanding customer service at every step of your journey with us.</p>

<h2>Why Choose Us?</h2>
<ul>
  <li><strong>Quality Products:</strong> We carefully curate every item in our collection</li>
  <li><strong>Fast Shipping:</strong> Quick and reliable delivery to your doorstep</li>
  <li><strong>Customer Support:</strong> Our team is here to help you 24/7</li>
  <li><strong>Secure Shopping:</strong> Your privacy and security are our top priorities</li>
</ul>

<h2>Contact Us</h2>
<p>Have questions? We&apos;d love to hear from you! Reach out to us anytime, and we&apos;ll be happy to assist you.</p>`,
            is_published: true
          },
          {
            store_id: storeData.id,
            slug: 'privacy',
            title: 'Privacy Policy',
            content: `<h1>Privacy Policy</h1>
<p>Last updated: ${new Date().toLocaleDateString()}</p>

<h2>Introduction</h2>
<p>We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you visit our store.</p>

<h2>Information We Collect</h2>
<p>We may collect the following types of information:</p>
<ul>
  <li><strong>Personal Information:</strong> Name, email address, phone number, and shipping address</li>
  <li><strong>Payment Information:</strong> Credit card details, billing address (processed securely through our payment providers)</li>
  <li><strong>Usage Data:</strong> Information about how you interact with our website</li>
  <li><strong>Device Information:</strong> IP address, browser type, and device identifiers</li>
</ul>

<h2>How We Use Your Information</h2>
<p>We use the information we collect to:</p>
<ul>
  <li>Process and fulfill your orders</li>
  <li>Communicate with you about your orders and inquiries</li>
  <li>Improve our website and services</li>
  <li>Send you marketing communications (with your consent)</li>
  <li>Comply with legal obligations</li>
</ul>

<h2>Data Security</h2>
<p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.</p>

<h2>Your Rights</h2>
<p>You have the right to:</p>
<ul>
  <li>Access your personal data</li>
  <li>Correct inaccurate data</li>
  <li>Request deletion of your data</li>
  <li>Object to processing of your data</li>
  <li>Data portability</li>
</ul>

<h2>Cookies</h2>
<p>We use cookies to enhance your browsing experience. You can control cookie preferences through your browser settings.</p>

<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy, please contact us through our customer support channels.</p>`,
            is_published: true
          },
          {
            store_id: storeData.id,
            slug: 'shipping',
            title: 'Shipping Information',
            content: `<h1>Shipping Information</h1>
<p>We want to ensure your orders arrive safely and on time. Please review our shipping policies below.</p>

<h2>Shipping Methods</h2>
<p>We offer the following shipping options:</p>
<ul>
  <li><strong>Standard Shipping:</strong> 5-7 business days</li>
  <li><strong>Express Shipping:</strong> 2-3 business days</li>
  <li><strong>Overnight Shipping:</strong> Next business day (where available)</li>
</ul>

<h2>Shipping Rates</h2>
<p>Shipping costs are calculated at checkout based on:</p>
<ul>
  <li>Package weight and dimensions</li>
  <li>Shipping destination</li>
  <li>Selected shipping method</li>
</ul>
<p>Free shipping is available on orders over a certain amount. Check our current promotions for details.</p>

<h2>Processing Time</h2>
<p>Orders are typically processed within 1-2 business days. During peak seasons, processing may take 3-5 business days. You will receive a confirmation email once your order has been shipped.</p>

<h2>Shipping Destinations</h2>
<p>We currently ship to the following regions:</p>
<ul>
  <li>Domestic (all regions)</li>
  <li>International shipping available (additional charges may apply)</li>
</ul>
<p>Please note that international orders may be subject to customs duties and taxes, which are the responsibility of the recipient.</p>

<h2>Order Tracking</h2>
<p>Once your order ships, you will receive a tracking number via email. You can use this number to track your package on our website or the carrier&apos;s website.</p>

<h2>Delivery Issues</h2>
<p>If you experience any issues with delivery:</p>
<ul>
  <li>Contact us immediately with your order number</li>
  <li>We will investigate and work with the shipping carrier to resolve the issue</li>
  <li>Lost or damaged packages will be replaced or refunded at no cost to you</li>
</ul>

<h2>Contact Us</h2>
<p>For questions about shipping, please contact our customer service team. We&apos;re here to help!</p>`,
            is_published: true
          },
          {
            store_id: storeData.id,
            slug: 'returns',
            title: 'Returns & Refunds',
            content: `<h1>Returns & Refunds Policy</h1>
<p>We want you to be completely satisfied with your purchase. Please review our returns and refunds policy below.</p>

<h2>Return Eligibility</h2>
<p>Items can be returned within 30 days of delivery, provided they meet the following conditions:</p>
<ul>
  <li>Items must be unused and in their original condition</li>
  <li>Original packaging and tags must be included</li>
  <li>Proof of purchase (receipt or order confirmation) is required</li>
  <li>Certain items may be non-returnable (e.g., personalized items, perishables)</li>
</ul>

<h2>How to Return</h2>
<p>To initiate a return:</p>
<ol>
  <li>Contact our customer service team with your order number</li>
  <li>We will provide you with a return authorization and shipping instructions</li>
  <li>Package the item securely in its original packaging</li>
  <li>Ship the item back using the provided return label or your preferred method</li>
</ol>

<h2>Return Shipping</h2>
<p>Return shipping costs:</p>
<ul>
  <li>If the return is due to our error or a defective item, we cover return shipping</li>
  <li>For other returns, the customer is responsible for return shipping costs</li>
  <li>We recommend using a trackable shipping method</li>
</ul>

<h2>Refund Process</h2>
<p>Once we receive and inspect your returned item:</p>
<ul>
  <li>Refunds will be processed within 5-10 business days</li>
  <li>Refunds will be issued to the original payment method</li>
  <li>You will receive an email confirmation when the refund is processed</li>
  <li>Please allow additional time for the refund to appear in your account</li>
</ul>

<h2>Exchanges</h2>
<p>We currently offer exchanges for:</p>
<ul>
  <li>Different sizes (subject to availability)</li>
  <li>Different colors (subject to availability)</li>
</ul>
<p>To request an exchange, please contact customer service with your order number and desired item.</p>

<h2>Damaged or Defective Items</h2>
<p>If you receive a damaged or defective item:</p>
<ul>
  <li>Contact us immediately with photos of the damage</li>
  <li>We will arrange for a replacement or full refund</li>
  <li>Return shipping will be covered by us</li>
</ul>

<h2>Non-Returnable Items</h2>
<p>The following items cannot be returned:</p>
<ul>
  <li>Personalized or customized items</li>
  <li>Perishable goods</li>
  <li>Items damaged by misuse or normal wear</li>
  <li>Items without proof of purchase</li>
</ul>

<h2>Contact Us</h2>
<p>For questions about returns or refunds, please contact our customer service team. We&apos;re here to help!</p>`,
            is_published: true
          }
        ]

        // Insert all default pages
        const { error: pagesError } = await supabase
          .from("store_pages")
          .insert(defaultPages)

        if (pagesError) {
          console.error("Error creating default pages:", pagesError)
          // Don't block onboarding if pages fail to create, but log the error
        }
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

