"use client"
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Script from "next/script"
import { 
  MagnifyingGlass, 
  Phone, 
  ShoppingCart,
  User,
  CaretDown,
  List,
  X
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
  linquo_org_id?: string | null
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const categoryRef = useRef<HTMLDivElement>(null)
  const hasChildren = category.children && category.children.length > 0
  const isActive = category.slug === currentCategorySlug || 
    category.children?.some(child => child.slug === currentCategorySlug)

  useEffect(() => {
    if (isOpen && categoryRef.current) {
      const rect = categoryRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX
      })
    }
  }, [isOpen])

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
    <>
      <div 
        ref={categoryRef}
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

      </div>
      
      {/* Dropdown - Rendered via Portal to avoid overflow clipping */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed z-[1000]"
          style={{ 
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            pointerEvents: 'auto'
          }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
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
        </div>,
        document.body
      )}
    </>
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
  const { getUrl, isCustomDomain } = useStorefrontUrl(username)
  const pathname = usePathname()
  const themeColor = store.theme_color || "#000000"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Build tree structure - only show root categories in nav
  const categoryTree = buildCategoryTree(categories)

  // Check if we're on the home page
  const homeUrl = getUrl()
  // Normalize paths (remove trailing slashes for comparison)
  const normalizedPathname = pathname.replace(/\/$/, '') || '/'
  const normalizedHomeUrl = homeUrl.replace(/\/$/, '') || '/'
  const isHomePage = normalizedPathname === normalizedHomeUrl || normalizedPathname === `/${username}`

  // Logo content (reusable)
  const logoContent = (
    <>
      {store.logo_url ? (
        <img src={store.logo_url} alt={store.name} className="h-8 sm:h-10 w-auto" />
      ) : (
        <div className="flex items-center gap-2">
          <div 
            className="h-6 w-6 sm:h-8 sm:w-8 rounded flex items-center justify-center text-white font-bold text-sm sm:text-base"
            style={{ backgroundColor: themeColor }}
          >
            {store.name.charAt(0)}
          </div>
          <span className="font-bold text-base sm:text-xl tracking-tight hidden sm:inline">{store.name}</span>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Linquo Live Chat Script */}
      {store.linquo_org_id && (
        <Script
          id="linquo"
          src={`https://admin.linquo.app/widget.js?id=${store.linquo_org_id}`}
          strategy="afterInteractive"
        />
      )}

      {/* Top Header - Logo | Search | User */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-2 sm:gap-4">
            {/* Logo - Most Left */}
            <div className="shrink-0">
              {isHomePage ? (
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 shrink-0 cursor-pointer"
                  aria-label="Reload page"
                >
                  {logoContent}
                </button>
              ) : (
                <Link href={getUrl()} className="flex items-center gap-2 shrink-0">
                  {logoContent}
                </Link>
              )}
            </div>

            {/* Search - Center */}
            <div className="flex-1 min-w-0 flex justify-center">
              <div className="relative w-full max-w-md">
                <MagnifyingGlass className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  className="pl-7 sm:pl-9 h-8 sm:h-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 w-full text-sm sm:text-base"
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                />
              </div>
            </div>

            {/* Icons - Most Right */}
            <div className="shrink-0 flex items-center gap-0.5 sm:gap-1">
              {categoryTree.length > 0 && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Menu"
                >
                  {mobileMenuOpen ? (
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <List className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              )}
                {store.social_links?.phone && (
                  <a 
                    href={`tel:${store.social_links.phone}`} 
                    className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Call us"
                  >
                    <Phone className="h-6 w-6 sm:h-7 sm:w-7" />
                  </a>
                )}
                <Link 
                  href={getUrl('/cart')}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors relative"
                  title="Cart"
                >
                  <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7" />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center text-[10px] sm:text-xs font-bold text-white bg-red-500 rounded-full">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </Link>
                <Link 
                  href={getUrl('/account')}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Account"
                >
                  <User className="h-6 w-6 sm:h-7 sm:w-7" />
                </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Categories Navigation */}
      {categoryTree.length > 0 && (
        <>
          {/* Desktop Categories Navigation */}
          <nav className="hidden md:block sticky top-16 z-40 bg-white border-b border-black/10 overflow-x-auto scrollbar-hide">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-6 h-12" style={{ position: 'relative', minWidth: 'max-content' }}>
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

          {/* Mobile Categories Menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden bg-white border-b border-black/10">
              <div className="max-w-7xl mx-auto px-4 py-2 max-h-[60vh] overflow-y-auto">
                {categoryTree.map((category) => {
                  const hasChildren = category.children && category.children.length > 0
                  const isActive = category.slug === currentCategorySlug || 
                    category.children?.some(child => child.slug === currentCategorySlug)

                  return (
                    <div key={category.id} className="py-1">
                      <Link
                        href={getUrl(getCategoryPath(category))}
                        className={`block py-2 text-sm font-medium ${
                          isActive ? "text-gray-900" : "text-gray-600"
                        }`}
                        style={isActive ? { color: themeColor } : undefined}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {category.name.toUpperCase()}
                      </Link>
                      {hasChildren && category.children?.map((child) => (
                        <Link
                          key={child.id}
                          href={getUrl(getCategoryPath(child, category.slug))}
                          className={`block py-1.5 pl-4 text-sm ${
                            child.slug === currentCategorySlug
                              ? "font-medium text-gray-900"
                              : "text-gray-600"
                          }`}
                          style={child.slug === currentCategorySlug ? { color: themeColor } : undefined}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )
                })}
              </div>
            </nav>
          )}
        </>
      )}
    </>
  )
}
