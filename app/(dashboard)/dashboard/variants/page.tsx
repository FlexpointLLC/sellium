"use client"

import { Stack, Plus, MagnifyingGlass } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const demoVariants = [
  { id: 1, name: "Size", options: ["S", "M", "L", "XL"], products: 45 },
  { id: 2, name: "Color", options: ["Red", "Blue", "Black", "White"], products: 89 },
  { id: 3, name: "Material", options: ["Cotton", "Polyester", "Wool"], products: 34 },
  { id: 4, name: "Storage", options: ["64GB", "128GB", "256GB", "512GB"], products: 12 },
  { id: 5, name: "Style", options: ["Classic", "Modern", "Vintage"], products: 23 },
]

export default function VariantsPage() {
  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Variants</h1>
          <p className="text-muted-foreground">Manage product variant options</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Variant
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search variants..." className="pl-9" />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-4 gap-4 border-b px-6 py-3 text-sm font-medium text-muted-foreground">
          <div>Variant Name</div>
          <div>Options</div>
          <div>Used in Products</div>
          <div>Actions</div>
        </div>
        {demoVariants.map((variant) => (
          <div
            key={variant.id}
            className="grid grid-cols-4 gap-4 border-b px-6 py-4 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Stack className="h-4 w-4" />
              </div>
              <span className="font-medium">{variant.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {variant.options.map((option) => (
                <span
                  key={option}
                  className="inline-flex rounded-md bg-muted px-2 py-1 text-xs"
                >
                  {option}
                </span>
              ))}
            </div>
            <div className="flex items-center">{variant.products} products</div>
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

