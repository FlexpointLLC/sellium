"use client"

import { Folders, Plus, MagnifyingGlass } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const demoCategories = [
  { id: 1, name: "Electronics", slug: "electronics", products: 156, status: "Active" },
  { id: 2, name: "Clothing", slug: "clothing", products: 89, status: "Active" },
  { id: 3, name: "Home & Garden", slug: "home-garden", products: 234, status: "Active" },
  { id: 4, name: "Sports & Outdoors", slug: "sports-outdoors", products: 67, status: "Active" },
  { id: 5, name: "Books", slug: "books", products: 45, status: "Draft" },
]

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Categories</h1>
          <p className="text-sm font-normal text-muted-foreground">Manage your product categories</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search categories..." className="pl-9" />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-5 gap-4 border-b px-6 py-3 text-sm font-medium text-muted-foreground">
          <div>Name</div>
          <div>Slug</div>
          <div>Products</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {demoCategories.map((category) => (
          <div
            key={category.id}
            className="grid grid-cols-5 gap-4 border-b px-6 py-4 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Folders className="h-4 w-4" />
              </div>
              <span className="font-medium">{category.name}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              {category.slug}
            </div>
            <div className="flex items-center">{category.products}</div>
            <div className="flex items-center">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  category.status === "Active"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-yellow-500/10 text-yellow-500"
                }`}
              >
                {category.status}
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

