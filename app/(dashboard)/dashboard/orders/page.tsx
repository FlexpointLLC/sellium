"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, MagnifyingGlass, Eye, Plus } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"

interface Order {
  id: string
  order_number: string
  customer_name: string | null
  customer_email: string
  status: string
  payment_status: string
  total: number
  created_at: string
  item_count?: number
}

interface Store {
  id: string
  name: string
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  processing: "bg-blue-500/10 text-blue-500",
  shipped: "bg-purple-500/10 text-purple-500",
  delivered: "bg-green-500/10 text-green-500",
  cancelled: "bg-red-500/10 text-red-500",
  refunded: "bg-gray-500/10 text-gray-500",
}

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  paid: "bg-green-500/10 text-green-500",
  failed: "bg-red-500/10 text-red-500",
  refunded: "bg-gray-500/10 text-gray-500",
  partially_refunded: "bg-orange-500/10 text-orange-500",
}

export default function OrdersPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<Store | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push("/login")
      return
    }

    // Fetch store
    const { data: storeData } = await supabase
      .from("stores")
      .select("id, name")
      .eq("user_id", user.id)
      .single()

    if (!storeData) {
      router.push("/onboarding")
      return
    }

    setStore(storeData)

    // Fetch orders with item count
    const { data: ordersData } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        status,
        payment_status,
        total,
        created_at
      `)
      .eq("store_id", storeData.id)
      .order("created_at", { ascending: false })

    if (ordersData) {
      // Fetch item counts for each order
      const ordersWithCounts = await Promise.all(ordersData.map(async (order) => {
        const { count } = await supabase
          .from("order_items")
          .select("*", { count: "exact", head: true })
          .eq("order_id", order.id)
        
        return { ...order, item_count: count || 0 }
      }))
      
      setOrders(ordersWithCounts)
    }

    setLoading(false)
  }

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (order.customer_name && order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    order.customer_email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-10 w-64" />
        <div className="rounded-lg border bg-card p-4">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-normal">Orders</h1>
          <p className="text-sm font-normal text-muted-foreground">View and manage customer orders</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search orders..." 
            className="pl-9" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b">
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Order</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Items</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Total</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Payment</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No orders found matching your search." : "No orders yet."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{order.order_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{order.customer_name || "Guest"}</span>
                      <span className="text-xs text-muted-foreground">{order.customer_email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{order.item_count}</td>
                  <td className="px-6 py-4 font-medium">${order.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${statusColors[order.status] || "bg-gray-500/10 text-gray-500"}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${paymentStatusColors[order.payment_status] || "bg-gray-500/10 text-gray-500"}`}
                    >
                      {order.payment_status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(order.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm">
                        <Eye />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-semibold">{orders.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-semibold">{orders.filter(o => o.status === "pending").length}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Processing</p>
            <p className="text-2xl font-semibold">{orders.filter(o => o.status === "processing").length}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-semibold">
              ${orders.filter(o => o.payment_status === "paid").reduce((sum, o) => sum + o.total, 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
