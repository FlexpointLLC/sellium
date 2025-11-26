"use client"
/* eslint-disable @next/next/no-img-element */

import { useState } from "react"
import Link from "next/link"
import { 
  MagnifyingGlass, 
  Phone, 
  ShoppingCart,
  User,
  CaretDown
} from "phosphor-react"
import { Input } from "@/components/ui/input"
import { useCart } from "@/lib/cart-context"
import { useStorefrontUrl } from "@/lib/use-storefront-url"

interface Store {
  name: string
  username: string
  logo_url: string | null
  theme_color: string | null
  social_links?: {
    phone?: string
  } | null
}

interface Category {
  id: string
  name: string
  slug: string
  parent_id?: string | null
  children?: Category[]
}

interface StorefrontHeaderProps {
  store: Store
  categories: Category[]
  username: string
  searchQuery?: string
  onSearchChange?: (value: string) => void
  currentCategorySlug?: string
}

// Build tree structure from flat categories
function buildCategoryTree(flatCategories: Category[]): Category[] {
  const categoryMap = new Map<string, Category>()
  const rootCategories: Category[] = []

  // First pass: create map
  flatCategories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] })
  })

  // Second pass: build tree
  flatCategories.forEach(cat => {
    const category = categoryMap.get(cat.id)!
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      const parent = categoryMap.get(cat.parent_id)!
      parent.children = parent.children || []
      parent.children.push(category)
    } else {
      rootCategories.push(category)
    }
  })

  return rootCategories
}

// Helper to get category URL path
function getCategoryPath(category: Category, parentSlug?: string): string {
  if (parentSlug) {
    return `/category/${parentSlug}/${category.slug}`
  }
  return `/category/${category.slug}`
}

// Category item with dropdown for children
function CategoryItem({ 
  category, 
  currentCategorySlug, 
  getUrl,
  themeColor
}: { 
  category: Category
  currentCategorySlug?: string
  getUrl: (path?: string) => string
  themeColor: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = category.children && category.children.length > 0
  const isActive = category.slug === currentCategorySlug || 
    category.children?.some(child => child.slug === currentCategorySlug)

  if (!hasChildren) {
    return (
      <Link
        href={getUrl(getCategoryPath(category))}
        className={`relative text-sm font-medium whitespace-nowrap transition-colors py-3 flex-shrink-0 ${
          category.slug === currentCategorySlug
            ? "text-gray-900"
            : "text-gray-600 hover:text-gray-900"
        }`}
        style={category.slug === currentCategorySlug ? { color: themeColor } : undefined}
      >
        {category.name.toUpperCase()}
        {category.slug === currentCategorySlug && (
          <span 
            className="absolute bottom-0 left-0 w-full h-0.5" 
            style={{ backgroundColor: themeColor }}
          />
        )}
      </Link>
    )
  }

  return (
    <div 
      className="relative flex-shrink-0"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={`flex items-center gap-1 text-sm font-medium whitespace-nowrap transition-colors py-3 ${
          isActive
            ? "text-gray-900"
            : "text-gray-600 hover:text-gray-900"
        }`}
        style={isActive ? { color: themeColor } : undefined}
      >
        {category.name.toUpperCase()}
        <CaretDown 
          className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} 
          weight="bold"
        />
        {isActive && (
          <span 
            className="absolute bottom-0 left-0 w-full h-0.5" 
            style={{ backgroundColor: themeColor }}
          />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 pt-1 z-[100]">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[180px]">
            {/* Parent category link */}
            <Link
              href={getUrl(getCategoryPath(category))}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium border-b border-gray-100"
            >
              All {category.name}
            </Link>
            
            {/* Child categories - use parent/child slug pattern */}
            {category.children?.map((child) => (
              <Link
                key={child.id}
                href={getUrl(getCategoryPath(child, category.slug))}
                className={`block px-4 py-2 text-sm transition-colors ${
                  child.slug === currentCategorySlug
                    ? "bg-gray-50 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
                style={child.slug === currentCategorySlug ? { color: themeColor } : undefined}
              >
                {child.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function StorefrontHeader({ 
  store, 
  categories, 
  username,
  searchQuery = "",
  onSearchChange,
  currentCategorySlug
}: StorefrontHeaderProps) {
  const { itemCount } = useCart()
  const { getUrl } = useStorefrontUrl(username)
  const themeColor = store.theme_color || "#000000"

  // Build tree structure - only show root categories in nav
  const categoryTree = buildCategoryTree(categories)

  return (
    <>
      {/* Top Header - Logo | Search | User */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            {/* Logo - Left */}
            <div className="flex-1 flex justify-start">
              <Link href={getUrl()} className="flex items-center gap-2 shrink-0">
                {store.logo_url ? (
                  <img src={store.logo_url} alt={store.name} className="h-10 w-auto" />
                ) : (
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-8 w-8 rounded flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: themeColor }}
                    >
                      {store.name.charAt(0)}
                    </div>
                    <span className="font-bold text-xl tracking-tight">{store.name}</span>
                  </div>
                )}
              </Link>
            </div>

            {/* Search - Center */}
            <div className="w-full max-w-md">
              <div className="relative w-full">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  className="pl-9 h-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 w-full"
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                />
              </div>
            </div>

            {/* Icons - Right */}
            <div className="flex-1 flex justify-end">
              <div className="flex items-center gap-1">
                {store.social_links?.phone && (
                  <a 
                    href={`tel:${store.social_links.phone}`} 
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Call us"
                  >
                    <Phone className="h-5 w-5" />
                  </a>
                )}
                <Link 
                  href={getUrl('/cart')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
                  title="Cart"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </Link>
                <a 
                  href="#" 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Account"
                >
                  <User className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Categories Navigation */}
      {categoryTree.length > 0 && (
        <nav className="sticky top-16 z-40 bg-white border-b border-black/10 overflow-visible">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
            <div 
              className="flex items-center gap-6 h-12"
            >
              {categoryTree.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  currentCategorySlug={currentCategorySlug}
                  getUrl={getUrl}
                  themeColor={themeColor}
                />
              ))}
            </div>
          </div>
        </nav>
      )}
    </>
  )
}
