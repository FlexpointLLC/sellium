"use client"

import { ShoppingCart, MagnifyingGlass, Eye } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const demoOrders = [
  { id: "ORD-001", customer: "John Doe", email: "john@example.com", items: 3, total: 299.99, status: "Pending", date: "2024-01-15" },
  { id: "ORD-002", customer: "Jane Smith", email: "jane@example.com", items: 1, total: 129.99, status: "Shipped", date: "2024-01-14" },
  { id: "ORD-003", customer: "Bob Wilson", email: "bob@example.com", items: 5, total: 549.95, status: "Delivered", date: "2024-01-13" },
  { id: "ORD-004", customer: "Alice Brown", email: "alice@example.com", items: 2, total: 189.98, status: "Processing", date: "2024-01-12" },
  { id: "ORD-005", customer: "Charlie Davis", email: "charlie@example.com", items: 1, total: 79.99, status: "Cancelled", date: "2024-01-11" },
]

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-500/10 text-yellow-500",
  Processing: "bg-blue-500/10 text-blue-500",
  Shipped: "bg-purple-500/10 text-purple-500",
  Delivered: "bg-green-500/10 text-green-500",
  Cancelled: "bg-red-500/10 text-red-500",
}

export default function OrdersPage() {
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
          <Input placeholder="Search orders..." className="pl-9" />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-7 gap-4 border-b px-6 py-3 text-sm font-medium text-muted-foreground">
          <div>Order ID</div>
          <div>Customer</div>
          <div>Items</div>
          <div>Total</div>
          <div>Status</div>
          <div>Date</div>
          <div>Actions</div>
        </div>
        {demoOrders.map((order) => (
          <div
            key={order.id}
            className="grid grid-cols-7 gap-4 border-b px-6 py-4 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span className="font-medium">{order.id}</span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-medium">{order.customer}</span>
              <span className="text-xs text-muted-foreground">{order.email}</span>
            </div>
            <div className="flex items-center">{order.items}</div>
            <div className="flex items-center font-medium">
              ${order.total.toFixed(2)}
            </div>
            <div className="flex items-center">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[order.status]}`}
              >
                {order.status}
              </span>
            </div>
            <div className="flex items-center text-muted-foreground">
              {order.date}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

