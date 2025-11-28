"use client"
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, MagnifyingGlass, Eye, Package, MapPin, Phone, Envelope, User, Funnel, ArrowDown, ArrowUp, Download } from "phosphor-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  variant_title: string | null
  sku: string | null
  quantity: number
  price: number
  total: number
  image_url: string | null
}

interface OrderDetails {
  id: string
  order_number: string
  customer_name: string | null
  customer_email: string
  customer_phone: string | null
  status: string
  payment_status: string
  payment_method: string | null
  transaction_id: string | null
  subtotal: number
  shipping_cost: number
  tax: number
  total: number
  notes: string | null
  shipping_address: {
    name?: string
    street?: string
    city?: string
    state?: string
    country?: string
    postal_code?: string
    phone?: string
  } | null
  created_at: string
  items: OrderItem[]
}

interface Order {
  id: string
  order_number: string
  customer_name: string | null
  customer_email: string
  status: string
  payment_status: string
  payment_method: string | null
  transaction_id: string | null
  total: number
  created_at: string
  item_count?: number
}

interface Store {
  id: string
  name: string
  currency: string
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  processing: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  shipped: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  delivered: "bg-green-500/10 text-green-500 border-green-500/30",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/30",
  refunded: "bg-gray-500/10 text-gray-500 border-gray-500/30",
}

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  paid: "bg-green-500/10 text-green-500 border-green-500/30",
  failed: "bg-red-500/10 text-red-500 border-red-500/30",
  refunded: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  partially_refunded: "bg-orange-500/10 text-orange-500 border-orange-500/30",
}

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
]

const paymentStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "partially_refunded", label: "Partially Refunded" },
]

export default function OrdersPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<Store | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "total" | "customer">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  
  // View order dialog
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null)
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false)

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

    // Fetch store
    const { data: storeData } = await supabase
      .from("stores")
      .select("id, name, currency")
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
        payment_method,
        transaction_id,
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

  // Filter orders
  const filteredOrders = orders
    .filter(order => {
      // Search filter
      const matchesSearch = 
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        order.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.transaction_id && order.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()))
      
      // Status filter
      const matchesStatus = statusFilter === "all" || order.status === statusFilter
      
      // Payment status filter
      const matchesPaymentStatus = paymentStatusFilter === "all" || order.payment_status === paymentStatusFilter
      
      return matchesSearch && matchesStatus && matchesPaymentStatus
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "total":
          comparison = a.total - b.total
          break
        case "customer":
          const nameA = (a.customer_name || a.customer_email).toLowerCase()
          const nameB = (b.customer_name || b.customer_email).toLowerCase()
          comparison = nameA.localeCompare(nameB)
          break
      }
      
      return sortOrder === "asc" ? comparison : -comparison
    })

  // Export to CSV - exports only the filtered and sorted orders
  function exportToCSV() {
    if (filteredOrders.length === 0) {
      toast.error("No orders to export")
      return
    }

    // Export only the filtered orders (respects search, status filter, payment status filter, and sorting)
    const headers = ["Order Number", "Customer Name", "Email", "Status", "Payment Status", "Payment Method", "Transaction ID", "Total", "Date"]
    const rows = filteredOrders.map(order => [
      order.order_number,
      order.customer_name || "Guest",
      order.customer_email,
      order.status,
      order.payment_status,
      order.payment_method || "-",
      order.transaction_id || "-",
      order.total.toFixed(2),
      formatDate(order.created_at)
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `orders_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success("Orders exported successfully")
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)

    if (error) {
      toast.error("Failed to update order status")
      return
    }

    // Update local state
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ))
    toast.success("Order status updated")
  }

  async function updatePaymentStatus(orderId: string, newStatus: string) {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: newStatus })
      .eq("id", orderId)

    if (error) {
      toast.error("Failed to update payment status")
      return
    }

    // Update local state
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, payment_status: newStatus } : order
    ))
    toast.success("Payment status updated")
  }

  async function viewOrderDetails(orderId: string) {
    setLoadingOrderDetails(true)
    setIsViewDialogOpen(true)

    // Fetch order details
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single()

    if (orderError || !orderData) {
      toast.error("Failed to load order details")
      setLoadingOrderDetails(false)
      return
    }

    // Fetch order items
    const { data: itemsData } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)

    // Fetch product SKUs for items that don't have SKU
    let itemsWithSku = itemsData || []
    if (itemsData && itemsData.length > 0) {
      const productIds = itemsData.map(item => item.product_id).filter(Boolean)
      const variantIds = itemsData.map(item => item.product_variant_id).filter(Boolean)
      
      // Fetch products
      const { data: productsData } = await supabase
        .from("products")
        .select("id, sku, image_url")
        .in("id", productIds)
      
      // Fetch variants if any
      let variantsData: any[] = []
      if (variantIds.length > 0) {
        const { data: variants } = await supabase
          .from("product_variants")
          .select("id, sku")
          .in("id", variantIds)
        variantsData = variants || []
      }

      // Map SKUs to items
      const productMap = new Map(productsData?.map(p => [p.id, p]) || [])
      const variantMap = new Map(variantsData.map(v => [v.id, v]))

      itemsWithSku = itemsData.map(item => ({
        ...item,
        _productSku: productMap.get(item.product_id)?.sku || null,
        _productImage: productMap.get(item.product_id)?.image_url || null,
        _variantSku: item.product_variant_id ? variantMap.get(item.product_variant_id)?.sku || null : null
      }))
    }

    const orderDetails: OrderDetails = {
      id: orderData.id,
      order_number: orderData.order_number,
      customer_name: orderData.customer_name,
      customer_email: orderData.customer_email,
      customer_phone: orderData.customer_phone,
      status: orderData.status,
      payment_status: orderData.payment_status,
      payment_method: orderData.payment_method,
      transaction_id: orderData.transaction_id,
      subtotal: orderData.subtotal || orderData.total,
      shipping_cost: orderData.shipping_cost || 0,
      tax: orderData.tax || 0,
      total: orderData.total,
      notes: orderData.notes,
      shipping_address: orderData.shipping_address,
      created_at: orderData.created_at,
      items: itemsWithSku.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        variant_title: item.variant_title || item.variant_name,
        sku: item.sku || item._variantSku || item._productSku || null,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        image_url: item.image_url || item._productImage || null
      }))
    }

    setSelectedOrder(orderDetails)
    setLoadingOrderDetails(false)
  }

  function formatCurrency(amount: number) {
    const currency = store?.currency || "USD"
    const symbols: Record<string, string> = {
      BDT: "৳",
      USD: "$",
      EUR: "€",
      GBP: "£",
      INR: "₹"
    }
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`
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
              {formatCurrency(orders.filter(o => o.payment_status === "paid").reduce((sum, o) => sum + o.total, 0))}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by order, customer, or transaction ID..." 
            className="pl-9" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Funnel className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment</SelectItem>
                {paymentStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value: "date" | "total" | "customer") => setSortBy(value)}>
              <SelectTrigger className="w-[120px] h-9 text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="total">Total</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              title={sortOrder === "asc" ? "Sort Descending" : "Sort Ascending"}
            >
              {sortOrder === "asc" ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="h-9 border-2 border-border/80 bg-muted/50 hover:bg-muted font-semibold shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-x-scroll scrollbar-visible pb-1">
        <table className="w-full min-w-[950px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Order</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Items</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Total</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Payment</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Method</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Trx ID</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
              <th className="px-6 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={10}>
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
                <tr key={order.id} className="border-b border-border/50 last:border-0">
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{order.order_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{order.customer_name || "Guest"}</span>
                      <span className="text-xs text-muted-foreground">{order.customer_email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{order.item_count}</td>
                  <td className="px-6 py-4 text-sm font-medium">{formatCurrency(order.total)}</td>
                  <td className="px-6 py-4 text-sm">
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                    >
                      <SelectTrigger 
                        className={`w-[110px] h-7 text-xs font-medium capitalize border ${statusColors[order.status] || "bg-gray-500/10 text-gray-500 border-gray-500/30"}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value}
                            className="text-xs capitalize"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Select
                      value={order.payment_status}
                      onValueChange={(value) => updatePaymentStatus(order.id, value)}
                    >
                      <SelectTrigger 
                        className={`w-[110px] h-7 text-xs font-medium capitalize border ${paymentStatusColors[order.payment_status] || "bg-gray-500/10 text-gray-500 border-gray-500/30"}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentStatusOptions.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value}
                            className="text-xs capitalize"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="capitalize">
                      {order.payment_method === "cod" ? "COD" :
                       order.payment_method === "bkash" ? "bKash" :
                       order.payment_method === "bkash_manual" ? "bKash" :
                       order.payment_method === "nagad" ? "Nagad" :
                       order.payment_method === "nagad_manual" ? "Nagad" :
                       order.payment_method === "card" ? "Card" :
                       order.payment_method || "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="font-mono text-muted-foreground">
                      {order.transaction_id || "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{formatDate(order.created_at)}</td>
                  <td className="px-6 py-4">
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      onClick={() => viewOrderDetails(order.id)}
                      title="View Order Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Order Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Order {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          {loadingOrderDetails ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Order Status */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(value) => {
                        updateOrderStatus(selectedOrder.id, value)
                        setSelectedOrder({ ...selectedOrder, status: value })
                      }}
                    >
                      <SelectTrigger 
                        className={`w-[130px] h-8 text-xs font-medium capitalize border ${statusColors[selectedOrder.status] || "bg-gray-500/10 text-gray-500 border-gray-500/30"}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value}
                            className="text-xs capitalize"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Payment:</span>
                    <Select
                      value={selectedOrder.payment_status}
                      onValueChange={(value) => {
                        updatePaymentStatus(selectedOrder.id, value)
                        setSelectedOrder({ ...selectedOrder, payment_status: value })
                      }}
                    >
                      <SelectTrigger 
                        className={`w-[140px] h-8 text-xs font-medium capitalize border ${paymentStatusColors[selectedOrder.payment_status] || "bg-gray-500/10 text-gray-500 border-gray-500/30"}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentStatusOptions.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value}
                            className="text-xs capitalize"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDate(selectedOrder.created_at)}
                </span>
              </div>

              {/* Customer Info */}
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedOrder.customer_name || "Guest"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium flex items-center gap-1">
                      <Envelope className="h-3 w-3" />
                      {selectedOrder.customer_email}
                    </p>
                  </div>
                  {selectedOrder.customer_phone && (
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedOrder.customer_phone}
                      </p>
                    </div>
                  )}
                  {selectedOrder.payment_method && (
                    <div>
                      <p className="text-muted-foreground">Payment Method</p>
                      <p className="font-medium capitalize">
                        {selectedOrder.payment_method === "cod" ? "Cash on Delivery" :
                         selectedOrder.payment_method === "bkash" ? "bKash" :
                         selectedOrder.payment_method === "bkash_manual" ? "bKash (Manual)" :
                         selectedOrder.payment_method === "nagad" ? "Nagad" :
                         selectedOrder.payment_method === "nagad_manual" ? "Nagad (Manual)" :
                         selectedOrder.payment_method === "card" ? "Card Payment" :
                         selectedOrder.payment_method}
                      </p>
                    </div>
                  )}
                  {selectedOrder.transaction_id && (
                    <div>
                      <p className="text-muted-foreground">Transaction ID</p>
                      <p className="font-medium font-mono text-sm">{selectedOrder.transaction_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shipping_address && (
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </h3>
                  <div className="text-sm">
                    {selectedOrder.shipping_address.name && (
                      <p className="font-medium">{selectedOrder.shipping_address.name}</p>
                    )}
                    {selectedOrder.shipping_address.street && (
                      <p>{selectedOrder.shipping_address.street}</p>
                    )}
                    <p>
                      {[
                        selectedOrder.shipping_address.city,
                        selectedOrder.shipping_address.state,
                        selectedOrder.shipping_address.postal_code
                      ].filter(Boolean).join(", ")}
                    </p>
                    {selectedOrder.shipping_address.country && (
                      <p>{selectedOrder.shipping_address.country}</p>
                    )}
                    {selectedOrder.shipping_address.phone && (
                      <p className="mt-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedOrder.shipping_address.phone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Order Items ({selectedOrder.items.length})
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.product_name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.product_name}</p>
                        {item.variant_title && (
                          <p className="text-xs text-muted-foreground">{item.variant_title}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.sku || "N/A"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.shipping_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{formatCurrency(selectedOrder.shipping_cost)}</span>
                    </div>
                  )}
                  {selectedOrder.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(selectedOrder.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t font-medium text-base">
                    <span>Total</span>
                    <span>{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-2">Order Notes</h3>
                  <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
