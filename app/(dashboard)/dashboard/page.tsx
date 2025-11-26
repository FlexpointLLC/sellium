"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, CurrencyDollar, Users, CheckCircle, ArrowSquareOut, Circle, ShoppingBag } from "phosphor-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"

interface Store {
  id: string
  username: string
  name: string
  status: string
  plan: string
  business_type: string
  currency?: string
}

interface Stats {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  totalCustomers: number
}

interface RecentOrder {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  total_amount: number
  status: string
  created_at: string
  order_items?: { product_name: string; price: number; image_url: string | null }[]
}

interface TopProduct {
  id: string
  name: string
  image_url: string | null
  price: number
  total_sold: number
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
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [customDomain, setCustomDomain] = useState<{ domain: string; status: string } | null>(null)

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

      // Fetch custom domain
      const { data: domainData } = await supabase
        .from("custom_domains")
        .select("domain, status")
        .eq("store_id", storeData.id)
        .single()

      if (domainData) {
        setCustomDomain(domainData)
      }

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

      // Fetch recent orders (last 5)
      const { data: recentOrdersData } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_email, total, status, created_at")
        .eq("store_id", storeData.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (recentOrdersData && recentOrdersData.length > 0) {
        // Fetch order items for these orders to get product names, prices and images
        const orderIds = recentOrdersData.map(o => o.id)
        const { data: orderItemsData } = await supabase
          .from("order_items")
          .select("order_id, product_name, price, image_url")
          .in("order_id", orderIds)

        // Map order items to orders
        const ordersWithItems = recentOrdersData.map(order => ({
          ...order,
          total_amount: order.total, // Map total to total_amount for consistency
          order_items: orderItemsData?.filter(item => item.order_id === order.id) || []
        }))

        setRecentOrders(ordersWithItems)
      }

      // Fetch top products by total sales
      // First, get order items grouped by product
      const { data: orderItemsData } = await supabase
        .from("order_items")
        .select(`
          product_id,
          quantity,
          products!inner(id, name, image_url, price, store_id)
        `)
        .eq("products.store_id", storeData.id)

      if (orderItemsData && orderItemsData.length > 0) {
        // Aggregate sales by product
        const productSales: Record<string, { product: any; totalSold: number }> = {}
        
        orderItemsData.forEach((item: any) => {
          const productId = item.product_id
          if (!productSales[productId]) {
            productSales[productId] = {
              product: item.products,
              totalSold: 0
            }
          }
          productSales[productId].totalSold += item.quantity
        })

        // Convert to array and sort by total sold
        const topProductsList = Object.values(productSales)
          .sort((a, b) => b.totalSold - a.totalSold)
          .slice(0, 5)
          .map(item => ({
            id: item.product.id,
            name: item.product.name,
            image_url: item.product.image_url,
            price: item.product.price,
            total_sold: item.totalSold
          }))

        setTopProducts(topProductsList)
      }

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

  // Use custom domain if verified (only in production), otherwise use default
  const isProduction = process.env.NODE_ENV === 'production'
  const storefrontUrl = isProduction && customDomain?.status === 'verified'
    ? `https://${customDomain.domain}`
    : isProduction 
      ? `https://my.sellium.store/${store.username}`
      : `http://localhost:3000/${store.username}`
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
            <div className="w-full md:w-48 h-[103px] rounded-lg overflow-hidden border bg-muted flex-shrink-0 relative group">
              <iframe
                src={storefrontUrl}
                className="absolute top-0 left-0 w-[400%] h-[412px] origin-top-left scale-[0.25] pointer-events-none"
                title="Store Preview"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors" />
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
                    {customDomain?.status === 'verified' ? customDomain.domain : `my.sellium.store/${store.username}`}
                  </Link>
                  <ArrowSquareOut className="h-3.5 w-3.5 text-muted-foreground" />
                  <Link href="/dashboard/settings?tab=domain" className="text-primary hover:underline">
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h3 className="text-[20px] font-normal">Recent Orders</h3>
              <CardDescription>
                {recentOrders.length === 0 ? "You have no orders yet." : `You have ${stats.totalOrders} order${stats.totalOrders !== 1 ? 's' : ''}.`}
              </CardDescription>
            </div>
            {stats.totalOrders > 0 && (
              <Link 
                href="/dashboard/orders" 
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mb-2 opacity-50" />
                <p>No orders to display</p>
                <p className="text-xs mt-1">Orders will appear here once customers start purchasing.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order, index) => {
                  // Get first item for display (show image and name of first product)
                  const firstItem = order.order_items?.[0]
                  const itemCount = order.order_items?.length || 0
                  const displayName = firstItem?.product_name || "No products"
                  const displayPrice = firstItem?.price || 0
                  const hasMoreItems = itemCount > 1
                  
                  return (
                    <div key={order.id} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-4">{index + 1}</span>
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {firstItem?.image_url ? (
                          <img 
                            src={firstItem.image_url} 
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {displayName}
                          {hasMoreItems && <span className="text-muted-foreground"> +{itemCount - 1} more</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">${displayPrice.toFixed(2)}</p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h3 className="text-[20px] font-normal">Top Products</h3>
              <CardDescription>
                Your best selling products.
              </CardDescription>
            </div>
            {topProducts.length > 0 && (
              <Link 
                href="/dashboard/products" 
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <Package className="h-10 w-10 mb-2 opacity-50" />
                <p>No products yet</p>
                <p className="text-xs mt-1">Add products to see your best sellers.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-4">{index + 1}</span>
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">${product.price.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{product.total_sold}</span>
                      <span className="text-xs text-muted-foreground ml-1">sold</span>
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

// Order Status Badge Component
function OrderStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pending", variant: "secondary" },
    processing: { label: "Processing", variant: "default" },
    shipped: { label: "Shipped", variant: "default" },
    delivered: { label: "Delivered", variant: "default" },
    completed: { label: "Completed", variant: "default" },
    cancelled: { label: "Cancelled", variant: "destructive" },
    refunded: { label: "Refunded", variant: "outline" },
  }

  const config = statusConfig[status] || { label: status, variant: "secondary" as const }

  return (
    <Badge variant={config.variant} className="text-xs capitalize">
      {config.label}
    </Badge>
  )
}
