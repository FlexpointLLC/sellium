"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowCircleUp, MagnifyingGlass, CheckCircle, XCircle } from "phosphor-react"
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
import { toast } from "sonner"

interface UpgradeRequest {
  id: string
  store_id: string
  current_plan: string
  requested_plan: string
  transaction_id: string
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

export default function AdminUpgradeRequestsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [requests, setRequests] = useState<UpgradeRequest[]>([])
  const [searchQuery, setSearchQuery] = useState("")

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

      {requests.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{requests.length}</span> pending upgrade request{requests.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div className="flex items-center gap-4">
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

      <div className="rounded-xl border border-border/50 bg-card overflow-x-scroll scrollbar-visible pb-1">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Store</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Owner</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Current Plan</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Requested Plan</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Transaction ID</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Requested</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ArrowCircleUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No requests found matching your search." : "No pending upgrade requests."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRequests.map((request) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
