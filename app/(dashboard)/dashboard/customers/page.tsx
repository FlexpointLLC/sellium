"use client"

import { Users, MagnifyingGlass, Eye } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const demoCustomers = [
  { id: 1, name: "John Doe", email: "john@example.com", orders: 12, spent: 1299.99, joined: "2023-06-15" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", orders: 8, spent: 899.50, joined: "2023-08-22" },
  { id: 3, name: "Bob Wilson", email: "bob@example.com", orders: 23, spent: 2549.95, joined: "2023-03-10" },
  { id: 4, name: "Alice Brown", email: "alice@example.com", orders: 5, spent: 459.98, joined: "2023-11-05" },
  { id: 5, name: "Charlie Davis", email: "charlie@example.com", orders: 15, spent: 1879.99, joined: "2023-07-18" },
  { id: 6, name: "Emma Johnson", email: "emma@example.com", orders: 3, spent: 189.97, joined: "2024-01-02" },
]

export default function CustomersPage() {
  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Customers</h1>
          <p className="text-sm font-normal text-muted-foreground">View and manage your customers</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers..." className="pl-9" />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-6 gap-4 border-b px-6 py-3 text-sm font-medium text-muted-foreground">
          <div>Customer</div>
          <div>Email</div>
          <div>Orders</div>
          <div>Total Spent</div>
          <div>Joined</div>
          <div>Actions</div>
        </div>
        {demoCustomers.map((customer) => (
          <div
            key={customer.id}
            className="grid grid-cols-6 gap-4 border-b px-6 py-4 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <Users className="h-4 w-4" />
              </div>
              <span className="font-medium">{customer.name}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              {customer.email}
            </div>
            <div className="flex items-center">{customer.orders}</div>
            <div className="flex items-center font-medium">
              ${customer.spent.toFixed(2)}
            </div>
            <div className="flex items-center text-muted-foreground">
              {customer.joined}
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

