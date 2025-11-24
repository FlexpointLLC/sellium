"use client"

import { Package, Plus, MagnifyingGlass } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const demoProducts = [
  { id: 1, name: "Wireless Headphones", sku: "WH-001", price: 129.99, stock: 45, status: "Active" },
  { id: 2, name: "Smart Watch Pro", sku: "SW-002", price: 299.99, stock: 23, status: "Active" },
  { id: 3, name: "Laptop Stand", sku: "LS-003", price: 49.99, stock: 156, status: "Active" },
  { id: 4, name: "USB-C Hub", sku: "UH-004", price: 79.99, stock: 0, status: "Out of Stock" },
  { id: 5, name: "Mechanical Keyboard", sku: "MK-005", price: 159.99, stock: 12, status: "Active" },
  { id: 6, name: "Webcam HD", sku: "WC-006", price: 89.99, stock: 34, status: "Draft" },
]

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Products</h1>
          <p className="text-sm font-normal text-muted-foreground">Manage your product inventory</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-9" />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-6 gap-4 border-b px-6 py-3 text-sm font-medium text-muted-foreground">
          <div>Product</div>
          <div>SKU</div>
          <div>Price</div>
          <div>Stock</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {demoProducts.map((product) => (
          <div
            key={product.id}
            className="grid grid-cols-6 gap-4 border-b px-6 py-4 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Package className="h-5 w-5" />
              </div>
              <span className="font-medium">{product.name}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              {product.sku}
            </div>
            <div className="flex items-center font-medium">
              ${product.price.toFixed(2)}
            </div>
            <div className="flex items-center">{product.stock}</div>
            <div className="flex items-center">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  product.status === "Active"
                    ? "bg-green-500/10 text-green-500"
                    : product.status === "Out of Stock"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-yellow-500/10 text-yellow-500"
                }`}
              >
                {product.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive">
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

