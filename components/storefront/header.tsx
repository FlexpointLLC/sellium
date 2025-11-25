"use client"
/* eslint-disable @next/next/no-img-element */

import Link from "next/link"
import { 
  MagnifyingGlass, 
  Phone, 
  ShoppingCart,
  User,
  CurrencyDollar
} from "phosphor-react"
import { Input } from "@/components/ui/input"
import { useCart } from "@/lib/cart-context"

interface Store {
  name: string
  username: string
  logo_url: string | null
  theme_color: string
  social_links?: {
    phone?: string
  } | null
}

interface Category {
  id: string
  name: string
  slug: string
}

interface StorefrontHeaderProps {
  store: Store
  categories: Category[]
  username: string
  searchQuery?: string
  onSearchChange?: (value: string) => void
  currentCategorySlug?: string
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
  const themeColor = store.theme_color || "#000000"

  return (
    <>
      {/* Top Header - Logo | Search | User */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            {/* Logo - Left */}
            <div className="flex-1 flex justify-start">
              <Link href={`/${username}`} className="flex items-center gap-2 shrink-0">
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
                <button 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Currency"
                >
                  <CurrencyDollar className="h-5 w-5" />
                </button>
                <Link 
                  href={`/${username}/cart`}
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
      {categories.length > 0 && (
        <nav className="sticky top-16 z-40 bg-white border-b border-black/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-8 h-12 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/${username}/category/${category.slug}`}
                  className={`relative text-sm font-medium whitespace-nowrap transition-colors pb-2 flex-shrink-0 ${
                    category.slug === currentCategorySlug
                      ? "text-gray-900 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {category.name.toUpperCase()}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}
    </>
  )
}

