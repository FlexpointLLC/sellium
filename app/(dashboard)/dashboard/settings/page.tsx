"use client"
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Gear, User, Bell, Shield, CreditCard, Storefront, Upload, Image as ImageIcon, Globe, Clock, MapPin, X, Plus, Trash, Link as LinkIcon, CheckCircle, XCircle, ArrowsClockwise, Copy, Check } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

type TabType = "store" | "profile" | "domain" | "notifications" | "payments" | "security"

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
  const validTabs: TabType[] = ["store", "profile", "domain", "notifications", "payments", "security"]
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : "store"
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  
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
    two_factor_enabled: false,
    login_alerts: true
  })

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

  async function handleChangePassword() {
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings`
    })

    if (error) {
      toast.error("Failed to send password reset email")
    } else {
      toast.success("Password reset email sent!")
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
    { id: "profile" as TabType, label: "Profile", icon: User },
    { id: "domain" as TabType, label: "Custom Domain", icon: LinkIcon },
    { id: "notifications" as TabType, label: "Notifications", icon: Bell },
    { id: "payments" as TabType, label: "Payments", icon: CreditCard },
    { id: "security" as TabType, label: "Security", icon: Shield },
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
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-muted"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Store Tab */}
          {activeTab === "store" && (
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Store Settings</h2>
                <p className="text-sm text-muted-foreground">Customize your store appearance and information</p>
              </div>

              <div className="space-y-6">
                {/* Store Logo & Favicon */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Store Logo */}
                  <div className="space-y-2">
                    <Label>Store Logo</Label>
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-lg bg-muted overflow-hidden border group">
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
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-lg bg-muted overflow-hidden border group">
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

                {/* Store Banners (Multiple) */}
                <div className="space-y-2">
                  <Label>Store Banners</Label>
                  <p className="text-sm text-muted-foreground">
                    Upload multiple banners for your storefront slider. Recommended: 1920x600px
                  </p>
                  
                  {/* Banner Grid */}
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {store.banner_images.map((banner, index) => (
                      <div key={index} className="relative group aspect-[16/5] rounded-lg overflow-hidden border bg-muted">
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

                {/* Basic Info */}
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

                {/* SEO Meta Tags */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-3">SEO Settings</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Customize how your store appears in search engines and browser tabs
                    </p>
                  </div>
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

                {/* Theme Color */}
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

                {/* Currency & Timezone */}
                <div className="grid gap-4 md:grid-cols-2">
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

                {/* Social Links */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Social Links & Contact</Label>
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
                <div className="space-y-4">
                  <Label className="text-base font-medium">Store Address</Label>
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

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button variant="outline" size="sm">Cancel</Button>
                  <Button size="sm" onClick={handleSaveStore} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Profile Settings</h2>
                <p className="text-sm text-muted-foreground">Update your personal information</p>
              </div>

              <div className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted overflow-hidden border">
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

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button variant="outline" size="sm">Cancel</Button>
                  <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Custom Domain Tab */}
          {activeTab === "domain" && (
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Custom Domain</h2>
                <p className="text-sm text-muted-foreground">Connect your own domain to your store using Vercel DNS</p>
              </div>

              <div className="space-y-6">
                {/* Current Domain Status */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Default Domain</h3>
                  <div className="p-4 border rounded-lg bg-muted/50">
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
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium">Custom Domain</h3>
                  <p className="text-sm text-muted-foreground">
                    Use your own domain (e.g., shop.yourbrand.com) instead of the default Sellium subdomain.
                  </p>
                  
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
                      <div className="p-4 border rounded-lg">
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
                </div>

                {/* Help Section */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium">DNS Configuration Help</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm font-medium mb-1">Popular DNS Providers</p>
                      <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                        <li>• Cloudflare - DNS settings → Add record</li>
                        <li>• GoDaddy - DNS Management → Add</li>
                        <li>• Namecheap - Advanced DNS → Add record</li>
                        <li>• Google Domains - DNS → Custom records</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
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
            <div className="rounded-lg border bg-card p-6">
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
                <div className="space-y-4 pt-4 border-t">
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

                <div className="flex justify-end gap-4 pt-4 border-t">
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
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Payment Settings</h2>
                <p className="text-sm text-muted-foreground">Manage your payment methods and payout settings</p>
              </div>

              <div className="space-y-6">
                {/* Payment Methods */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Accepted Payment Methods</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-green-500/10 flex items-center justify-center">
                          <span className="text-green-600 font-bold text-sm">bK</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">bKash</p>
                          <p className="text-xs text-muted-foreground">Mobile banking payment</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-orange-500/10 flex items-center justify-center">
                          <span className="text-orange-600 font-bold text-sm">Ng</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Nagad</p>
                          <p className="text-xs text-muted-foreground">Mobile banking payment</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-blue-500/10 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Card Payment</p>
                          <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex</p>
                        </div>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-gray-500/10 flex items-center justify-center">
                          <span className="text-gray-600 font-bold text-sm">COD</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Cash on Delivery</p>
                          <p className="text-xs text-muted-foreground">Pay when you receive</p>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Payout Settings */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium">Payout Settings</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Payout Method</Label>
                      <Select defaultValue="bkash">
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
                      <Input placeholder="01XXXXXXXXX" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Account Holder Name</Label>
                    <Input placeholder="Your full name" />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button variant="outline" size="sm">Cancel</Button>
                  <Button size="sm" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Security Settings</h2>
                <p className="text-sm text-muted-foreground">Manage your account security</p>
              </div>

              <div className="space-y-6">
                {/* Password */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Password</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Change Password</p>
                      <p className="text-xs text-muted-foreground">Update your password regularly for security</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleChangePassword}>
                      Change Password
                    </Button>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Enable 2FA</p>
                      <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                    <Switch 
                      checked={security.two_factor_enabled}
                      onCheckedChange={(v) => setSecurity({ ...security, two_factor_enabled: v })}
                    />
                  </div>
                </div>

                {/* Login Alerts */}
                <div className="space-y-4 pt-4 border-t">
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
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium">Active Sessions</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Globe className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Current Session</p>
                          <p className="text-xs text-muted-foreground">Chrome on macOS • Dhaka, Bangladesh</p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 bg-green-500/10 px-2 py-1 rounded">Active</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    Sign out all other sessions
                  </Button>
                </div>

                {/* Danger Zone */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
                  <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                    <div>
                      <p className="text-sm font-medium">Delete Account</p>
                      <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                    </div>
                    <Button variant="destructive" size="sm">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
