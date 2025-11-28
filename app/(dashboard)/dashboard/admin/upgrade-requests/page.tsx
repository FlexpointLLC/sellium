"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowCircleUp, MagnifyingGlass, CheckCircle, XCircle, Clock, Crown } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface UpgradeRequest {
  id: string
  store_id: string
  current_plan: string
  requested_plan: string
  transaction_id: string
  billing_period: string | null
  status: string
  created_at: string
  store: {
    id: string
    name: string
    username: string
    plan: string
  } | null
  user: {
    id: string
    name: string | null
    email: string | null
  } | null
}

function AdminUpgradeRequestsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [requests, setRequests] = useState<UpgradeRequest[]>([])
  const [expiredSubscriptions, setExpiredSubscriptions] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"request" | "expiry">("request")
  const [renewDialogOpen, setRenewDialogOpen] = useState(false)
  const [selectedStoreForRenewal, setSelectedStoreForRenewal] = useState<{
    storeId: string
    currentPlan: string
    billingPeriod: string
  } | null>(null)
  const [renewalPlan, setRenewalPlan] = useState<"paid" | "pro">("paid")
  const [renewalBillingPeriod, setRenewalBillingPeriod] = useState<"monthly" | "yearly">("monthly")

  // Set active tab from URL query parameter
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'expiry') {
      setActiveTab('expiry')
    } else {
      setActiveTab('request')
    }
  }, [searchParams])

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push("/dashboard")
        return
      }

      setUserRole(profile.role)
      fetchRequests()
      fetchExpiredSubscriptions()
    }

    checkAccess()
  }, [supabase, router])

  async function fetchRequests() {
    // Fetch only pending upgrade requests
    const { data: upgradeRequests, error } = await supabase
      .from("upgrade_requests")
      .select(`
        id,
        store_id,
        current_plan,
        requested_plan,
        transaction_id,
        billing_period,
        status,
        created_at
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching upgrade requests:", error)
      toast.error("Failed to load upgrade requests")
      setLoading(false)
      return
    }

    // Fetch store and user info for each request
    const requestsWithDetails = await Promise.all(
      (upgradeRequests || []).map(async (request) => {
        // Fetch store with user_id
        const { data: store } = await supabase
          .from("stores")
          .select("id, name, username, plan, user_id")
          .eq("id", request.store_id)
          .single()

        // Fetch user profile
        let user = null
        if (store?.user_id) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("id, name, email")
            .eq("id", store.user_id)
            .single()

          user = userProfile
        }

        return {
          ...request,
          store: store ? { id: store.id, name: store.name, username: store.username, plan: store.plan } : null,
          user: user || null
        }
      })
    )

    setRequests(requestsWithDetails)
    setLoading(false)
  }

  async function fetchExpiredSubscriptions() {
    const now = new Date().toISOString()

    // Fetch stores with expired subscriptions
    const { data: expiredStores, error } = await supabase
      .from("stores")
      .select("id, name, username, plan, subscription_expires_at, user_id")
      .in("plan", ["paid", "pro"])
      .not("subscription_expires_at", "is", null)
      .lte("subscription_expires_at", now)
      .order("subscription_expires_at", { ascending: false })

    if (error) {
      console.error("Error fetching expired subscriptions:", error)
      return
    }

    // Fetch user info for each expired store
    const expiredWithDetails = await Promise.all(
      (expiredStores || []).map(async (store) => {
        let user = null
        if (store.user_id) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("id, name, email")
            .eq("id", store.user_id)
            .single()

          user = userProfile
        }

        // Get billing period from the last approved upgrade request
        const { data: lastRequest } = await supabase
          .from("upgrade_requests")
          .select("billing_period")
          .eq("store_id", store.id)
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        return {
          store_id: store.id,
          store_name: store.name,
          store_username: store.username,
          current_plan: store.plan,
          subscription_expires_at: store.subscription_expires_at,
          billing_period: lastRequest?.billing_period || 'monthly',
          user: user || null
        }
      })
    )

    setExpiredSubscriptions(expiredWithDetails)
  }

  const filteredRequests = requests.filter(request =>
    (request.user?.name && request.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (request.user?.email && request.user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (request.store?.name && request.store.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    request.transaction_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  function calculateAmount(requestedPlan: string, billingPeriod: string | null): number {
    const period = billingPeriod || 'monthly'
    if (requestedPlan === 'paid') {
      return period === 'monthly' ? 500 : 5000
    } else {
      return period === 'monthly' ? 1500 : 15000
    }
  }

  async function handleCancelExpiredSubscription(storeId: string) {
    try {
      const freeLimits = { traffic: 2000, products: 100 }

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
        toast.error("Failed to cancel subscription")
        return
      }

      toast.success("Subscription canceled successfully")
      fetchExpiredSubscriptions()
    } catch (err) {
      console.error("Cancel subscription error:", err)
      toast.error("Something went wrong")
    }
  }

  function openRenewDialog(storeId: string, currentPlan: string, billingPeriod: string) {
    setSelectedStoreForRenewal({ storeId, currentPlan, billingPeriod })
    setRenewalPlan(currentPlan as "paid" | "pro")
    setRenewalBillingPeriod(billingPeriod as "monthly" | "yearly")
    setRenewDialogOpen(true)
  }

  async function handleRenewSubscription() {
    if (!selectedStoreForRenewal) return

    try {
      // Calculate new expiration date
      const expiresAt = new Date()
      if (renewalBillingPeriod === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      }

      // Define plan limits
      const planLimits: Record<string, { traffic: number; products: number }> = {
        paid: { traffic: 50000, products: 1000 },
        pro: { traffic: 999999999, products: 10000 }
      }

      const limits = planLimits[renewalPlan] || planLimits.paid

      const { error } = await supabase
        .from("stores")
        .update({
          plan: renewalPlan,
          subscription_expires_at: expiresAt.toISOString(),
          traffic_limit: limits.traffic,
          product_limit: limits.products,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedStoreForRenewal.storeId)

      if (error) {
        toast.error("Failed to renew subscription")
        return
      }

      toast.success("Subscription renewed successfully")
      setRenewDialogOpen(false)
      setSelectedStoreForRenewal(null)
      fetchExpiredSubscriptions()
    } catch (err) {
      console.error("Renew subscription error:", err)
      toast.error("Something went wrong")
    }
  }

  function calculateRenewalAmount(plan: string, billingPeriod: string): number {
    if (plan === 'paid') {
      return billingPeriod === 'monthly' ? 500 : 5000
    } else {
      return billingPeriod === 'monthly' ? 1500 : 15000
    }
  }

  async function handleStatusChange(requestId: string, newStatus: string, storeId: string, requestedPlan: string) {
    try {
      // Update request status
      const { error: requestError } = await supabase
        .from("upgrade_requests")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id || null
        })
        .eq("id", requestId)

      if (requestError) {
        toast.error("Failed to update request status")
        return
      }

      // If approved, update store plan and limits
      if (newStatus === 'approved') {
        // Get the upgrade request to check billing period
        const { data: upgradeRequest } = await supabase
          .from("upgrade_requests")
          .select("billing_period")
          .eq("id", requestId)
          .single()

        // Calculate subscription expiration date based on billing period
        const billingPeriod = upgradeRequest?.billing_period || 'monthly'
        const expiresAt = new Date()
        if (billingPeriod === 'monthly') {
          expiresAt.setMonth(expiresAt.getMonth() + 1)
        } else {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        }

        // Define plan limits
        const planLimits: Record<string, { traffic: number; products: number }> = {
          free: { traffic: 2000, products: 100 },
          paid: { traffic: 50000, products: 1000 },
          pro: { traffic: 999999999, products: 10000 } // Very high number for "unlimited"
        }

        const limits = planLimits[requestedPlan] || planLimits.free

        const { error: storeError } = await supabase
          .from("stores")
          .update({
            plan: requestedPlan,
            traffic_limit: limits.traffic,
            product_limit: limits.products,
            subscription_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", storeId)

        if (storeError) {
          toast.error("Failed to update store plan")
          return
        }

        toast.success("Request approved and store plan updated")
      } else {
        toast.success("Request rejected")
      }

      // Refresh requests (pending requests will be filtered out)
      fetchRequests()
      fetchExpiredSubscriptions()
    } catch (err) {
      console.error("Status change error:", err)
      toast.error("Something went wrong")
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl flex flex-col gap-6">
        <div className="animate-pulse">
          <div className="h-7 w-32 bg-muted rounded mb-2" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-normal flex items-center gap-2">
            <ArrowCircleUp className="h-5 w-5" />
            Upgrade Requests
          </h1>
          <p className="text-sm font-normal text-muted-foreground">
            Review and manage upgrade requests from store owners
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/50">
        <button
          onClick={() => {
            setActiveTab("request")
            router.push("/dashboard/admin/upgrade-requests", { scroll: false })
          }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "request"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Request
        </button>
        <button
          onClick={() => {
            setActiveTab("expiry")
            router.push("/dashboard/admin/upgrade-requests?tab=expiry", { scroll: false })
          }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "expiry"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Expiry
        </button>
      </div>

      {activeTab === "request" && (
        <>
          {requests.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{requests.length}</span> pending upgrade request{requests.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by store, user, or transaction ID..." 
                className="pl-9" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {activeTab === "expiry" && (
        <>
          {expiredSubscriptions.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{expiredSubscriptions.length}</span> expired subscription{expiredSubscriptions.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by store or owner name..." 
                className="pl-9" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      <div className="rounded-xl border border-border/50 bg-card overflow-x-scroll scrollbar-visible pb-1">
        {activeTab === "request" ? (
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Store</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Owner</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Current Plan</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Requested Plan</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Billing Period</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Transaction ID</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Requested</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ArrowCircleUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        {searchQuery ? "No requests found matching your search." : "No pending upgrade requests."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const amount = calculateAmount(request.requested_plan, request.billing_period)
                  const billingPeriod = request.billing_period || 'monthly'
                  return (
                    <tr key={request.id} className="border-b border-border/50 last:border-0">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{request.store?.name || "Unknown Store"}</span>
                          <span className="text-xs text-muted-foreground">{request.store?.username || ""}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{request.user?.name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">{request.user?.email || ""}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          request.current_plan === 'pro' ? 'bg-purple-500/10 text-purple-500' :
                          request.current_plan === 'paid' ? 'bg-orange-500/10 text-orange-500' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                          {request.current_plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          request.requested_plan === 'pro' ? 'bg-purple-500/10 text-purple-500' :
                          'bg-orange-500/10 text-orange-500'
                        }`}>
                          {request.requested_plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${
                          billingPeriod === 'yearly' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                          {billingPeriod}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold">{amount.toLocaleString()} BDT</span>
                          <span className="text-xs text-muted-foreground">
                            {billingPeriod === 'monthly' ? 'per month' : 'per year'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs">{request.transaction_id}</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{formatDate(request.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            onClick={() => handleStatusChange(request.id, 'approved', request.store_id, request.requested_plan)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                            onClick={() => handleStatusChange(request.id, 'rejected', request.store_id, request.requested_plan)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Store</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Current Plan</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Billing Period</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Expired Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filtered = expiredSubscriptions.filter(sub => 
                  (sub.store_name && sub.store_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (sub.user?.name && sub.user.name.toLowerCase().includes(searchQuery.toLowerCase()))
                )

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                          <p className="text-muted-foreground">
                            {searchQuery ? "No expired subscriptions found matching your search." : "No expired subscriptions."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return filtered.map((sub) => (
                  <tr key={sub.store_id} className="border-b border-border/50 last:border-0">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{sub.store_name || "Unknown Store"}</span>
                        <span className="text-xs text-muted-foreground">{sub.store_username || ""}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{sub.user?.name || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">{sub.user?.email || ""}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        sub.current_plan === 'pro' ? 'bg-purple-500/10 text-purple-500' :
                        'bg-orange-500/10 text-orange-500'
                      }`}>
                        {sub.current_plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${
                        sub.billing_period === 'yearly' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-gray-500/10 text-gray-500'
                      }`}>
                        {sub.billing_period}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {new Date(sub.subscription_expires_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                          onClick={() => handleCancelExpiredSubscription(sub.store_id)}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Cancel Subscription
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                          onClick={() => openRenewDialog(sub.store_id, sub.current_plan, sub.billing_period)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Renew Subscription
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              })()}
            </tbody>
          </table>
        )}
      </div>

      {/* Renew Subscription Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renew Subscription</DialogTitle>
            <DialogDescription>
              Select the plan and billing period for renewal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Plan Selection */}
            <div className="space-y-2">
              <Label>Select Plan</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRenewalPlan("paid")}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    renewalPlan === "paid"
                      ? "border-orange-600 bg-orange-50 dark:bg-orange-950/20"
                      : "border-border hover:border-orange-300"
                  }`}
                >
                  {renewalPlan === "paid" && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-white" weight="bold" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-orange-600" weight="fill" />
                    <span className="font-semibold text-sm">Paid Plan</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    1,000 products, 50k traffic, 5k orders
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRenewalPlan("pro")}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    renewalPlan === "pro"
                      ? "border-purple-600 bg-purple-50 dark:bg-purple-950/20"
                      : "border-border hover:border-purple-300"
                  }`}
                >
                  {renewalPlan === "pro" && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-white" weight="bold" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-purple-600" weight="fill" />
                    <span className="font-semibold text-sm">Pro Plan</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    10k products, Unlimited traffic & orders
                  </p>
                </button>
              </div>
            </div>

            {/* Billing Period Selection */}
            <div className="space-y-2">
              <Label>Billing Period</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRenewalBillingPeriod("monthly")}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    renewalBillingPeriod === "monthly"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold">Monthly</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {calculateRenewalAmount(renewalPlan, "monthly").toLocaleString()} BDT/month
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRenewalBillingPeriod("yearly")}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    renewalBillingPeriod === "yearly"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold">Yearly</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {calculateRenewalAmount(renewalPlan, "yearly").toLocaleString()} BDT/year
                  </div>
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-border/50 bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-lg font-bold">
                  {calculateRenewalAmount(renewalPlan, renewalBillingPeriod).toLocaleString()} BDT
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {renewalBillingPeriod === "monthly" ? "Billed monthly" : "Billed yearly (save 2 months)"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenewDialogOpen(false)
                setSelectedStoreForRenewal(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenewSubscription}
              className={`${
                renewalPlan === "paid"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-purple-600 hover:bg-purple-700"
              } text-white`}
            >
              Renew Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminUpgradeRequestsPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-6xl flex flex-col gap-6">
        <div className="animate-pulse">
          <div className="h-7 w-32 bg-muted rounded mb-2" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    }>
      <AdminUpgradeRequestsPageContent />
    </Suspense>
  )
}
