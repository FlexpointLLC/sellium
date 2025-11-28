"use client"
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Gear, User, Bell, Shield, CreditCard, Storefront, Upload, Image as ImageIcon, Globe, Clock, MapPin, X, Plus, Trash, Link as LinkIcon, CheckCircle, XCircle, ArrowsClockwise, Copy, Check, Lock, Users, Envelope, UserPlus, FileText, Crown, Receipt } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { UpgradeDialog } from "@/components/upgrade-dialog"

type TabType = "store" | "profile" | "team" | "domain" | "notifications" | "payments" | "security" | "pages" | "billing"

// Wrapper component to handle Suspense for useSearchParams
export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <SettingsPageContent />
    </Suspense>
  )
}

function SettingsPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-72 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-3">
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  )
}

function SettingsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // Get initial tab from URL or default to "store"
  const tabFromUrl = searchParams.get("tab") as TabType | null
  const validTabs: TabType[] = ["store", "profile", "team", "domain", "notifications", "payments", "security", "pages", "billing"]
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : "store"
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [upgradeRequests, setUpgradeRequests] = useState<any[]>([])
  const [cancelSubscriptionDialogOpen, setCancelSubscriptionDialogOpen] = useState(false)
  
  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    router.push(`/dashboard/settings?tab=${tab}`, { scroll: false })
  }
  
  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  
  // Upload states
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  
  // Profile data
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    avatar_url: ""
  })
  
  // Store data
  const [store, setStore] = useState({
    name: "",
    username: "",
    description: "",
    logo_url: "",
    favicon_url: "",
    banner_url: "",
    banner_images: [] as string[],  // Multiple banner images
    meta_title: "",
    meta_description: "",
    theme_color: "#22c55e",
    currency: "BDT",
    timezone: "Asia/Dhaka",
    plan: "free" as string,
    available_time: "",
    social_media_text: "",
    copyright_text: "",
    show_powered_by: true,
    subscription_expires_at: null as string | null,
    address: {
      street: "",
      city: "",
      state: "",
      country: "Bangladesh",
      postal_code: ""
    },
    social_links: {
      phone: "",
      whatsapp: "",
      instagram: "",
      facebook: "",
      email: ""
    }
  })
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    email_new_order: true,
    email_order_update: true,
    email_low_stock: true,
    email_new_review: false,
    push_new_order: true,
    push_order_update: false,
    push_low_stock: true,
    push_new_review: false
  })
  
  // Security settings
  const [security, setSecurity] = useState({
    login_alerts: true
  })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Team settings
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"owner" | "agent" | "rider">("agent")
  const [inviting, setInviting] = useState(false)
  const [loadingTeam, setLoadingTeam] = useState(false)

  // Store pages settings
  const [storePages, setStorePages] = useState<{
    about: { title: string; content: string; is_published: boolean }
    privacy: { title: string; content: string; is_published: boolean }
    shipping: { title: string; content: string; is_published: boolean }
    returns: { title: string; content: string; is_published: boolean }
  }>({
    about: { 
      title: "About Us", 
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
    privacy: { 
      title: "Privacy Policy", 
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
    shipping: { 
      title: "Shipping Information", 
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
<p>Once your order ships, you will receive a tracking number via email. You can use this number to track your package on our website or the carrier's website.</p>

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
    returns: { 
      title: "Returns & Refunds", 
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
  <li>Personalized or custom-made items</li>
  <li>Perishable goods</li>
  <li>Items that have been used or damaged by the customer</li>
  <li>Items without original packaging or tags</li>
</ul>

<h2>Contact Us</h2>
<p>For questions about returns or refunds, please contact our customer service team. We&apos;re committed to resolving any issues quickly and fairly.</p>`, 
      is_published: true 
    }
  })
  const [savingPages, setSavingPages] = useState(false)
  const [loadingPages, setLoadingPages] = useState(false)
  const [activePageTab, setActivePageTab] = useState<"about" | "privacy" | "shipping" | "returns">("about")

  // Payment settings
  const [paymentSettings, setPaymentSettings] = useState({
    payment_methods: {
      bkash: false,
      nagad: false,
      card: false,
      cod: true
    },
    payout_method: "bkash",
    payout_account_number: "",
    payout_account_holder: "",
    // Merchant information
    bkash: {
      mode: "manual", // "manual" or "api"
      base_url: "",
      key: "",
      username: "",
      password: "",
      secret: "",
      // Manual payment fields
      number: "",
      instruction: ""
    },
    nagad: {
      mode: "manual", // "manual" or "api"
      api_version: "",
      base_url: "",
      callback_url: "",
      merchant_id: "",
      merchant_number: "",
      private_key: "",
      public_key: "",
      // Manual payment fields
      number: "",
      instruction: ""
    },
    card: {
      // Add card merchant fields as needed
      merchant_id: "",
      api_key: "",
      secret_key: ""
    }
  })

  // Validation errors for payment fields
  const [paymentErrors, setPaymentErrors] = useState({
    bkash: {
      base_url: false,
      key: false,
      username: false,
      password: false,
      secret: false,
      number: false,
      instruction: false
    },
    nagad: {
      api_version: false,
      base_url: false,
      callback_url: false,
      merchant_id: false,
      merchant_number: false,
      number: false,
      instruction: false,
      private_key: false,
      public_key: false
    }
  })

  // Shipping settings
  const [shippingSettings, setShippingSettings] = useState({
    free_shipping: true,
    shipping_cost: 0
  })
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  // Store settings sub-tabs
  const [storeSubTab, setStoreSubTab] = useState<"branding" | "information" | "seo" | "contact">("branding")

  // Custom domain settings
  const [customDomain, setCustomDomain] = useState<{
    id?: string
    domain: string
    status: "not_configured" | "pending" | "verifying" | "verified" | "failed"
    ssl_status: "pending" | "provisioning" | "active" | "failed"
    verification_token?: string
    dns_configured?: boolean
  }>({
    domain: "",
    status: "not_configured",
    ssl_status: "pending"
  })
  const [verifyingDomain, setVerifyingDomain] = useState(false)
  const [domainInput, setDomainInput] = useState("")
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  // Copy to clipboard function
  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedValue(value)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopiedValue(null), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab === "team" && storeId) {
      fetchTeamMembers()
    }
    if (activeTab === "pages" && storeId) {
      fetchStorePages()
    }
    if (storeId) {
      fetchUpgradeRequests()
    }
  }, [storeId])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push("/login")
      return
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileData) {
      setProfile({
        name: profileData.name || "",
        email: profileData.email || user.email || "",
        phone: profileData.phone || "",
        bio: profileData.bio || "",
        avatar_url: profileData.avatar_url || ""
      })
    }

    // Fetch store
    const { data: storeData } = await supabase
      .from("stores")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (storeData) {
      setStoreId(storeData.id)
      setStore({
        name: storeData.name || "",
        username: storeData.username || "",
        description: storeData.description || "",
        logo_url: storeData.logo_url || "",
        favicon_url: storeData.favicon_url || "",
        banner_url: storeData.banner_url || "",
        banner_images: storeData.banner_images || [],
        meta_title: storeData.meta_title || "",
        meta_description: storeData.meta_description || "",
        theme_color: storeData.theme_color || "#22c55e",
        currency: storeData.currency || "BDT",
        timezone: storeData.timezone || "Asia/Dhaka",
        plan: storeData.plan || "free",
        available_time: storeData.available_time || "",
        social_media_text: storeData.social_media_text || "",
        copyright_text: storeData.copyright_text || "",
        show_powered_by: storeData.show_powered_by !== undefined ? storeData.show_powered_by : true,
        subscription_expires_at: storeData.subscription_expires_at || null,
        address: storeData.address || {
          street: "",
          city: "",
          state: "",
          country: "Bangladesh",
          postal_code: ""
        },
        social_links: storeData.social_links || {
          phone: "",
          whatsapp: "",
          instagram: "",
          facebook: "",
          email: ""
        }
      })

      // Fetch payment settings
      if (storeData.payment_settings) {
        const paymentData = typeof storeData.payment_settings === 'string' 
          ? JSON.parse(storeData.payment_settings) 
          : storeData.payment_settings
        setPaymentSettings({
          payment_methods: paymentData.payment_methods || {
            bkash: false,
            nagad: false,
            card: false,
            cod: true
          },
          payout_method: paymentData.payout_method || "bkash",
          payout_account_number: paymentData.payout_account_number || "",
          payout_account_holder: paymentData.payout_account_holder || "",
          bkash: {
            mode: paymentData.bkash?.mode || "manual",
            base_url: paymentData.bkash?.base_url || "",
            key: paymentData.bkash?.key || "",
            username: paymentData.bkash?.username || "",
            password: paymentData.bkash?.password || "",
            secret: paymentData.bkash?.secret || "",
            number: paymentData.bkash?.number || "",
            instruction: paymentData.bkash?.instruction || ""
          },
          nagad: {
            mode: paymentData.nagad?.mode || "manual",
            api_version: paymentData.nagad?.api_version || "",
            base_url: paymentData.nagad?.base_url || "",
            callback_url: paymentData.nagad?.callback_url || "",
            merchant_id: paymentData.nagad?.merchant_id || "",
            merchant_number: paymentData.nagad?.merchant_number || "",
            private_key: paymentData.nagad?.private_key || "",
            public_key: paymentData.nagad?.public_key || "",
            number: paymentData.nagad?.number || "",
            instruction: paymentData.nagad?.instruction || ""
          },
          card: paymentData.card || {
            merchant_id: "",
            api_key: "",
            secret_key: ""
          }
        })
      }

      // Fetch shipping settings
      if (storeData.payment_settings) {
        const paymentData = typeof storeData.payment_settings === 'string' 
          ? JSON.parse(storeData.payment_settings) 
          : storeData.payment_settings
        setShippingSettings({
          free_shipping: paymentData.shipping?.free_shipping !== undefined ? paymentData.shipping.free_shipping : true,
          shipping_cost: paymentData.shipping?.shipping_cost || 0
        })
      }
    }

    // Fetch store settings for notifications
    const { data: settingsData } = await supabase
      .from("store_settings")
      .select("*")
      .eq("store_id", storeData?.id)
      .single()

    if (settingsData) {
      setNotifications({
        email_new_order: settingsData.notify_new_order ?? true,
        email_order_update: true,
        email_low_stock: settingsData.notify_low_stock ?? true,
        email_new_review: settingsData.notify_new_review ?? false,
        push_new_order: true,
        push_order_update: false,
        push_low_stock: true,
        push_new_review: false
      })
    }

    // Fetch custom domain
    const { data: domainData } = await supabase
      .from("custom_domains")
      .select("*")
      .eq("store_id", storeData?.id)
      .single()

    if (domainData) {
      setCustomDomain({
        id: domainData.id,
        domain: domainData.domain,
        status: domainData.status || "pending",
        ssl_status: domainData.ssl_status || "pending",
        verification_token: domainData.verification_token,
        dns_configured: domainData.dns_configured
      })
    }

    setLoading(false)
  }

  async function handleSaveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { error } = await supabase
      .from("profiles")
      .update({
        name: profile.name,
        phone: profile.phone,
        bio: profile.bio,
        avatar_url: profile.avatar_url
      })
      .eq("id", user.id)

    if (error) {
      toast.error("Failed to save profile")
    } else {
      toast.success("Profile saved successfully")
    }
    setSaving(false)
  }

  // Fetch team members
  async function fetchTeamMembers() {
    if (!storeId) return
    
    setLoadingTeam(true)
    const { data, error } = await supabase
      .from("store_members")
      .select(`
        id,
        role,
        invited_at,
        user_id
      `)
      .eq("store_id", storeId)
      .order("invited_at", { ascending: false })

    if (error) {
      console.error("Error fetching team members:", error)
      toast.error("Failed to load team members")
      setLoadingTeam(false)
      return
    }

    // Fetch user profiles for each member
    const membersWithProfiles = await Promise.all(
      (data || []).map(async (member: any) => {
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url")
          .eq("id", member.user_id)
          .single()

        // If profile doesn't exist or email is missing, try to get email from auth
        if (!userProfile || !userProfile.email) {
          // Try to get email from the current user's session if it's them
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          if (currentUser && currentUser.id === member.user_id) {
            return {
              ...member,
              user: {
                id: member.user_id,
                name: userProfile?.name || null,
                email: currentUser.email || null,
                avatar_url: userProfile?.avatar_url || null
              }
            }
          }
        }

        return {
          ...member,
          user: userProfile || {
            id: member.user_id,
            name: null,
            email: null,
            avatar_url: null
          }
        }
      })
    )

    // Also include the store owner (always show owner first)
    const { data: storeData } = await supabase
      .from("stores")
      .select("user_id")
      .eq("id", storeId)
      .single()

    if (storeData) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .eq("id", storeData.user_id)
        .single()

      // Try to get email from auth if not in profile
      let ownerEmail = ownerProfile?.email || null
      if (!ownerEmail) {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser && currentUser.id === storeData.user_id) {
          ownerEmail = currentUser.email || null
        }
      }

      // Always include the owner at the top of the list
      const allMembers = [
        {
          id: "owner",
          role: "owner",
          user_id: storeData.user_id,
          invited_at: null,
          user: {
            id: storeData.user_id,
            name: ownerProfile?.name || null,
            email: ownerEmail,
            avatar_url: ownerProfile?.avatar_url || null
          }
        },
        ...membersWithProfiles
      ]

      setTeamMembers(allMembers)
    } else {
      // If store data not found, still try to show members
      setTeamMembers(membersWithProfiles)
    }

    setLoadingTeam(false)
  }

  // Invite team member
  async function handleInviteMember() {
    if (!inviteEmail.trim() || !storeId) {
      toast.error("Please enter an email address")
      return
    }

    setInviting(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setInviting(false)
      return
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", inviteEmail.trim())
      .single()

    if (!existingUser) {
      toast.error("User with this email does not exist. They need to sign up first.")
      setInviting(false)
      return
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("store_members")
      .select("id")
      .eq("store_id", storeId)
      .eq("user_id", existingUser.id)
      .single()

    if (existingMember) {
      toast.error("User is already a team member")
      setInviting(false)
      return
    }

    // Add as team member
    const { error } = await supabase
      .from("store_members")
      .insert({
        store_id: storeId,
        user_id: existingUser.id,
        role: inviteRole,
        invited_by: user.id
      })

    if (error) {
      console.error("Error inviting member:", error)
      toast.error("Failed to invite team member")
      setInviting(false)
      return
    }

    toast.success("Team member invited successfully")
    setInviteEmail("")
    setInviteRole("agent")
    fetchTeamMembers()
    setInviting(false)
  }

  // Update team member role
  async function handleUpdateMemberRole(memberId: string, newRole: "owner" | "agent" | "rider") {
    if (!storeId) return

    // If it's the owner, we can't change their role
    if (memberId === "owner") {
      toast.error("Cannot change owner role")
      return
    }

    const { error } = await supabase
      .from("store_members")
      .update({ role: newRole })
      .eq("id", memberId)
      .eq("store_id", storeId)

    if (error) {
      console.error("Error updating member role:", error)
      toast.error("Failed to update member role")
      return
    }

    toast.success("Member role updated successfully")
    fetchTeamMembers()
  }

  // Remove team member
  async function handleRemoveMember(memberId: string) {
    if (!storeId) return

    const { error } = await supabase
      .from("store_members")
      .delete()
      .eq("id", memberId)
      .eq("store_id", storeId)

    if (error) {
      console.error("Error removing member:", error)
      toast.error("Failed to remove team member")
      return
    }

    toast.success("Team member removed successfully")
    fetchTeamMembers()
  }

  // Fetch upgrade requests
  async function fetchUpgradeRequests() {
    if (!storeId) return

    const { data: requestsData } = await supabase
      .from("upgrade_requests")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(10)

    if (requestsData) {
      setUpgradeRequests(requestsData)
    }
  }

  async function handleCancelSubscription() {
    if (!storeId) return

    setSaving(true)
    try {
      // Define free plan limits
      const freeLimits = { traffic: 2000, products: 100 }
      const canceledPlan = store.plan // Store the plan being canceled

      // Create a cancellation record in upgrade_requests
      const { error: cancelRecordError } = await supabase
        .from("upgrade_requests")
        .insert({
          store_id: storeId,
          current_plan: canceledPlan,
          requested_plan: canceledPlan === 'paid' ? 'paid' : 'pro', // Placeholder, doesn't matter for canceled
          transaction_id: 'CANCELED',
          billing_period: 'monthly',
          status: 'canceled',
          notes: 'Subscription canceled by user'
        })

      if (cancelRecordError) {
        console.error("Error creating cancellation record:", cancelRecordError)
        // Continue anyway - cancellation record is not critical
      }

      // Update store to free plan
      const { error } = await supabase
        .from("stores")
        .update({
          plan: 'free',
          traffic_limit: freeLimits.traffic,
          product_limit: freeLimits.products,
          subscription_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", storeId)

      if (error) {
        console.error("Error canceling subscription:", error)
        toast.error("Failed to cancel subscription. Please try again.")
        setSaving(false)
        return
      }

      // Update local state
      setStore({
        ...store,
        plan: 'free'
      })

      // Refresh upgrade requests to show the cancellation
      fetchUpgradeRequests()

      toast.success("Subscription canceled successfully. You've been moved to the Free plan.")
      setCancelSubscriptionDialogOpen(false)
    } catch (err) {
      console.error("Cancel subscription error:", err)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // Fetch store pages
  async function fetchStorePages() {
    if (!storeId) return

    setLoadingPages(true)
    const { data, error } = await supabase
      .from("store_pages")
      .select("*")
      .eq("store_id", storeId)

    if (error) {
      console.error("Error fetching pages:", error)
      setLoadingPages(false)
      return
    }

    // Initialize pages with defaults or fetched data
    const privacyTemplate = `<h1>Privacy Policy</h1>
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
<p>If you have questions about this Privacy Policy, please contact us through our customer support channels.</p>`

    const shippingTemplate = `<h1>Shipping Information</h1>
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
<p>Once your order ships, you will receive a tracking number via email. You can use this number to track your package on our website or the carrier's website.</p>

<h2>Delivery Issues</h2>
<p>If you experience any issues with delivery:</p>
<ul>
  <li>Contact us immediately with your order number</li>
  <li>We will investigate and work with the shipping carrier to resolve the issue</li>
  <li>Lost or damaged packages will be replaced or refunded at no cost to you</li>
</ul>

<h2>Contact Us</h2>
<p>For questions about shipping, please contact our customer service team. We&apos;re here to help!</p>`

    const returnsTemplate = `<h1>Returns & Refunds Policy</h1>
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
  <li>Personalized or custom-made items</li>
  <li>Perishable goods</li>
  <li>Items that have been used or damaged by the customer</li>
  <li>Items without original packaging or tags</li>
</ul>

<h2>Contact Us</h2>
<p>For questions about returns or refunds, please contact our customer service team. We&apos;re committed to resolving any issues quickly and fairly.</p>`

    const pages = {
      about: { 
        title: "About Us", 
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
      privacy: { title: "Privacy Policy", content: privacyTemplate, is_published: true },
      shipping: { title: "Shipping Information", content: shippingTemplate, is_published: true },
      returns: { title: "Returns & Refunds", content: returnsTemplate, is_published: true }
    }

    if (data) {
      data.forEach((page: any) => {
        if (pages[page.slug as keyof typeof pages]) {
          const defaultContent = page.slug === "about" ? pages.about.content : 
                                 page.slug === "privacy" ? privacyTemplate :
                                 page.slug === "shipping" ? shippingTemplate :
                                 page.slug === "returns" ? returnsTemplate : ""
          pages[page.slug as keyof typeof pages] = {
            title: page.title,
            content: page.content || defaultContent,
            is_published: page.is_published
          }
        }
      })
    }

    setStorePages(pages)
    setLoadingPages(false)
  }

  // Save store pages
  async function handleSavePages() {
    if (!storeId) return

    setSavingPages(true)

    try {
      const pageSlugs: ("about" | "privacy" | "shipping" | "returns")[] = ["about", "privacy", "shipping", "returns"]
      
      for (const slug of pageSlugs) {
        const page = storePages[slug]
        
        // Check if page exists
        const { data: existingPage } = await supabase
          .from("store_pages")
          .select("id")
          .eq("store_id", storeId)
          .eq("slug", slug)
          .single()

        if (existingPage) {
          // Update existing page
          const { error } = await supabase
            .from("store_pages")
            .update({
              title: page.title,
              content: page.content,
              is_published: page.is_published
            })
            .eq("id", existingPage.id)

          if (error) throw error
        } else {
          // Insert new page
          const { error } = await supabase
            .from("store_pages")
            .insert({
              store_id: storeId,
              slug,
              title: page.title,
              content: page.content,
              is_published: page.is_published
            })

          if (error) throw error
        }
      }

      toast.success("Pages saved successfully")
    } catch (error: any) {
      console.error("Error saving pages:", error)
      const errorMessage = error?.message || "Failed to save pages"
      toast.error(`Failed to save pages: ${errorMessage}`)
    } finally {
      setSavingPages(false)
    }
  }

  // Upload avatar image
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !storeId) return

    setUploadingAvatar(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/')
        await supabase.storage.from('Sellium').remove([`avatars/${oldPath}`])
      }

      const ext = file.name.split('.').pop()
      const fileName = `${user.id}/avatar.${ext}`
      
      const { error: uploadError } = await supabase.storage
        .from('Sellium')
        .upload(`avatars/${fileName}`, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('Sellium')
        .getPublicUrl(`avatars/${fileName}`)

      setProfile({ ...profile, avatar_url: publicUrl })
      
      // Save to database
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id)

      toast.success("Avatar uploaded successfully")
    } catch (error) {
      console.error("Avatar upload error:", error)
      toast.error("Failed to upload avatar")
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Upload store logo
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !storeId) return

    setUploadingLogo(true)
    
    try {
      // Delete old logo if exists
      if (store.logo_url) {
        const oldPath = store.logo_url.split('/').slice(-2).join('/')
        await supabase.storage.from('Sellium').remove([`stores/${oldPath}`])
      }

      const ext = file.name.split('.').pop()
      const fileName = `${storeId}/logo.${ext}`
      
      const { error: uploadError } = await supabase.storage
        .from('Sellium')
        .upload(`stores/${fileName}`, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('Sellium')
        .getPublicUrl(`stores/${fileName}`)

      setStore({ ...store, logo_url: publicUrl })
      
      // Save to database
      await supabase
        .from("stores")
        .update({ logo_url: publicUrl })
        .eq("id", storeId)

      toast.success("Logo uploaded successfully")
    } catch (error) {
      console.error("Logo upload error:", error)
      toast.error("Failed to upload logo")
    } finally {
      setUploadingLogo(false)
    }
  }

  // Upload store favicon
  async function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !storeId) return

    // Validate file type (should be .ico, .png, or .svg)
    const validTypes = ['image/x-icon', 'image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg']
    const validExtensions = ['ico', 'png', 'svg', 'jpg', 'jpeg']
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    
    if (!fileExt || !validExtensions.includes(fileExt)) {
      toast.error("Please upload a valid favicon file (.ico, .png, .svg, .jpg)")
      return
    }

    setUploadingFavicon(true)
    
    try {
      // Delete old favicon if exists
      if (store.favicon_url) {
        const oldPath = store.favicon_url.split('/').slice(-2).join('/')
        await supabase.storage.from('Sellium').remove([`stores/${oldPath}`])
      }

      const fileName = `${storeId}/favicon.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('Sellium')
        .upload(`stores/${fileName}`, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('Sellium')
        .getPublicUrl(`stores/${fileName}`)

      setStore({ ...store, favicon_url: publicUrl })
      
      // Save to database
      await supabase
        .from("stores")
        .update({ favicon_url: publicUrl })
        .eq("id", storeId)

      toast.success("Favicon uploaded successfully")
    } catch (error) {
      console.error("Favicon upload error:", error)
      toast.error("Failed to upload favicon")
    } finally {
      setUploadingFavicon(false)
    }
  }

  // Delete store logo
  async function handleDeleteLogo() {
    if (!store.logo_url || !storeId) return

    try {
      // Delete from storage
      const oldPath = store.logo_url.split('/').slice(-2).join('/')
      await supabase.storage.from('Sellium').remove([`stores/${oldPath}`])

      // Update state and database
      setStore({ ...store, logo_url: "" })
      await supabase
        .from("stores")
        .update({ logo_url: null })
        .eq("id", storeId)

      toast.success("Logo deleted successfully")
    } catch (error) {
      console.error("Logo delete error:", error)
      toast.error("Failed to delete logo")
    }
  }

  // Delete store favicon
  async function handleDeleteFavicon() {
    if (!store.favicon_url || !storeId) return

    try {
      // Delete from storage
      const oldPath = store.favicon_url.split('/').slice(-2).join('/')
      await supabase.storage.from('Sellium').remove([`stores/${oldPath}`])

      // Update state and database
      setStore({ ...store, favicon_url: "" })
      await supabase
        .from("stores")
        .update({ favicon_url: null })
        .eq("id", storeId)

      toast.success("Favicon deleted successfully")
    } catch (error) {
      console.error("Favicon delete error:", error)
      toast.error("Failed to delete favicon")
    }
  }

  // Upload banner image (supports multiple)
  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0 || !storeId) return

    setUploadingBanner(true)
    
    try {
      const newBannerUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = file.name.split('.').pop()
        const fileName = `${storeId}/banner-${Date.now()}-${i}.${ext}`
        
        const { error: uploadError } = await supabase.storage
          .from('Sellium')
          .upload(`stores/${fileName}`, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('Sellium')
          .getPublicUrl(`stores/${fileName}`)

        newBannerUrls.push(publicUrl)
      }

      const updatedBanners = [...store.banner_images, ...newBannerUrls]
      setStore({ ...store, banner_images: updatedBanners })
      
      // Save to database
      await supabase
        .from("stores")
        .update({ banner_images: updatedBanners })
        .eq("id", storeId)

      toast.success(`${files.length} banner(s) uploaded successfully`)
    } catch (error) {
      console.error("Banner upload error:", error)
      toast.error("Failed to upload banner")
    } finally {
      setUploadingBanner(false)
    }
  }

  // Remove a banner image
  async function removeBanner(index: number) {
    if (!storeId) return

    try {
      const bannerUrl = store.banner_images[index]
      
      // Extract path from URL and delete from storage
      const urlParts = bannerUrl.split('/Sellium/')
      if (urlParts[1]) {
        await supabase.storage.from('Sellium').remove([urlParts[1]])
      }

      const updatedBanners = store.banner_images.filter((_, i) => i !== index)
      setStore({ ...store, banner_images: updatedBanners })
      
      // Save to database
      await supabase
        .from("stores")
        .update({ banner_images: updatedBanners })
        .eq("id", storeId)

      toast.success("Banner removed")
    } catch (error) {
      console.error("Banner remove error:", error)
      toast.error("Failed to remove banner")
    }
  }

  async function handleSavePayments() {
    if (!storeId) return
    
    let hasErrors = false;
    const newBkashErrors = {
      base_url: false,
      key: false,
      username: false,
      password: false,
      secret: false,
      number: false,
      instruction: false
    };
    const newNagadErrors = {
      api_version: false,
      base_url: false,
      callback_url: false,
      merchant_id: false,
      merchant_number: false,
      private_key: false,
      public_key: false,
      number: false,
      instruction: false
    };

    // Validate bKash fields if enabled
    if (paymentSettings.payment_methods.bkash) {
      if (paymentSettings.bkash.mode === "api") {
        const { base_url, key, username, password, secret } = paymentSettings.bkash;
        if (!base_url) { newBkashErrors.base_url = true; hasErrors = true; }
        if (!key) { newBkashErrors.key = true; hasErrors = true; }
        if (!username) { newBkashErrors.username = true; hasErrors = true; }
        if (!password) { newBkashErrors.password = true; hasErrors = true; }
        if (!secret) { newBkashErrors.secret = true; hasErrors = true; }
      } else {
        // Manual mode - validate number
        if (!paymentSettings.bkash.number) { newBkashErrors.number = true; hasErrors = true; }
      }
    }

    // Validate Nagad fields if enabled
    if (paymentSettings.payment_methods.nagad) {
      if (paymentSettings.nagad.mode === "api") {
        const { api_version, base_url, callback_url, merchant_id, merchant_number, private_key, public_key } = paymentSettings.nagad;
        if (!api_version) { newNagadErrors.api_version = true; hasErrors = true; }
        if (!base_url) { newNagadErrors.base_url = true; hasErrors = true; }
        if (!callback_url) { newNagadErrors.callback_url = true; hasErrors = true; }
        if (!merchant_id) { newNagadErrors.merchant_id = true; hasErrors = true; }
        if (!merchant_number) { newNagadErrors.merchant_number = true; hasErrors = true; }
        if (!private_key) { newNagadErrors.private_key = true; hasErrors = true; }
        if (!public_key) { newNagadErrors.public_key = true; hasErrors = true; }
      } else {
        // Manual mode - validate number
        if (!paymentSettings.nagad.number) { newNagadErrors.number = true; hasErrors = true; }
      }
    }

    setPaymentErrors({
      bkash: newBkashErrors,
      nagad: newNagadErrors
    });

    if (hasErrors) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setSaving(true)
    
    try {
      // Merge payment settings with shipping settings
      const updatedPaymentSettings = {
        ...paymentSettings,
        shipping: shippingSettings
      }

      const { error } = await supabase
        .from("stores")
        .update({
          payment_settings: updatedPaymentSettings,
          currency: store.currency,
          updated_at: new Date().toISOString()
        })
        .eq("id", storeId)

      if (error) {
        toast.error("Failed to save payment settings")
      } else {
        toast.success("Payment settings saved successfully")
      }
    } catch (err) {
      toast.error("Failed to save payment settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveStore() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { error } = await supabase
      .from("stores")
      .update({
        name: store.name,
        description: store.description,
        logo_url: store.logo_url,
        favicon_url: store.favicon_url,
        banner_images: store.banner_images,
        meta_title: store.meta_title || null,
        meta_description: store.meta_description || null,
        theme_color: store.theme_color,
        currency: store.currency,
        timezone: store.timezone,
        available_time: store.available_time || null,
        social_media_text: store.social_media_text || null,
        copyright_text: store.copyright_text || null,
        show_powered_by: store.show_powered_by,
        address: store.address,
        social_links: store.social_links
      })
      .eq("user_id", user.id)

    if (error) {
      toast.error("Failed to save store settings")
    } else {
      toast.success("Store settings saved successfully")
    }
    setSaving(false)
  }

  async function handleSaveNotifications() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    // Get store ID
    const { data: storeData } = await supabase
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!storeData) {
      toast.error("Store not found")
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from("store_settings")
      .upsert({
        store_id: storeData.id,
        notify_new_order: notifications.email_new_order,
        notify_low_stock: notifications.email_low_stock,
        notify_new_review: notifications.email_new_review
      })

    if (error) {
      toast.error("Failed to save notification settings")
    } else {
      toast.success("Notification settings saved successfully")
    }
    setSaving(false)
  }

  // Sign out all other sessions
  async function handleSignOutAllSessions() {
    setIsSigningOut(true)
    try {
      // Sign out from all devices except current
      const { error } = await supabase.auth.signOut({ scope: 'others' })

    if (error) {
        toast.error("Failed to sign out other sessions")
    } else {
        toast.success("Successfully signed out of all other sessions")
      }
    } catch (error) {
      toast.error("An error occurred while signing out")
    } finally {
      setIsSigningOut(false)
    }
  }

  // Delete account and all associated data
  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm")
      return
    }

    setIsDeleting(true)
    try {
      // Delete store data (this will cascade delete products, orders, etc.)
      if (storeId) {
        // Delete custom domain first if exists
        const { data: domainData } = await supabase
          .from("custom_domains")
          .select("domain")
          .eq("store_id", storeId)
          .single()

        if (domainData?.domain) {
          // Remove domain from Vercel
          try {
            await fetch(`/api/domains?domain=${domainData.domain}`, {
              method: "DELETE"
            })
          } catch (e) {
            // Continue even if Vercel deletion fails
            console.error("Failed to remove domain from Vercel:", e)
          }
        }

        // Delete the store (cascade will handle related data)
        const { error: storeError } = await supabase
          .from("stores")
          .delete()
          .eq("id", storeId)

        if (storeError) {
          throw new Error("Failed to delete store data")
        }
      }

      // Delete the user's profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", user.id)

        if (profileError) {
          console.error("Failed to delete profile:", profileError)
        }
      }

      // Sign out and redirect
      await supabase.auth.signOut()
      toast.success("Account deleted successfully")
      router.push("/")
    } catch (error) {
      console.error("Error deleting account:", error)
      toast.error("Failed to delete account. Please try again.")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setDeleteConfirmText("")
    }
  }

  // Generate a verification token
  function generateVerificationToken() {
    return `sellium-verify-${storeId?.slice(0, 8)}-${Date.now().toString(36)}`
  }

  // Add custom domain via Vercel API
  async function handleAddDomain() {
    if (!storeId || !domainInput.trim()) return

    // Validate domain format
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    if (!domainRegex.test(domainInput.trim())) {
      toast.error("Please enter a valid domain name")
      return
    }

    setVerifyingDomain(true)

    try {
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domainInput.trim().toLowerCase(),
          storeId: storeId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Failed to add domain")
        setVerifyingDomain(false)
        return
      }

      // Always set to pending after adding - user needs to configure DNS
      const newDomainState = {
        id: data.domain?.id,
        domain: data.domain?.domain || domainInput.trim().toLowerCase(),
        status: data.vercel?.verified ? "verified" as const : "pending" as const,
        ssl_status: data.vercel?.verified ? "active" as const : "pending" as const,
        verification_token: data.domain?.verification_token || data.vercel?.verification?.[0]?.value,
        dns_configured: data.vercel?.verified || false
      }
      
      console.log("Setting domain state:", newDomainState)
      setCustomDomain(newDomainState)
      setDomainInput("")
      setVerifyingDomain(false)
      
      if (data.vercel?.verified) {
        toast.success("Domain added and verified!")
      } else {
        toast.success("Domain added! Please configure DNS records below.")
      }
    } catch (error) {
      console.error("Error adding domain:", error)
      toast.error("Failed to add domain")
      setVerifyingDomain(false)
    }
  }

  // Verify DNS configuration via Vercel API
  async function handleVerifyDomain() {
    if (!customDomain.domain || !storeId) return

    setVerifyingDomain(true)

    // Update UI to show verifying state
    setCustomDomain(prev => ({
      ...prev,
      status: "verifying"
    }))

    try {
      const response = await fetch(
        `/api/domains?domain=${encodeURIComponent(customDomain.domain)}&storeId=${storeId}`
      )

      const data = await response.json()
      console.log("Verify response:", data)

      if (!response.ok) {
        toast.error(data.error || "Failed to verify domain")
        setCustomDomain(prev => ({
          ...prev,
          status: "pending"
        }))
        setVerifyingDomain(false)
        return
      }

      if (data.verified) {
        setCustomDomain(prev => ({
          ...prev,
          status: "verified",
          ssl_status: "active",
          dns_configured: true
        }))
        toast.success("Domain verified successfully! SSL certificate is active.")
      } else {
        // Show more detailed error from Vercel
        const verificationInfo = data.verification?.[0]
        if (verificationInfo) {
          toast.error(`DNS not configured: ${verificationInfo.reason || "Please check your DNS records"}`)
        } else {
          toast.info("DNS not configured yet. Please add the DNS records and try again.")
        }
        setCustomDomain(prev => ({
          ...prev,
          status: "pending",
          dns_configured: false
        }))
      }
    } catch (error) {
      console.error("Error verifying domain:", error)
      toast.error("Failed to verify domain")
      setCustomDomain(prev => ({
        ...prev,
        status: "pending"
      }))
    } finally {
      setVerifyingDomain(false)
    }
  }

  // Remove custom domain via Vercel API
  async function handleRemoveDomain() {
    if (!customDomain.domain || !storeId) return

    try {
      const response = await fetch(
        `/api/domains?domain=${encodeURIComponent(customDomain.domain)}&storeId=${storeId}`,
        { method: "DELETE" }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Failed to remove domain")
        return
      }

      setCustomDomain({
        domain: "",
        status: "not_configured",
        ssl_status: "pending"
      })
      toast.success("Domain removed from Vercel successfully")
    } catch (error) {
      console.error("Error removing domain:", error)
      toast.error("Failed to remove domain")
    }
  }

  const tabs = [
    { id: "store" as TabType, label: "Store", icon: Storefront },
    { id: "payments" as TabType, label: "Payments", icon: CreditCard },
    { id: "billing" as TabType, label: "Plan & Billing", icon: Receipt },
    { id: "domain" as TabType, label: "Custom Domain", icon: LinkIcon },
    { id: "profile" as TabType, label: "Profile", icon: User },
    { id: "team" as TabType, label: "Team", icon: Users },
    { id: "pages" as TabType, label: "Pages", icon: FileText },
    { id: "security" as TabType, label: "Security", icon: Shield },
    { id: "notifications" as TabType, label: "Notifications", icon: Bell },
  ]

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-normal">Settings</h1>
          <p className="text-sm font-normal text-muted-foreground">Manage your account and store settings</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading settings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-normal">Settings</h1>
        <p className="text-sm font-normal text-muted-foreground">Manage your account and store settings</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-muted"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="flex items-center gap-2">
                  {tab.label}
                  {tab.id === "domain" && store.plan === 'free' && (
                    <Crown className="h-4 w-4 text-orange-500" weight="fill" />
                  )}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Pending Upgrade Request Banner */}
          {upgradeRequests.some((req) => req.status === 'pending') && (
            <div className="mb-6 rounded-xl border border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Crown className="h-5 w-5 text-orange-600 dark:text-orange-400" weight="fill" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    Your upgrade request is in progress
                  </h3>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    We are reviewing your upgrade request. It typically takes 1 to 24 hours to verify your transaction. 
                    You will be notified once your request has been processed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Store Tab */}
          {activeTab === "store" && (
            <div className="rounded-lg border border-border/50 bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Store Settings</h2>
                <p className="text-sm text-muted-foreground">Customize your store appearance and information</p>
              </div>

              {/* Store Sub-tabs */}
              <div className="mb-6 border-b border-border/50">
                <nav className="flex gap-1 -mb-px">
                  <button
                    onClick={() => setStoreSubTab("branding")}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                      storeSubTab === "branding"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    Branding
                  </button>
                  <button
                    onClick={() => setStoreSubTab("information")}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                      storeSubTab === "information"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    Information
                  </button>
                  <button
                    onClick={() => setStoreSubTab("seo")}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                      storeSubTab === "seo"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    SEO
                  </button>
                  <button
                    onClick={() => setStoreSubTab("contact")}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                      storeSubTab === "contact"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    Contact & Footer
                  </button>
                </nav>
              </div>

              <div className="space-y-8">
                {/* Branding Tab */}
                {storeSubTab === "branding" && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold mb-1">Branding</h3>
                      <p className="text-xs text-muted-foreground">Customize your store&apos;s visual identity</p>
                    </div>
                    
                    {/* Store Logo & Favicon */}
                    <div className="grid gap-6 md:grid-cols-2">
                {/* Store Logo */}
                <div className="space-y-2">
                  <Label>Store Logo</Label>
                  <div className="flex items-center gap-4">
                          <div className="relative flex h-16 w-16 items-center justify-center rounded-lg bg-muted overflow-hidden border border-border/50 group">
                      {store.logo_url ? (
                              <>
                        <img src={store.logo_url} alt="Logo" className="h-full w-full object-cover" />
                                <button
                                  onClick={handleDeleteLogo}
                                  className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete logo"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </>
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingLogo ? "Uploading..." : "Upload Logo"}
                      </Button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Recommended: 200x200px, PNG or JPG
                      </p>
                    </div>
                  </div>
                </div>

                      {/* Store Favicon */}
                <div className="space-y-2">
                        <Label>Store Favicon</Label>
                        <div className="flex items-center gap-4">
                          <div className="relative flex h-16 w-16 items-center justify-center rounded-lg bg-muted overflow-hidden border border-border/50 group">
                            {store.favicon_url ? (
                              <>
                                <img src={store.favicon_url} alt="Favicon" className="h-full w-full object-cover" />
                                <button
                                  onClick={handleDeleteFavicon}
                                  className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete favicon"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </>
                            ) : (
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <input
                              ref={faviconInputRef}
                              type="file"
                              accept=".ico,.png,.svg,.jpg,.jpeg"
                              className="hidden"
                              onChange={handleFaviconUpload}
                            />
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => faviconInputRef.current?.click()}
                              disabled={uploadingFavicon}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {uploadingFavicon ? "Uploading..." : "Upload Favicon"}
                            </Button>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Recommended: 32x32px, ICO, PNG or SVG
                            </p>
                          </div>
                        </div>
                        </div>
                      </div>

                      <Separator className="my-6" />

                    {/* Store Banners */}
                    <div className="space-y-3">
                      <div>
                  <Label>Store Banners</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                    Upload multiple banners for your storefront slider. Recommended: 1920x600px
                  </p>
                      </div>
                  
                  {/* Banner Grid */}
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {store.banner_images.map((banner, index) => (
                          <div key={index} className="relative group aspect-[16/5] rounded-lg overflow-hidden border border-border/50 bg-muted">
                        <img src={banner} alt={`Banner ${index + 1}`} className="h-full w-full object-cover" />
                        <button
                          onClick={() => removeBanner(index)}
                          className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/50 text-white text-xs">
                          Banner {index + 1}
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Banner Button */}
                    <div 
                      className="aspect-[16/5] rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleBannerUpload}
                      />
                      {uploadingBanner ? (
                        <span className="text-sm text-muted-foreground">Uploading...</span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Plus className="h-5 w-5" />
                          Add Banner
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                    <Separator className="my-6" />

                    {/* Theme Color */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Appearance</h3>
                        <p className="text-xs text-muted-foreground">Theme color for your store</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Theme Color</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={store.theme_color}
                            onChange={(e) => setStore({ ...store, theme_color: e.target.value })}
                            className="h-10 w-14 rounded border border-input cursor-pointer"
                          />
                          <Input 
                            value={store.theme_color}
                            onChange={(e) => setStore({ ...store, theme_color: e.target.value })}
                            className="w-32"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Information Tab */}
                {storeSubTab === "information" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold mb-1">Basic Information</h3>
                      <p className="text-xs text-muted-foreground">Store name, username, and description</p>
                    </div>
                    
                    <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Store Name</Label>
                    <Input 
                      value={store.name} 
                      onChange={(e) => setStore({ ...store, name: e.target.value })}
                      placeholder="My Store"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground">
                        sellium.store/
                      </span>
                      <Input 
                        value={store.username}
                        className="rounded-l-none"
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Store Description</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Describe your store..."
                    value={store.description}
                    onChange={(e) => setStore({ ...store, description: e.target.value })}
                  />
                    </div>
                </div>

                    {/* Regional Settings */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Regional Settings</h3>
                        <p className="text-xs text-muted-foreground">Timezone configuration</p>
                </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={store.timezone} onValueChange={(v) => setStore({ ...store, timezone: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Dhaka">Asia/Dhaka (GMT+6)</SelectItem>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (GMT-5)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai (GMT+4)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                  </div>
                )}

                {/* SEO Tab */}
                {storeSubTab === "seo" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold mb-1">SEO Settings</h3>
                      <p className="text-xs text-muted-foreground">Customize how your store appears in search engines and browser tabs</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Page Title</Label>
                        <Input 
                          value={store.meta_title} 
                          onChange={(e) => setStore({ ...store, meta_title: e.target.value })}
                          placeholder="Sellium - Multi-Vendor Marketplace"
                        />
                        <p className="text-xs text-muted-foreground">
                          This appears in browser tabs and search results. Leave empty to use default.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Meta Description</Label>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          placeholder="A modern multi-vendor ecommerce platform"
                          value={store.meta_description}
                          onChange={(e) => setStore({ ...store, meta_description: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Brief description for search engines. Recommended: 150-160 characters.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Tab */}
                {storeSubTab === "contact" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold mb-1">Contact Information</h3>
                      <p className="text-xs text-muted-foreground">Social links and store address</p>
                    </div>
                    
                    <div className="space-y-6">
                {/* Social Links */}
                <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-medium mb-3">Social Links</h4>
                      </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input 
                        value={store.social_links.phone}
                        onChange={(e) => setStore({ ...store, social_links: { ...store.social_links, phone: e.target.value } })}
                        placeholder="+880 1XXX-XXXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Input 
                        value={store.social_links.whatsapp}
                        onChange={(e) => setStore({ ...store, social_links: { ...store.social_links, whatsapp: e.target.value } })}
                        placeholder="+880 1XXX-XXXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Instagram</Label>
                      <Input 
                        value={store.social_links.instagram}
                        onChange={(e) => setStore({ ...store, social_links: { ...store.social_links, instagram: e.target.value } })}
                        placeholder="https://instagram.com/yourstore"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Facebook</Label>
                      <Input 
                        value={store.social_links.facebook}
                        onChange={(e) => setStore({ ...store, social_links: { ...store.social_links, facebook: e.target.value } })}
                        placeholder="https://facebook.com/yourstore"
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div>
                        <h4 className="text-xs font-medium mb-3">Store Address</h4>
                      </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Street Address</Label>
                      <Input 
                        value={store.address.street}
                        onChange={(e) => setStore({ ...store, address: { ...store.address, street: e.target.value } })}
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input 
                        value={store.address.city}
                        onChange={(e) => setStore({ ...store, address: { ...store.address, city: e.target.value } })}
                        placeholder="Dhaka"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State / Division</Label>
                      <Input 
                        value={store.address.state}
                        onChange={(e) => setStore({ ...store, address: { ...store.address, state: e.target.value } })}
                        placeholder="Dhaka Division"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input 
                        value={store.address.country}
                        onChange={(e) => setStore({ ...store, address: { ...store.address, country: e.target.value } })}
                        placeholder="Bangladesh"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Postal Code</Label>
                      <Input 
                        value={store.address.postal_code}
                        onChange={(e) => setStore({ ...store, address: { ...store.address, postal_code: e.target.value } })}
                        placeholder="1000"
                      />
                    </div>
                  </div>
                    </div>

                {/* Available Time & Social Media Text */}
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div>
                        <h4 className="text-xs font-medium mb-3">Store Information</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Available Time</Label>
                          <Input 
                            value={store.available_time}
                            onChange={(e) => setStore({ ...store, available_time: e.target.value })}
                            placeholder="SAT - FRI, 10AM - 11PM"
                          />
                          <p className="text-xs text-muted-foreground">Display your store&apos;s operating hours</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Social Media Text</Label>
                          <Input 
                            value={store.social_media_text}
                            onChange={(e) => setStore({ ...store, social_media_text: e.target.value })}
                            placeholder="Follow us on social media for updates and offers."
                          />
                          <p className="text-xs text-muted-foreground">Text displayed in the footer&apos;s &quot;Follow Us&quot; section</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Copyright Text</Label>
                          <Input 
                            value={store.copyright_text}
                            onChange={(e) => setStore({ ...store, copyright_text: e.target.value })}
                            placeholder="© 2025 {store_name}. All rights reserved. Powered by Sellium"
                          />
                          <p className="text-xs text-muted-foreground">Footer copyright text. Use {"{store_name}"} to insert store name</p>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Label>Show &quot;Powered by Sellium&quot;</Label>
                              {store.plan === 'free' && (
                                <Crown className="h-4 w-4 text-orange-500" weight="fill" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {store.plan === 'free' 
                                ? 'Available for Paid and Pro plans only'
                                : 'Display the "Powered by Sellium" text in the footer'}
                            </p>
                          </div>
                          <Switch
                            checked={store.show_powered_by}
                            onCheckedChange={(checked) => setStore({ ...store, show_powered_by: checked })}
                            disabled={store.plan === 'free'}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                )}
                </div>

              {/* Save Button - Always visible */}
              <div className="flex justify-end gap-4 pt-6 mt-8 border-t border-border/50">
                  <Button variant="outline" size="sm">Cancel</Button>
                  <Button size="sm" onClick={handleSaveStore} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="rounded-lg border border-border/50 bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Profile Settings</h2>
                <p className="text-sm text-muted-foreground">Update your personal information</p>
              </div>

              <div className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted overflow-hidden border border-border/50">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingAvatar ? "Uploading..." : "Upload Photo"}
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      JPG, PNG or GIF. Max size 2MB
                    </p>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input 
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+880 1XXX-XXXXXX"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Tell us about yourself..."
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-border/50">
                  <Button variant="outline" size="sm">Cancel</Button>
                  <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === "team" && (
            <div className="rounded-lg border border-border/50 bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Team Management</h2>
                <p className="text-sm text-muted-foreground">Manage team members for your store</p>
              </div>

              <div className="space-y-6">
                {/* Invite Team Member */}
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invite Team Member
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={inviteRole} onValueChange={(value: "owner" | "agent" | "rider") => setInviteRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="rider">Rider</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleInviteMember}
                        disabled={!inviteEmail.trim() || inviting}
                        className="w-full"
                      >
                        {inviting ? "Inviting..." : "Send Invite"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Team Members List */}
                <div>
                  <h3 className="text-sm font-medium mb-4">Team Members</h3>
                  {loadingTeam ? (
                    <div className="text-center py-8 text-muted-foreground">Loading team members...</div>
                  ) : teamMembers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No team members yet</div>
                  ) : (
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 border border-border/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                              {member.user?.avatar_url ? (
                                <img src={member.user.avatar_url} alt={member.user.name || ""} className="h-full w-full rounded-full object-cover" />
                              ) : (
                                <User className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{member.user?.name || "Unknown"}</p>
                              {member.user?.email && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{member.user.email}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Select
                              value={member.role}
                              onValueChange={(value: "owner" | "agent" | "rider") => handleUpdateMemberRole(member.id, value)}
                              disabled={member.id === "owner"}
                            >
                              <SelectTrigger 
                                className={`w-[100px] h-7 text-xs capitalize ${
                                  member.role === "owner" ? "bg-purple-500/10 text-purple-500 border-purple-500/30" :
                                  member.role === "agent" ? "bg-blue-500/10 text-blue-500 border-blue-500/30" :
                                  "bg-gray-500/10 text-gray-500 border-gray-500/30"
                                }`}
                              >
                                <SelectValue placeholder="Role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">Owner</SelectItem>
                                <SelectItem value="agent">Agent</SelectItem>
                                <SelectItem value="rider">Rider</SelectItem>
                              </SelectContent>
                            </Select>
                            {member.id !== "owner" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pages Tab */}
          {activeTab === "pages" && (
            <div className="rounded-lg border border-border/50 bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Footer Pages</h2>
                <p className="text-sm text-muted-foreground">Customize your store&apos;s footer pages (About Us, Privacy Policy, Shipping, Returns)</p>
              </div>

              {loadingPages ? (
                <div className="text-center py-8 text-muted-foreground">Loading pages...</div>
              ) : (
                <>
                  {/* Sub-tabs navigation */}
                  <div className="mb-6 border-b border-border/50">
                    <nav className="flex gap-1 -mb-px">
                      <button
                        onClick={() => setActivePageTab("about")}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                          activePageTab === "about"
                            ? "border-foreground text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                        }`}
                      >
                        About Us
                      </button>
                      <button
                        onClick={() => setActivePageTab("privacy")}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                          activePageTab === "privacy"
                            ? "border-foreground text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                        }`}
                      >
                        Privacy Policy
                      </button>
                      <button
                        onClick={() => setActivePageTab("shipping")}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                          activePageTab === "shipping"
                            ? "border-foreground text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                        }`}
                      >
                        Shipping Information
                      </button>
                      <button
                        onClick={() => setActivePageTab("returns")}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                          activePageTab === "returns"
                            ? "border-foreground text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                        }`}
                      >
                        Returns & Refunds
                      </button>
                    </nav>
                  </div>

                  <div className="space-y-8">
                    {/* About Us Tab */}
                    {activePageTab === "about" && (
                      <div className="rounded-lg border border-border/50 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-sm font-semibold">About Us</h3>
                          <Switch
                            checked={storePages.about.is_published}
                            onCheckedChange={(checked) =>
                              setStorePages({
                                ...storePages,
                                about: { ...storePages.about, is_published: checked }
                              })
                            }
                          />
                        </div>
                        {storePages.about.is_published && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={storePages.about.title}
                                onChange={(e) =>
                                  setStorePages({
                                    ...storePages,
                                    about: { ...storePages.about, title: e.target.value }
                                  })
                                }
                                placeholder="About Us"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Content</Label>
                              <RichTextEditor
                                value={storePages.about.content}
                                onChange={(value) =>
                                  setStorePages({
                                    ...storePages,
                                    about: { ...storePages.about, content: value }
                                  })
                                }
                                placeholder="Write about your store..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Privacy Policy Tab */}
                    {activePageTab === "privacy" && (
                      <div className="rounded-lg border border-border/50 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-sm font-semibold">Privacy Policy</h3>
                          <Switch
                            checked={storePages.privacy.is_published}
                            onCheckedChange={(checked) =>
                              setStorePages({
                                ...storePages,
                                privacy: { ...storePages.privacy, is_published: checked }
                              })
                            }
                          />
                        </div>
                        {storePages.privacy.is_published && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={storePages.privacy.title}
                                onChange={(e) =>
                                  setStorePages({
                                    ...storePages,
                                    privacy: { ...storePages.privacy, title: e.target.value }
                                  })
                                }
                                placeholder="Privacy Policy"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Content</Label>
                              <RichTextEditor
                                value={storePages.privacy.content}
                                onChange={(value) =>
                                  setStorePages({
                                    ...storePages,
                                    privacy: { ...storePages.privacy, content: value }
                                  })
                                }
                                placeholder="Write your privacy policy..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Shipping Information Tab */}
                    {activePageTab === "shipping" && (
                      <div className="rounded-lg border border-border/50 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-sm font-semibold">Shipping Information</h3>
                          <Switch
                            checked={storePages.shipping.is_published}
                            onCheckedChange={(checked) =>
                              setStorePages({
                                ...storePages,
                                shipping: { ...storePages.shipping, is_published: checked }
                              })
                            }
                          />
                        </div>
                        {storePages.shipping.is_published && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={storePages.shipping.title}
                                onChange={(e) =>
                                  setStorePages({
                                    ...storePages,
                                    shipping: { ...storePages.shipping, title: e.target.value }
                                  })
                                }
                                placeholder="Shipping Information"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Content</Label>
                              <RichTextEditor
                                value={storePages.shipping.content}
                                onChange={(value) =>
                                  setStorePages({
                                    ...storePages,
                                    shipping: { ...storePages.shipping, content: value }
                                  })
                                }
                                placeholder="Write your shipping information..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Returns & Refunds Tab */}
                    {activePageTab === "returns" && (
                      <div className="rounded-lg border border-border/50 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-sm font-semibold">Returns & Refunds</h3>
                          <Switch
                            checked={storePages.returns.is_published}
                            onCheckedChange={(checked) =>
                              setStorePages({
                                ...storePages,
                                returns: { ...storePages.returns, is_published: checked }
                              })
                            }
                          />
                        </div>
                        {storePages.returns.is_published && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={storePages.returns.title}
                                onChange={(e) =>
                                  setStorePages({
                                    ...storePages,
                                    returns: { ...storePages.returns, title: e.target.value }
                                  })
                                }
                                placeholder="Returns & Refunds"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Content</Label>
                              <RichTextEditor
                                value={storePages.returns.content}
                                onChange={(value) =>
                                  setStorePages({
                                    ...storePages,
                                    returns: { ...storePages.returns, content: value }
                                  })
                                }
                                placeholder="Write your returns and refunds policy..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end pt-4 border-t border-border/50">
                      <Button
                        onClick={handleSavePages}
                        disabled={savingPages}
                      >
                        {savingPages ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Custom Domain Tab */}
          {activeTab === "domain" && (
            <div className="rounded-lg border border-border/50 bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Custom Domain</h2>
                <p className="text-sm text-muted-foreground">Connect your own domain to your store using Vercel DNS</p>
              </div>

              <div className="space-y-6">
                {/* Current Domain Status */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Default Domain</h3>
                  <div className="p-4 border border-border/50 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">sellium.store/{store.username}</p>
                          <p className="text-xs text-muted-foreground">Your default Sellium subdomain</p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 bg-green-500/10 px-2 py-1 rounded flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Add Custom Domain */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Custom Domain</h3>
                    {store.plan === 'free' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-500 rounded border border-orange-500/30">
                        <Lock className="h-3 w-3" weight="fill" />
                        Paid
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use your own domain (e.g., shop.yourbrand.com) instead of the default Sellium subdomain.
                  </p>
                  
                  {store.plan === 'free' ? (
                    <div className="p-4 border border-border/50 rounded-lg bg-muted/50 space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Lock className="h-4 w-4" weight="fill" />
                        <span>Custom domain is available for Paid plan users only.</span>
                      </div>
                      <Link
                        href="/dashboard/settings?tab=billing"
                        className="inline-flex items-center px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-md transition-colors"
                      >
                        Upgrade to Paid
                      </Link>
                    </div>
                  ) : (
                  <div className="space-y-4">
                    {/* Show input only if no domain configured */}
                    {customDomain.status === "not_configured" && (
                      <div className="space-y-2">
                        <Label>Domain Name</Label>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="shop.yourbrand.com"
                            value={domainInput}
                            onChange={(e) => setDomainInput(e.target.value)}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={!domainInput.trim() || verifyingDomain}
                            onClick={handleAddDomain}
                          >
                            {verifyingDomain ? (
                              <>
                                <ArrowsClockwise className="h-4 w-4 mr-2 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              "Add Domain"
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Enter your domain without http:// or https://
                        </p>
                      </div>
                    )}

                    {/* Domain Status */}
                    {customDomain.status !== "not_configured" && (
                      <div className="p-4 border border-border/50 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <LinkIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{customDomain.domain}</p>
                              <p className="text-xs text-muted-foreground">Custom domain</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                            customDomain.status === "verified" 
                              ? "text-green-600 bg-green-500/10" 
                              : customDomain.status === "pending" || customDomain.status === "verifying"
                              ? "text-yellow-600 bg-yellow-500/10"
                              : "text-red-600 bg-red-500/10"
                          }`}>
                            {customDomain.status === "verified" && <CheckCircle className="h-3 w-3" />}
                            {(customDomain.status === "pending" || customDomain.status === "verifying") && <ArrowsClockwise className="h-3 w-3" />}
                            {customDomain.status === "failed" && <XCircle className="h-3 w-3" />}
                            {customDomain.status === "verified" ? "Verified" : customDomain.status === "verifying" ? "Verifying..." : customDomain.status === "pending" ? "Pending DNS" : "Failed"}
                          </span>
                        </div>

                        {(customDomain.status === "pending" || customDomain.status === "failed") && (
                          <div className="space-y-4">
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
                                Configure DNS with Vercel
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                Add the following DNS records to your domain provider. DNS changes may take up to 48 hours to propagate.
                              </p>
                            </div>
                            
                            <div className="bg-muted rounded-lg p-4 space-y-4 text-sm">
                              {/* For apex domain */}
                              <div>
                                <p className="text-xs text-muted-foreground mb-2 font-medium">For apex domain ({customDomain.domain}):</p>
                                <div className="grid grid-cols-3 gap-4 bg-background p-3 rounded border">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                                    <div className="flex items-center gap-1">
                                      <p className="font-mono text-xs">A</p>
                                      <button
                                        onClick={() => copyToClipboard("A")}
                                        className="p-1 hover:bg-muted rounded transition-colors"
                                        title="Copy"
                                      >
                                        {copiedValue === "A" ? (
                                          <Check className="h-3 w-3 text-green-500" />
                                        ) : (
                                          <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Name</p>
                                    <div className="flex items-center gap-1">
                                      <p className="font-mono text-xs">@</p>
                                      <button
                                        onClick={() => copyToClipboard("@")}
                                        className="p-1 hover:bg-muted rounded transition-colors"
                                        title="Copy"
                                      >
                                        {copiedValue === "@" ? (
                                          <Check className="h-3 w-3 text-green-500" />
                                        ) : (
                                          <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Value</p>
                                    <div className="flex items-center gap-1">
                                      <p className="font-mono text-xs">216.198.79.1</p>
                                      <button
                                        onClick={() => copyToClipboard("216.198.79.1")}
                                        className="p-1 hover:bg-muted rounded transition-colors"
                                        title="Copy"
                                      >
                                        {copiedValue === "216.198.79.1" ? (
                                          <Check className="h-3 w-3 text-green-500" />
                                        ) : (
                                          <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* For www subdomain */}
                              <div>
                                <p className="text-xs text-muted-foreground mb-2 font-medium">For www subdomain:</p>
                                <div className="grid grid-cols-3 gap-4 bg-background p-3 rounded border">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                                    <div className="flex items-center gap-1">
                                      <p className="font-mono text-xs">CNAME</p>
                                      <button
                                        onClick={() => copyToClipboard("CNAME")}
                                        className="p-1 hover:bg-muted rounded transition-colors"
                                        title="Copy"
                                      >
                                        {copiedValue === "CNAME" ? (
                                          <Check className="h-3 w-3 text-green-500" />
                                        ) : (
                                          <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Name</p>
                                    <div className="flex items-center gap-1">
                                      <p className="font-mono text-xs">www</p>
                                      <button
                                        onClick={() => copyToClipboard("www")}
                                        className="p-1 hover:bg-muted rounded transition-colors"
                                        title="Copy"
                                      >
                                        {copiedValue === "www" ? (
                                          <Check className="h-3 w-3 text-green-500" />
                                        ) : (
                                          <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Value</p>
                                    <div className="flex items-center gap-1">
                                      <p className="font-mono text-xs break-all">cname.vercel-dns.com</p>
                                      <button
                                        onClick={() => copyToClipboard("cname.vercel-dns.com")}
                                        className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
                                        title="Copy"
                                      >
                                        {copiedValue === "cname.vercel-dns.com" ? (
                                          <Check className="h-3 w-3 text-green-500" />
                                        ) : (
                                          <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Verification TXT record */}
                              {customDomain.verification_token && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-2 font-medium">Verification record (optional):</p>
                                  <div className="grid grid-cols-3 gap-4 bg-background p-3 rounded border">
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Type</p>
                                      <div className="flex items-center gap-1">
                                        <p className="font-mono text-xs">TXT</p>
                                        <button
                                          onClick={() => copyToClipboard("TXT")}
                                          className="p-1 hover:bg-muted rounded transition-colors"
                                          title="Copy"
                                        >
                                          {copiedValue === "TXT" ? (
                                            <Check className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Name</p>
                                      <div className="flex items-center gap-1">
                                        <p className="font-mono text-xs">_vercel</p>
                                        <button
                                          onClick={() => copyToClipboard("_vercel")}
                                          className="p-1 hover:bg-muted rounded transition-colors"
                                          title="Copy"
                                        >
                                          {copiedValue === "_vercel" ? (
                                            <Check className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Value</p>
                                      <div className="flex items-center gap-1">
                                        <p className="font-mono text-xs break-all">{customDomain.verification_token}</p>
                                        <button
                                          onClick={() => copyToClipboard(customDomain.verification_token || "")}
                                          className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
                                          title="Copy"
                                        >
                                          {copiedValue === customDomain.verification_token ? (
                                            <Check className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {customDomain.status === "failed" && (
                              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-sm text-red-600 dark:text-red-400">
                                  DNS verification failed. Please check your DNS records and try again.
                                </p>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleVerifyDomain}
                                disabled={verifyingDomain}
                              >
                                {verifyingDomain ? (
                                  <>
                                    <ArrowsClockwise className="h-4 w-4 mr-2 animate-spin" />
                                    Verifying...
                                  </>
                                ) : (
                                  <>
                                    <ArrowsClockwise className="h-4 w-4 mr-2" />
                                    Verify DNS
                                  </>
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={handleRemoveDomain}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        )}

                        {customDomain.status === "verifying" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <ArrowsClockwise className="h-4 w-4 text-yellow-500 animate-spin" />
                              <span>Verifying DNS configuration...</span>
                            </div>
                          </div>
                        )}

                        {customDomain.status === "verified" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>DNS configured correctly</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              {customDomain.ssl_status === "active" ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span>SSL certificate active</span>
                                </>
                              ) : customDomain.ssl_status === "provisioning" ? (
                                <>
                                  <ArrowsClockwise className="h-4 w-4 text-yellow-500 animate-spin" />
                                  <span>SSL certificate provisioning...</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <span>SSL certificate failed</span>
                                </>
                              )}
                            </div>
                            <div className="pt-2">
                              <p className="text-xs text-muted-foreground mb-2">
                                Your store is now accessible at:
                              </p>
                              <a 
                                href={`https://${customDomain.domain}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-primary hover:underline"
                              >
                                https://{customDomain.domain}
                              </a>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive hover:text-destructive mt-2"
                              onClick={handleRemoveDomain}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Remove Domain
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>

                {/* Help Section */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <h3 className="text-sm font-medium">DNS Configuration Help</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="p-4 border border-border/50 rounded-lg">
                      <p className="text-sm font-medium mb-1">Popular DNS Providers</p>
                      <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                        <li>• Cloudflare - DNS settings → Add record</li>
                        <li>• GoDaddy - DNS Management → Add</li>
                        <li>• Namecheap - Advanced DNS → Add record</li>
                        <li>• Google Domains - DNS → Custom records</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-border/50 rounded-lg">
                      <p className="text-sm font-medium mb-1">Troubleshooting</p>
                      <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                        <li>• DNS changes can take up to 48 hours</li>
                        <li>• Remove any existing A/CNAME records first</li>
                        <li>• Disable proxy (orange cloud) in Cloudflare</li>
                        <li>• Check for typos in record values</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="rounded-lg border border-border/50 bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Notification Settings</h2>
                <p className="text-sm text-muted-foreground">Choose how you want to be notified</p>
              </div>

              <div className="space-y-6">
                {/* Email Notifications */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Email Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">New Order</p>
                        <p className="text-xs text-muted-foreground">Get notified when you receive a new order</p>
                      </div>
                      <Switch 
                        checked={notifications.email_new_order}
                        onCheckedChange={(v) => setNotifications({ ...notifications, email_new_order: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Order Updates</p>
                        <p className="text-xs text-muted-foreground">Get notified when order status changes</p>
                      </div>
                      <Switch 
                        checked={notifications.email_order_update}
                        onCheckedChange={(v) => setNotifications({ ...notifications, email_order_update: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Low Stock Alert</p>
                        <p className="text-xs text-muted-foreground">Get notified when product stock is low</p>
                      </div>
                      <Switch 
                        checked={notifications.email_low_stock}
                        onCheckedChange={(v) => setNotifications({ ...notifications, email_low_stock: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">New Review</p>
                        <p className="text-xs text-muted-foreground">Get notified when you receive a new review</p>
                      </div>
                      <Switch 
                        checked={notifications.email_new_review}
                        onCheckedChange={(v) => setNotifications({ ...notifications, email_new_review: v })}
                      />
                    </div>
                  </div>
                </div>

                {/* Push Notifications */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <h3 className="text-sm font-medium">Push Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">New Order</p>
                        <p className="text-xs text-muted-foreground">Receive push notification for new orders</p>
                      </div>
                      <Switch 
                        checked={notifications.push_new_order}
                        onCheckedChange={(v) => setNotifications({ ...notifications, push_new_order: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Order Updates</p>
                        <p className="text-xs text-muted-foreground">Receive push notification for order updates</p>
                      </div>
                      <Switch 
                        checked={notifications.push_order_update}
                        onCheckedChange={(v) => setNotifications({ ...notifications, push_order_update: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Low Stock Alert</p>
                        <p className="text-xs text-muted-foreground">Receive push notification for low stock</p>
                      </div>
                      <Switch 
                        checked={notifications.push_low_stock}
                        onCheckedChange={(v) => setNotifications({ ...notifications, push_low_stock: v })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-border/50">
                  <Button variant="outline" size="sm">Cancel</Button>
                  <Button size="sm" onClick={handleSaveNotifications} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="rounded-lg border border-border/50 bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Payment Settings</h2>
                <p className="text-sm text-muted-foreground">Manage your payment methods and payout settings</p>
              </div>

              <div className="space-y-6">
                {/* Currency */}
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={store.currency} onValueChange={(v) => setStore({ ...store, currency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BDT">BDT - Bangladeshi Taka</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Currency used for all payments and transactions
                  </p>
                </div>

                {/* Shipping Settings */}
                <div className="space-y-4 p-4 rounded-xl bg-green-50 dark:bg-green-400/15 border border-green-200 dark:border-green-300/25">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Shipping Settings</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Configure shipping charges for your store
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-background">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Free Shipping</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable free shipping for all orders
                      </p>
                    </div>
                    <Switch 
                      checked={shippingSettings.free_shipping}
                      onCheckedChange={(checked) => 
                        setShippingSettings({
                          ...shippingSettings,
                          free_shipping: checked
                        })
                      }
                    />
                  </div>
                  {!shippingSettings.free_shipping && (
                    <div className="space-y-2">
                      <Label>Shipping Cost ({store.currency})</Label>
                      <Input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={shippingSettings.shipping_cost}
                        onChange={(e) => 
                          setShippingSettings({
                            ...shippingSettings,
                            shipping_cost: parseFloat(e.target.value) || 0
                          })
                        }
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the shipping cost that will be charged to customers
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Accepted Payment Methods</h3>
                  <div className="space-y-6">
                    {/* Bkash */}
                    <div className="space-y-4 p-4 border border-border/50 rounded-lg">
                      <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded flex items-center justify-center p-1">
                          <img 
                            src="/bkash.svg" 
                            alt="bKash" 
                            className="w-full h-full"
                            onError={(e) => {
                              console.error('Bkash image failed to load');
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">bKash</p>
                          <p className="text-xs text-muted-foreground">Mobile banking payment</p>
                        </div>
                      </div>
                      <Switch 
                        checked={paymentSettings.payment_methods.bkash}
                        onCheckedChange={(checked) => 
                          setPaymentSettings({
                            ...paymentSettings,
                            payment_methods: {
                              ...paymentSettings.payment_methods,
                              bkash: checked
                            }
                          })
                        }
                      />
                    </div>
                      {paymentSettings.payment_methods.bkash && (
                        <div className="mt-4 p-4 rounded-lg bg-muted/20 border border-border">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-medium">bKash Configuration</h4>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${paymentSettings.bkash.mode === 'manual' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Manual</span>
                              <Switch 
                                checked={paymentSettings.bkash.mode === 'api'}
                                onCheckedChange={(checked) => 
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    bkash: {
                                      ...paymentSettings.bkash,
                                      mode: checked ? 'api' : 'manual'
                                    }
                                  })
                                }
                              />
                              <span className={`text-xs ${paymentSettings.bkash.mode === 'api' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Merchant API</span>
                            </div>
                          </div>
                          
                          {paymentSettings.bkash.mode === 'manual' ? (
                            <div className="space-y-4">
                              <p className="text-xs text-muted-foreground">
                                Customers will send payment manually to your bKash number.
                              </p>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">bKash Number</Label>
                                <Input 
                                  placeholder="01XXXXXXXXX"
                                  value={paymentSettings.bkash.number}
                                  onChange={(e) => {
                                    setPaymentSettings({
                                      ...paymentSettings,
                                      bkash: {
                                        ...paymentSettings.bkash,
                                        number: e.target.value
                                      }
                                    })
                                    if (paymentErrors.bkash.number) {
                                      setPaymentErrors({
                                        ...paymentErrors,
                                        bkash: { ...paymentErrors.bkash, number: false }
                                      })
                                    }
                                  }}
                                  className={`bg-background ${paymentErrors.bkash.number ? 'border-red-500' : ''}`}
                                />
                                {paymentErrors.bkash.number && (
                                  <p className="text-xs text-red-500">This field is required</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Payment Instruction</Label>
                                <Textarea 
                                  placeholder="Enter instructions for customers (e.g., Send money to 01XXXXXXXXX and include your order number in the reference)"
                                  value={paymentSettings.bkash.instruction}
                                  onChange={(e) => 
                                    setPaymentSettings({
                                      ...paymentSettings,
                                      bkash: {
                                        ...paymentSettings.bkash,
                                        instruction: e.target.value
                                      }
                                    })
                                  }
                                  className="bg-background min-h-[80px]"
                                />
                              </div>
                            </div>
                          ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Base URL</Label>
                              <Input 
                                placeholder="https://tokenized.pay.bka.sh/v1.2.0-beta"
                                value={paymentSettings.bkash.base_url}
                                onChange={(e) => {
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    bkash: {
                                      ...paymentSettings.bkash,
                                      base_url: e.target.value
                                    }
                                  })
                                  if (paymentErrors.bkash.base_url) {
                                    setPaymentErrors({
                                      ...paymentErrors,
                                      bkash: { ...paymentErrors.bkash, base_url: false }
                                    })
                                  }
                                }}
                                className={`bg-background ${paymentErrors.bkash.base_url ? 'border-red-500' : ''}`}
                              />
                              {paymentErrors.bkash.base_url && (
                                <p className="text-xs text-red-500">This field is required</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">App Key</Label>
                              <Input 
                                placeholder="Enter your bKash app key"
                                value={paymentSettings.bkash.key}
                                onChange={(e) => {
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    bkash: {
                                      ...paymentSettings.bkash,
                                      key: e.target.value
                                    }
                                  })
                                  if (paymentErrors.bkash.key) {
                                    setPaymentErrors({
                                      ...paymentErrors,
                                      bkash: { ...paymentErrors.bkash, key: false }
                                    })
                                  }
                                }}
                                className={`bg-background ${paymentErrors.bkash.key ? 'border-red-500' : ''}`}
                              />
                              {paymentErrors.bkash.key && (
                                <p className="text-xs text-red-500">This field is required</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Username</Label>
                              <Input 
                                placeholder="Enter your bKash username"
                                value={paymentSettings.bkash.username}
                                onChange={(e) => {
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    bkash: {
                                      ...paymentSettings.bkash,
                                      username: e.target.value
                                    }
                                  })
                                  if (paymentErrors.bkash.username) {
                                    setPaymentErrors({
                                      ...paymentErrors,
                                      bkash: { ...paymentErrors.bkash, username: false }
                                    })
                                  }
                                }}
                                className={`bg-background ${paymentErrors.bkash.username ? 'border-red-500' : ''}`}
                              />
                              {paymentErrors.bkash.username && (
                                <p className="text-xs text-red-500">This field is required</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Password</Label>
                              <Input 
                                type="password"
                                placeholder="••••••••"
                                value={paymentSettings.bkash.password}
                                onChange={(e) => {
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    bkash: {
                                      ...paymentSettings.bkash,
                                      password: e.target.value
                                    }
                                  })
                                  if (paymentErrors.bkash.password) {
                                    setPaymentErrors({
                                      ...paymentErrors,
                                      bkash: { ...paymentErrors.bkash, password: false }
                                    })
                                  }
                                }}
                                className={`bg-background ${paymentErrors.bkash.password ? 'border-red-500' : ''}`}
                              />
                              {paymentErrors.bkash.password && (
                                <p className="text-xs text-red-500">This field is required</p>
                              )}
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label className="text-xs font-medium">App Secret</Label>
                              <Input 
                                type="password"
                                placeholder="••••••••••••••••"
                                value={paymentSettings.bkash.secret}
                                onChange={(e) => {
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    bkash: {
                                      ...paymentSettings.bkash,
                                      secret: e.target.value
                                    }
                                  })
                                  if (paymentErrors.bkash.secret) {
                                    setPaymentErrors({
                                      ...paymentErrors,
                                      bkash: { ...paymentErrors.bkash, secret: false }
                                    })
                                  }
                                }}
                                className={`bg-background ${paymentErrors.bkash.secret ? 'border-red-500' : ''}`}
                              />
                              {paymentErrors.bkash.secret && (
                                <p className="text-xs text-red-500">This field is required</p>
                              )}
                            </div>
                          </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Nagad */}
                    <div className="space-y-4 p-4 border border-border/50 rounded-lg">
                      <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded flex items-center justify-center p-1">
                          <img 
                            src="/nagad.svg" 
                            alt="Nagad" 
                            className="w-full h-full"
                            onError={(e) => {
                              console.error('Nagad image failed to load');
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Nagad</p>
                          <p className="text-xs text-muted-foreground">Mobile banking payment</p>
                        </div>
                      </div>
                      <Switch 
                        checked={paymentSettings.payment_methods.nagad}
                        onCheckedChange={(checked) => 
                          setPaymentSettings({
                            ...paymentSettings,
                            payment_methods: {
                              ...paymentSettings.payment_methods,
                              nagad: checked
                            }
                          })
                        }
                      />
                    </div>
                      {paymentSettings.payment_methods.nagad && (
                        <div className="mt-4 p-4 rounded-lg bg-muted/20 border border-border">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-medium">Nagad Configuration</h4>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${paymentSettings.nagad.mode === 'manual' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Manual</span>
                              <Switch 
                                checked={paymentSettings.nagad.mode === 'api'}
                                onCheckedChange={(checked) => 
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    nagad: {
                                      ...paymentSettings.nagad,
                                      mode: checked ? 'api' : 'manual'
                                    }
                                  })
                                }
                              />
                              <span className={`text-xs ${paymentSettings.nagad.mode === 'api' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Merchant API</span>
                            </div>
                          </div>
                          
                          {paymentSettings.nagad.mode === 'manual' ? (
                            <div className="space-y-4">
                              <p className="text-xs text-muted-foreground">
                                Customers will send payment manually to your Nagad number.
                              </p>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Nagad Number</Label>
                                <Input 
                                  placeholder="01XXXXXXXXX"
                                  value={paymentSettings.nagad.number}
                                  onChange={(e) => {
                                    setPaymentSettings({
                                      ...paymentSettings,
                                      nagad: {
                                        ...paymentSettings.nagad,
                                        number: e.target.value
                                      }
                                    })
                                    if (paymentErrors.nagad.number) {
                                      setPaymentErrors({
                                        ...paymentErrors,
                                        nagad: { ...paymentErrors.nagad, number: false }
                                      })
                                    }
                                  }}
                                  className={`bg-background ${paymentErrors.nagad.number ? 'border-red-500' : ''}`}
                                />
                                {paymentErrors.nagad.number && (
                                  <p className="text-xs text-red-500">This field is required</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Payment Instruction</Label>
                                <Textarea 
                                  placeholder="Enter instructions for customers (e.g., Send money to 01XXXXXXXXX and include your order number in the reference)"
                                  value={paymentSettings.nagad.instruction}
                                  onChange={(e) => 
                                    setPaymentSettings({
                                      ...paymentSettings,
                                      nagad: {
                                        ...paymentSettings.nagad,
                                        instruction: e.target.value
                                      }
                                    })
                                  }
                                  className="bg-background min-h-[80px]"
                                />
                              </div>
                            </div>
                          ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">API Version</Label>
                              <Input 
                                placeholder="v1"
                                value={paymentSettings.nagad.api_version}
                                onChange={(e) => {
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    nagad: {
                                      ...paymentSettings.nagad,
                                      api_version: e.target.value
                                    }
                                  })
                                  if (paymentErrors.nagad.api_version) {
                                    setPaymentErrors({
                                      ...paymentErrors,
                                      nagad: { ...paymentErrors.nagad, api_version: false }
                                    })
                                  }
                                }}
                                className={`bg-background ${paymentErrors.nagad.api_version ? 'border-red-500' : ''}`}
                              />
                              {paymentErrors.nagad.api_version && (
                                <p className="text-xs text-red-500">This field is required</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Base URL</Label>
                              <Input 
                                placeholder="https://api.mynagad.com"
                                value={paymentSettings.nagad.base_url}
                                onChange={(e) => {
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    nagad: {
                                      ...paymentSettings.nagad,
                                      base_url: e.target.value
                                    }
                                  })
                                  if (paymentErrors.nagad.base_url) {
                                    setPaymentErrors({
                                      ...paymentErrors,
                                      nagad: { ...paymentErrors.nagad, base_url: false }
                                    })
                                  }
                                }}
                                className={`bg-background ${paymentErrors.nagad.base_url ? 'border-red-500' : ''}`}
                              />
                              {paymentErrors.nagad.base_url && (
                                <p className="text-xs text-red-500">This field is required</p>
                              )}
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label className="text-xs font-medium">Callback URL</Label>
                              <Input 
                                placeholder="https://yourdomain.com/api/nagad/callback"
                                value={paymentSettings.nagad.callback_url}
                                onChange={(e) => {
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    nagad: {
                                      ...paymentSettings.nagad,
                                      callback_url: e.target.value
                                    }
                                  })
                                  if (paymentErrors.nagad.callback_url) {
                                    setPaymentErrors({
                                      ...paymentErrors,
                                      nagad: { ...paymentErrors.nagad, callback_url: false }
                                    })
                                  }
                                }}
                                className={`bg-background ${paymentErrors.nagad.callback_url ? 'border-red-500' : ''}`}
                              />
                              {paymentErrors.nagad.callback_url && (
                                <p className="text-xs text-red-500">This field is required</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Merchant ID</Label>
                              <Input 
                                placeholder="Enter your merchant ID"
                                value={paymentSettings.nagad.merchant_id}
                                onChange={(e) => {
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    nagad: {
                                      ...paymentSettings.nagad,
                                      merchant_id: e.target.value
                                    }
                                  })
                                  if (paymentErrors.nagad.merchant_id) {
                                    setPaymentErrors({
                                      ...paymentErrors,
                                      nagad: { ...paymentErrors.nagad, merchant_id: false }
                                    })
                                  }
                                }}
                                className={`bg-background ${paymentErrors.nagad.merchant_id ? 'border-red-500' : ''}`}
                              />
                              {paymentErrors.nagad.merchant_id && (
                                <p className="text-xs text-red-500">This field is required</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Merchant Number</Label>
                              <Input 
                                placeholder="01XXXXXXXXX"
                                value={paymentSettings.nagad.merchant_number}
                                onChange={(e) => {
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    nagad: {
                                      ...paymentSettings.nagad,
                                      merchant_number: e.target.value
                                    }
                                  })
                                  if (paymentErrors.nagad.merchant_number) {
                                    setPaymentErrors({
                                      ...paymentErrors,
                                      nagad: { ...paymentErrors.nagad, merchant_number: false }
                                    })
                                  }
                                }}
                                className={`bg-background ${paymentErrors.nagad.merchant_number ? 'border-red-500' : ''}`}
                              />
                              {paymentErrors.nagad.merchant_number && (
                                <p className="text-xs text-red-500">This field is required</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Private Key</Label>
                              <Input 
                                type="password"
                                placeholder="••••••••••••••••"
                                value={paymentSettings.nagad.private_key}
                                onChange={(e) => {
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    nagad: {
                                      ...paymentSettings.nagad,
                                      private_key: e.target.value
                                    }
                                  })
                                  if (paymentErrors.nagad.private_key) {
                                    setPaymentErrors({
                                      ...paymentErrors,
                                      nagad: { ...paymentErrors.nagad, private_key: false }
                                    })
                                  }
                                }}
                                className={`bg-background ${paymentErrors.nagad.private_key ? 'border-red-500' : ''}`}
                              />
                              {paymentErrors.nagad.private_key && (
                                <p className="text-xs text-red-500">This field is required</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Public Key</Label>
                              <Input 
                                type="password"
                                placeholder="••••••••••••••••"
                                value={paymentSettings.nagad.public_key}
                                onChange={(e) => {
                                  setPaymentSettings({
                                    ...paymentSettings,
                                    nagad: {
                                      ...paymentSettings.nagad,
                                      public_key: e.target.value
                                    }
                                  })
                                  if (paymentErrors.nagad.public_key) {
                                    setPaymentErrors({
                                      ...paymentErrors,
                                      nagad: { ...paymentErrors.nagad, public_key: false }
                                    })
                                  }
                                }}
                                className={`bg-background ${paymentErrors.nagad.public_key ? 'border-red-500' : ''}`}
                              />
                              {paymentErrors.nagad.public_key && (
                                <p className="text-xs text-red-500">This field is required</p>
                              )}
                            </div>
                          </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Card Payment - Hidden for now */}
                    {false && (
                    <div className="space-y-4 p-4 border border-border/50 rounded-lg">
                      <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-blue-500/10 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Card Payment</p>
                          <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex</p>
                        </div>
                      </div>
                      <Switch 
                        checked={paymentSettings.payment_methods.card}
                        onCheckedChange={(checked) => 
                          setPaymentSettings({
                            ...paymentSettings,
                            payment_methods: {
                              ...paymentSettings.payment_methods,
                              card: checked
                            }
                          })
                        }
                      />
                    </div>
                      {paymentSettings.payment_methods.card && (
                        <div className="space-y-3 pt-3 border-t border-border/50">
                          <div className="space-y-2">
                            <Label>Card Merchant ID*</Label>
                            <Input 
                              placeholder="Card Merchant ID"
                              value={paymentSettings.card.merchant_id}
                              onChange={(e) => 
                                setPaymentSettings({
                                  ...paymentSettings,
                                  card: {
                                    ...paymentSettings.card,
                                    merchant_id: e.target.value
                                  }
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Card API Key*</Label>
                            <Input 
                              type="password"
                              placeholder="Card API Key"
                              value={paymentSettings.card.api_key}
                              onChange={(e) => 
                                setPaymentSettings({
                                  ...paymentSettings,
                                  card: {
                                    ...paymentSettings.card,
                                    api_key: e.target.value
                                  }
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Card Secret Key*</Label>
                            <Input 
                              type="password"
                              placeholder="Card Secret Key"
                              value={paymentSettings.card.secret_key}
                              onChange={(e) => 
                                setPaymentSettings({
                                  ...paymentSettings,
                                  card: {
                                    ...paymentSettings.card,
                                    secret_key: e.target.value
                                  }
                                })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                    <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-gray-500/10 flex items-center justify-center">
                          <span className="text-gray-600 font-bold text-sm">COD</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Cash on Delivery</p>
                          <p className="text-xs text-muted-foreground">Pay when you receive</p>
                        </div>
                      </div>
                      <Switch 
                        checked={paymentSettings.payment_methods.cod}
                        onCheckedChange={(checked) => 
                          setPaymentSettings({
                            ...paymentSettings,
                            payment_methods: {
                              ...paymentSettings.payment_methods,
                              cod: checked
                            }
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Payout Settings */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <h3 className="text-sm font-medium">Payout Settings</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Payout Method</Label>
                      <Select 
                        value={paymentSettings.payout_method}
                        onValueChange={(value) => 
                          setPaymentSettings({
                            ...paymentSettings,
                            payout_method: value
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bkash">bKash</SelectItem>
                          <SelectItem value="nagad">Nagad</SelectItem>
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input 
                        placeholder="01XXXXXXXXX" 
                        value={paymentSettings.payout_account_number}
                        onChange={(e) => 
                          setPaymentSettings({
                            ...paymentSettings,
                            payout_account_number: e.target.value
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Account Holder Name</Label>
                    <Input 
                      placeholder="Your full name" 
                      value={paymentSettings.payout_account_holder}
                      onChange={(e) => 
                        setPaymentSettings({
                          ...paymentSettings,
                          payout_account_holder: e.target.value
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-border/50">
                  <Button variant="outline" size="sm">Cancel</Button>
                  <Button size="sm" onClick={handleSavePayments} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Plan & Billing Tab */}
          {activeTab === "billing" && (
            <div className="rounded-lg border border-border/50 bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Plan & Billing</h2>
                <p className="text-sm text-muted-foreground">Manage your subscription plan and billing information</p>
              </div>

              <div className="space-y-6">
                {/* Current Plan */}
                <div className="rounded-xl border border-border/50 bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold">Current Plan</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {store.plan === 'free' && 'Free Plan - Perfect for getting started'}
                        {store.plan === 'paid' && 'Paid Plan - For growing businesses'}
                        {store.plan === 'pro' && 'Pro Plan - For established businesses'}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-medium ${
                      store.plan === 'free' ? 'bg-gray-100 text-gray-700' :
                      store.plan === 'paid' ? 'bg-orange-100 text-orange-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {store.plan === 'free' ? 'Free' : store.plan === 'paid' ? 'Paid' : 'Pro'}
                    </div>
                  </div>

                  {/* Plan Limits */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Traffic Limit</p>
                      <p className="text-lg font-semibold">
                        {store.plan === 'free' ? '2,000' : store.plan === 'paid' ? '50,000' : 'Unlimited'} visits/month
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Product Limit</p>
                      <p className="text-lg font-semibold">
                        {store.plan === 'free' ? '100' : store.plan === 'paid' ? '1,000' : '10,000'} products
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Order Limit</p>
                      <p className="text-lg font-semibold">
                        {store.plan === 'free' ? '500' : store.plan === 'paid' ? '5,000' : 'Unlimited'} orders
                      </p>
                    </div>
                  </div>

                  {/* Cancel Subscription and Renew Subscription Buttons */}
                  {store.plan !== 'free' && (
                    <div className="mt-6 pt-6 border-t border-border/50">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {/* Renew Subscription Button - Show when 7 days or less remaining */}
                        {(() => {
                          if (!store.subscription_expires_at) return null
                          
                          const expiresAt = new Date(store.subscription_expires_at)
                          const now = new Date()
                          // Reset time to start of day for accurate day calculation
                          const expiresDate = new Date(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate())
                          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                          const daysLeft = Math.ceil((expiresDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24))
                          
                          if (daysLeft <= 7 && daysLeft >= 0) {
                            return (
                              <Button
                                variant="default"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => setUpgradeDialogOpen(true)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Renew Subscription
                              </Button>
                            )
                          }
                          return null
                        })()}
                        
                        {/* Cancel Subscription Button */}
                        <Button
                          variant="outline"
                          className={`${(() => {
                            if (!store.subscription_expires_at) return "w-full"
                            
                            const expiresAt = new Date(store.subscription_expires_at)
                            const now = new Date()
                            const expiresDate = new Date(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate())
                            const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                            const daysLeft = Math.ceil((expiresDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24))
                            
                            return daysLeft <= 7 && daysLeft >= 0 ? "flex-1" : "w-full"
                          })()} border-red-300 hover:bg-red-50 hover:border-red-400 text-red-600`}
                          onClick={() => setCancelSubscriptionDialogOpen(true)}
                        >
                          Cancel Subscription
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Plan Features Comparison */}
                <div className="rounded-xl border border-border/50 bg-card p-6">
                  <h3 className="text-base font-semibold mb-4">Plan Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Paid Plan Features */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Crown className="h-5 w-5 text-orange-500" weight="fill" />
                        <h4 className="font-semibold text-orange-600">Paid Plan</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Up to 1,000 products</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">50,000 monthly visits</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Up to 5,000 orders</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Custom domain</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Advanced store customization</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Priority support</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-muted-foreground">Advanced analytics</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-muted-foreground">API access</span>
                        </div>
                      </div>
                    </div>

                    {/* Pro Plan Features */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Crown className="h-5 w-5 text-purple-500" weight="fill" />
                        <h4 className="font-semibold text-purple-600">Pro Plan</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Up to 10,000 products</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Unlimited monthly visits</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Unlimited orders</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Custom domain</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Advanced store customization</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Priority support</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Advanced analytics</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">API access</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upgrade Options */}
                {store.plan !== 'pro' && (
                  <div className="rounded-xl border border-border/50 bg-card p-6">
                    <h3 className="text-base font-semibold mb-4">Upgrade Plan</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Unlock more features and grow your business with a higher plan.
                    </p>
                    <div className="flex gap-3">
                      {store.plan === 'free' && (
                        <>
                          <Button 
                            variant="outline" 
                            className="flex-1 border-orange-300 hover:bg-orange-50"
                            onClick={() => setUpgradeDialogOpen(true)}
                          >
                            <Crown className="h-4 w-4 mr-2 text-orange-500" weight="fill" />
                            Upgrade to Paid
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1 border-purple-300 hover:bg-purple-50"
                            onClick={() => setUpgradeDialogOpen(true)}
                          >
                            <Crown className="h-4 w-4 mr-2 text-purple-500" weight="fill" />
                            Upgrade to Pro
                          </Button>
                        </>
                      )}
                      {store.plan === 'paid' && (
                        <Button 
                          variant="outline" 
                          className="flex-1 border-purple-300 hover:bg-purple-50"
                          onClick={() => setUpgradeDialogOpen(true)}
                        >
                          <Crown className="h-4 w-4 mr-2 text-purple-500" weight="fill" />
                          Upgrade to Pro
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Billing Information */}
                <div className="rounded-xl border border-border/50 bg-card p-6">
                  <h3 className="text-base font-semibold mb-4">Billing Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Billing Cycle</span>
                      <span className="text-sm font-medium">
                        {store.plan === 'free' ? 'Free Forever' : 'Monthly'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Next Billing Date</span>
                      <span className="text-sm font-medium">
                        {store.plan === 'free' ? 'N/A' : 
                         store.subscription_expires_at 
                           ? new Date(store.subscription_expires_at).toLocaleDateString('en-US', {
                               year: 'numeric',
                               month: 'short',
                               day: 'numeric'
                             })
                           : 'Not set'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">Payment Method</span>
                      <div className="flex items-center gap-1.5">
                        {store.plan === 'free' ? (
                          <span className="text-sm font-medium">N/A</span>
                        ) : (
                          <>
                            <img 
                              src="/bkash.svg" 
                              alt="bKash" 
                              className="h-5 w-5 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                            <span className="text-sm font-medium">bKash</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upgrade Requests */}
                {upgradeRequests.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-card p-6">
                    <h3 className="text-base font-semibold mb-4">Upgrade Requests</h3>
                    <div className="space-y-3">
                      {upgradeRequests.map((request) => {
                        const isCanceled = request.status === 'canceled'
                        const isUpgrade = !isCanceled
                        
                        return (
                          <div key={request.id} className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {isCanceled 
                                  ? `Canceled ${request.current_plan === 'paid' ? 'Paid' : 'Pro'} Plan Subscription`
                                  : `Upgrade to ${request.requested_plan === 'paid' ? 'Paid' : 'Pro'} Plan`
                                }
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {isCanceled ? 'Canceled' : 'Requested'} on {new Date(request.created_at).toLocaleDateString()}
                                {isUpgrade && request.transaction_id && request.transaction_id !== 'CANCELED' && ` • Transaction: ${request.transaction_id}`}
                              </p>
                            </div>
                            <div>
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                request.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                                request.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                request.status === 'canceled' ? 'bg-gray-500/10 text-gray-500' :
                                'bg-yellow-500/10 text-yellow-500'
                              }`}>
                                {request.status === 'approved' ? 'Approved' :
                                 request.status === 'rejected' ? 'Rejected' :
                                 request.status === 'canceled' ? 'Canceled' :
                                 'Pending'}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Billing History */}
                <div className="rounded-xl border border-border/50 bg-card p-6">
                  <h3 className="text-base font-semibold mb-4">Billing History</h3>
                  {store.plan === 'free' ? (
                    <p className="text-sm text-muted-foreground">No billing history available for free plans.</p>
                  ) : upgradeRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No invoices found.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Billing history will appear here after successful upgrades.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="rounded-lg border border-border/50 bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Security Settings</h2>
                <p className="text-sm text-muted-foreground">Manage your account security</p>
              </div>

              <div className="space-y-6">
                {/* Login Alerts */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Login Alerts</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Email me when a new device logs in</p>
                      <p className="text-xs text-muted-foreground">Get notified of any suspicious login activity</p>
                    </div>
                    <Switch 
                      checked={security.login_alerts}
                      onCheckedChange={(v) => setSecurity({ ...security, login_alerts: v })}
                    />
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <h3 className="text-sm font-medium">Active Sessions</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Globe className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Current Session</p>
                          <p className="text-xs text-muted-foreground">
                            {typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').slice(-2).join(' ') : 'Browser'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 bg-green-500/10 px-2 py-1 rounded">Active</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={handleSignOutAllSessions}
                    disabled={isSigningOut}
                  >
                    {isSigningOut ? "Signing out..." : "Sign out all other sessions"}
                  </Button>
                </div>

                {/* Danger Zone */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
                  <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                    <div>
                      <p className="text-sm font-medium">Delete Account</p>
                      <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Account Confirmation Dialog */}
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">Delete Account</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    This action cannot be undone. This will permanently delete your account and remove all your data including:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Your store and all products</li>
                    <li>All orders and customer data</li>
                    <li>All categories and variants</li>
                    <li>Your custom domain configuration</li>
                    <li>All uploaded images and files</li>
                  </ul>
                  <div className="pt-2">
                    <Label htmlFor="delete-confirm" className="text-sm font-medium">
                      Type <span className="font-bold text-destructive">DELETE</span> to confirm
                    </Label>
                    <Input
                      id="delete-confirm"
                      className="mt-2"
                      placeholder="Type DELETE"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Upgrade Dialog */}
      {storeId && (
        <UpgradeDialog
          open={upgradeDialogOpen}
          onOpenChange={(open) => {
            setUpgradeDialogOpen(open)
            if (!open && activeTab === 'billing') {
              // Refresh upgrade requests when dialog closes
              fetchUpgradeRequests()
            }
          }}
          currentPlan={store.plan as 'free' | 'paid' | 'pro'}
          storeId={storeId}
        />
      )}

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelSubscriptionDialogOpen} onOpenChange={setCancelSubscriptionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your {store.plan === 'paid' ? 'Paid' : 'Pro'} subscription? 
              You will be moved to the Free plan immediately and will lose access to premium features.
              <br /><br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? "Canceling..." : "Yes, Cancel Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

