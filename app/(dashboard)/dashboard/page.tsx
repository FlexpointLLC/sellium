"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, CurrencyDollar, Users, CheckCircle, ArrowSquareOut, Circle } from "phosphor-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface Store {
  id: string
  username: string
  name: string
  status: string
  plan: string
  business_type: string
}

interface Stats {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  totalCustomers: number
}

const planLimits: Record<string, { traffic: string; products: number }> = {
  free: { traffic: "500", products: 10 },
  starter: { traffic: "5k", products: 100 },
  pro: { traffic: "50k", products: 1000 },
  enterprise: { traffic: "Unlimited", products: 10000 },
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [store, setStore] = useState<Store | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/login")
        return
      }

      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single()

      if (!profile?.onboarding_completed) {
        // User hasn't completed onboarding, redirect
        router.push("/onboarding")
        return
      }

      // Fetch store data
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (storeError || !storeData) {
        // No store found, redirect to onboarding
        router.push("/onboarding")
        return
      }

      setStore(storeData)

      // Fetch stats
      const [productsResult, ordersResult, customersResult] = await Promise.all([
        supabase.from("products").select("id", { count: "exact" }).eq("store_id", storeData.id),
        supabase.from("orders").select("id, total", { count: "exact" }).eq("store_id", storeData.id),
        supabase.from("customers").select("id", { count: "exact" }).eq("store_id", storeData.id),
      ])

      const totalRevenue = ordersResult.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0

      setStats({
        totalRevenue,
        totalOrders: ordersResult.count || 0,
        totalProducts: productsResult.count || 0,
        totalCustomers: customersResult.count || 0,
      })

      setLoading(false)
    }

    fetchData()
  }, [supabase, router])

  if (loading || !store) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-7 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="h-32 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const storefrontUrl = `/${store.username}`
  const planInfo = planLimits[store.plan] || planLimits.free
  const statusColor = store.status === "active" ? "text-green-600 bg-green-500/10" : "text-yellow-600 bg-yellow-500/10"

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-normal">Dashboard</h1>
          <p className="text-sm font-normal text-muted-foreground">
            Welcome back! Here&apos;s an overview of your store.
          </p>
        </div>
        <Link
          href={storefrontUrl}
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Visit Site
          <ArrowSquareOut className="h-4 w-4" />
        </Link>
      </div>

      {/* Store Overview Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Store Preview Thumbnail */}
            <div className="w-full md:w-48 h-32 md:h-auto rounded-lg overflow-hidden border bg-muted flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center text-muted-foreground text-xs">
                Store Preview
              </div>
            </div>

            {/* Store Info */}
            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">{store.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Site Status:</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                    {store.status === "active" ? (
                      <CheckCircle className="h-3 w-3" weight="fill" />
                    ) : (
                      <Circle className="h-3 w-3" weight="fill" />
                    )}
                    {store.status === "active" ? "LIVE" : store.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="flex flex-wrap items-center gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Current Plan:</span>
                  <span className="font-medium text-primary capitalize">{store.plan} Plan</span>
                </div>
                <div className="w-px h-4 bg-border mx-4" />
                <div className="flex items-center gap-2">
                  <Link 
                    href={storefrontUrl} 
                    target="_blank"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    sellium.store/{store.username}
                  </Link>
                  <ArrowSquareOut className="h-3.5 w-3.5 text-muted-foreground" />
                  <Link href="/dashboard/settings/domain" className="text-primary hover:underline">
                    Manage Domain
                  </Link>
                </div>
                <div className="w-px h-4 bg-border mx-4" />
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Traffic Limit:</span>
                  <span className="font-medium">{planInfo.traffic}</span>
                </div>
                <div className="w-px h-4 bg-border mx-4" />
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Products</span>
                  <span className="font-medium">{stats.totalProducts}/{planInfo.products}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CurrencyDollar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              +0% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              +0% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalProducts} active products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              +0 new this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              {stats.totalOrders === 0 ? "You have no orders yet." : `You have ${stats.totalOrders} orders.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No orders to display
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>
              Your best selling products.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No products yet
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
