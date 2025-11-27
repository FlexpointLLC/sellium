"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Shield, Users, UserCircle, Briefcase, Bicycle, CurrencyDollar, CreditCard, Crown, CrownSimple } from "phosphor-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Stats {
  totalUsers: number
  totalAgents: number
  totalOwners: number
  totalRiders: number
}

interface SubscriptionStats {
  totalEarnings: number
  totalSubscribed: number
  totalFree: number
  totalPro: number
}

interface TopRevenueOwner {
  user_id: string
  name: string | null
  email: string | null
  store_name: string
  total_revenue: number
}

interface TopProductOwner {
  user_id: string
  name: string | null
  email: string | null
  store_name: string
  total_products: number
}

export default function SuperAdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalAgents: 0,
    totalOwners: 0,
    totalRiders: 0,
  })
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats>({
    totalEarnings: 0,
    totalSubscribed: 0,
    totalFree: 0,
    totalPro: 0,
  })
  const [topRevenueOwners, setTopRevenueOwners] = useState<TopRevenueOwner[]>([])
  const [topProductOwners, setTopProductOwners] = useState<TopProductOwner[]>([])

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
      fetchData()
    }

    checkAccess()
  }, [supabase, router])

  async function fetchData() {
    // Fetch user counts by role
    const [allUsers, agents, owners, riders] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "agent"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "rider"),
    ])

    setStats({
      totalUsers: allUsers.count || 0,
      totalAgents: agents.count || 0,
      totalOwners: owners.count || 0,
      totalRiders: riders.count || 0,
    })

    // Fetch subscription stats
    // Calculate earnings from approved upgrade requests
    const { data: approvedRequests } = await supabase
      .from("upgrade_requests")
      .select("requested_plan")
      .eq("status", "approved")

    let totalEarnings = 0
    if (approvedRequests) {
      approvedRequests.forEach((request) => {
        if (request.requested_plan === "paid") {
          totalEarnings += 500 // 500 BDT for paid plan
        } else if (request.requested_plan === "pro") {
          totalEarnings += 1500 // 1500 BDT for pro plan
        }
      })
    }

    // Count stores by plan
    const [freeStores, paidStores, proStores] = await Promise.all([
      supabase.from("stores").select("id", { count: "exact", head: true }).eq("plan", "free"),
      supabase.from("stores").select("id", { count: "exact", head: true }).eq("plan", "paid"),
      supabase.from("stores").select("id", { count: "exact", head: true }).eq("plan", "pro"),
    ])

    const totalFree = freeStores.count || 0
    const totalPaid = paidStores.count || 0
    const totalPro = proStores.count || 0
    const totalSubscribed = totalPaid + totalPro

    setSubscriptionStats({
      totalEarnings,
      totalSubscribed,
      totalFree,
      totalPro,
    })

    // Fetch all stores
    const { data: stores } = await supabase
      .from("stores")
      .select("id, user_id, name")

    if (stores && stores.length > 0) {
      // Fetch profiles for all store owners
      const userIds = stores.map(s => s.user_id)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds)

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

      // Calculate revenue for each store
      const revenuePromises = stores.map(async (store) => {
        const profile = profileMap.get(store.user_id)
        
        const { data: paidOrders } = await supabase
          .from("orders")
          .select("total")
          .eq("store_id", store.id)
          .eq("payment_status", "paid")

        const totalRevenue = paidOrders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0

        return {
          user_id: store.user_id,
          name: profile?.name || null,
          email: profile?.email || null,
          store_name: store.name,
          total_revenue: totalRevenue,
        }
      })

      const revenueData = await Promise.all(revenuePromises)
      const topRevenue = revenueData
        .filter(item => item.total_revenue > 0) // Only show owners with revenue
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10)

      setTopRevenueOwners(topRevenue)

      // Fetch top 10 product owners
      const productPromises = stores.map(async (store) => {
        const profile = profileMap.get(store.user_id)
        
        const { count } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("store_id", store.id)

        return {
          user_id: store.user_id,
          name: profile?.name || null,
          email: profile?.email || null,
          store_name: store.name,
          total_products: count || 0,
        }
      })

      const productData = await Promise.all(productPromises)
      const topProducts = productData
        .filter(item => item.total_products > 0) // Only show owners with products
        .sort((a, b) => b.total_products - a.total_products)
        .slice(0, 10)

      setTopProductOwners(topProducts)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl flex flex-col gap-6">
        <div className="animate-pulse">
          <div className="h-7 w-32 bg-muted rounded mb-2" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-96 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-normal flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Super Admin
          </h1>
          <p className="text-sm font-normal text-muted-foreground">
            Manage system-wide settings and configurations
          </p>
        </div>
      </div>

      {/* Subscription Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription Earnings</CardTitle>
            <CurrencyDollar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{subscriptionStats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total from Sellium subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribed Users</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptionStats.totalSubscribed}</div>
            <p className="text-xs text-muted-foreground">
              Paid + Pro plan users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Users</CardTitle>
            <CrownSimple className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptionStats.totalFree}</div>
            <p className="text-xs text-muted-foreground">
              Free plan users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Users</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptionStats.totalPro}</div>
            <p className="text-xs text-muted-foreground">
              Pro plan subscribers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Role Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              All users in Sellium
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAgents}</div>
            <p className="text-xs text-muted-foreground">
              Active agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Owners</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOwners}</div>
            <p className="text-xs text-muted-foreground">
              Store owners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Riders</CardTitle>
            <Bicycle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRiders}</div>
            <p className="text-xs text-muted-foreground">
              Delivery riders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Owners Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top 10 Most Revenue Owners</CardTitle>
          </CardHeader>
          <CardContent>
            {topRevenueOwners.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No revenue data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topRevenueOwners.map((owner, index) => (
                  <div key={owner.user_id} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-4">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{owner.name || owner.email || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{owner.store_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">${owner.total_revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top 10 Most Product Owners</CardTitle>
          </CardHeader>
          <CardContent>
            {topProductOwners.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No product data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topProductOwners.map((owner, index) => (
                  <div key={owner.user_id} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-4">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{owner.name || owner.email || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{owner.store_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{owner.total_products}</span>
                      <span className="text-xs text-muted-foreground ml-1">products</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

