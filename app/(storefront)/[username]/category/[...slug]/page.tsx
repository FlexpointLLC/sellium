"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ShoppingBag, ShoppingCart, Check, Funnel, X } from "phosphor-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CartProvider, useCart } from "@/lib/cart-context"
import { toast } from "sonner"
import { StorefrontHeader } from "@/components/storefront/header"
import { StorefrontFooter } from "@/components/storefront/footer"
import { FloatingButtons } from "@/components/storefront/floating-buttons"
import { QuickViewModal } from "@/components/storefront/quick-view-modal"
import { useStorefrontUrl } from "@/lib/use-storefront-url"
import { useStoreMeta } from "@/lib/use-store-meta"

interface Product {
  id: string
  name: string
  slug: string | null
  price: number
  compare_at_price: number | null
  image_url: string | null
  images: string[] | null
  stock: number
  daily_sales: number | null
  category_id: string | null
}

interface ProductsBySubcategory {
  category: Category
  products: Product[]
}

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  parent_id?: string | null
  children?: Category[]
}

interface Store {
  id: string
  name: string
  username: string
  logo_url: string | null
  theme_color: string
  currency: string
  favicon_url: string | null
  meta_title: string | null
  meta_description: string | null
  description: string | null
  social_links?: {
    phone?: string
    whatsapp?: string
    instagram?: string
    facebook?: string
    email?: string
  } | null
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
  } | null
}

// Currency symbols mapping
const currencySymbols: Record<string, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹"
}

function formatPrice(price: number, currency: string): string {
  const symbol = currencySymbols[currency] || currency
  return `${symbol} ${price.toFixed(2)}`
}

export default function CategoryPage({
  params,
}: {
  params: { username: string; slug: string[] }
}) {
  return (
    <CartProvider storeUsername={params.username}>
      <CategoryContent params={params} />
    </CartProvider>
  )
}

function CategoryContent({
  params,
}: {
  params: { username: string; slug: string[] }
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<Store | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [parentCategory, setParentCategory] = useState<Category | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productsBySubcategory, setProductsBySubcategory] = useState<ProductsBySubcategory[]>([])
  const [isParentCategory, setIsParentCategory] = useState(false)
  const [sortBy, setSortBy] = useState("newest")
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState(false)
  const { getUrl } = useStorefrontUrl(params.username)
  
  // Set custom favicon and meta tags
  useStoreMeta(store)
  
  // Parse the slug array - can be [parent] or [parent, child]
  const slugParts = params.slug
  const isNestedCategory = slugParts.length > 1
  const parentSlug = slugParts[0]
  const childSlug = isNestedCategory ? slugParts[1] : null
  const currentSlug = childSlug || parentSlug
  
  // Quick View Modal state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  
  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product)
    setIsQuickViewOpen(true)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.username, params.slug])

  async function fetchData() {
    // Fetch store
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("id, name, username, logo_url, theme_color, currency, social_links, address, favicon_url, meta_title, meta_description, description")
      .eq("username", params.username)
      .single()

    if (storeError || !storeData) {
      setError(true)
      setLoading(false)
      return
    }

    setStore({
      ...storeData,
      currency: storeData.currency || "BDT"
    })

    // Fetch all categories for navigation
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name, slug, description, image_url, parent_id")
      .eq("store_id", storeData.id)
      .eq("status", "active")
      .order("sort_order", { ascending: true })

    if (categoriesData) {
      setCategories(categoriesData)
    }

    // Find the current category based on URL structure
    let currentCategory: Category | null = null
    let foundParentCategory: Category | null = null

    if (isNestedCategory && childSlug) {
      // Nested category: /category/parent-slug/child-slug
      foundParentCategory = categoriesData?.find(c => c.slug === parentSlug) || null
      if (foundParentCategory) {
        currentCategory = categoriesData?.find(c => 
          c.slug === childSlug && c.parent_id === foundParentCategory!.id
        ) || null
      }
    } else {
      // Single category: /category/slug
      currentCategory = categoriesData?.find(c => c.slug === parentSlug) || null
      // Check if this category has a parent
      if (currentCategory?.parent_id) {
        foundParentCategory = categoriesData?.find(c => c.id === currentCategory!.parent_id) || null
      }
    }

    if (!currentCategory) {
      setError(true)
      setLoading(false)
      return
    }

    setCategory(currentCategory)
    setParentCategory(foundParentCategory)

    // Check if this category has children (is a parent category)
    const childCategories = categoriesData?.filter(c => c.parent_id === currentCategory.id) || []
    const hasChildren = childCategories.length > 0
    setIsParentCategory(hasChildren)

    if (hasChildren) {
      // This is a parent category - fetch products from parent AND all subcategories
      const allCategoryIds = [currentCategory.id, ...childCategories.map(c => c.id)]
      
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeData.id)
        .in("category_id", allCategoryIds)

      if (productsData) {
        setProducts(productsData)
        
        // Group products by subcategory
        const grouped: ProductsBySubcategory[] = []
        
        // First, add products directly in parent category (if any)
        const parentProducts = productsData.filter(p => p.category_id === currentCategory.id)
        if (parentProducts.length > 0) {
          grouped.push({
            category: currentCategory,
            products: parentProducts
          })
        }
        
        // Then add products from each subcategory
        childCategories.forEach(subcat => {
          const subcatProducts = productsData.filter(p => p.category_id === subcat.id)
          if (subcatProducts.length > 0) {
            grouped.push({
              category: subcat,
              products: subcatProducts
            })
          }
        })
        
        setProductsBySubcategory(grouped)
      }
    } else {
      // Regular category (no children) - fetch only its products
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeData.id)
        .eq("category_id", currentCategory.id)

      if (productsData) {
        setProducts(productsData)
      }
      setProductsBySubcategory([])
    }

    setLoading(false)
  }

  // Sort products
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price
      case "price-high":
        return b.price - a.price
      case "name-az":
        return a.name.localeCompare(b.name)
      case "name-za":
        return b.name.localeCompare(a.name)
      case "newest":
      default:
        return 0 // Keep original order (newest first from DB)
    }
  })

  // Filter by search
  const filteredProducts = sortedProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const themeColor = store?.theme_color || "#4F46E5"

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-square bg-gray-200 rounded-lg" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !store || !category) {
    return notFound()
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header & Categories Navigation */}
      <StorefrontHeader 
        store={store}
        categories={categories}
        username={params.username}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentCategorySlug={currentSlug}
      />

      {/* Breadcrumb */}
      <div className="border-b border-black/10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href={getUrl()} className="hover:text-gray-900">Home</Link>
            <span>/</span>
            {parentCategory ? (
              <>
                <Link 
                  href={getUrl(`/category/${parentCategory.slug}`)} 
                  className="hover:text-gray-900"
                >
                  {parentCategory.name}
                </Link>
                <span>/</span>
                <span className="text-gray-900">{category.name}</span>
              </>
            ) : (
              <span className="text-gray-900">{category.name}</span>
            )}
          </nav>
        </div>
      </div>

      {/* Category Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
            {category.description && (
              <p className="mt-1 text-gray-600">{category.description}</p>
            )}
            <p className="mt-2 text-sm text-gray-500">{filteredProducts.length} products</p>
          </div>

          {/* Sort & Filter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Funnel className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Sort by:</span>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-9 bg-white border-gray-200 text-gray-900">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900">
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name-az">Name: A to Z</SelectItem>
                <SelectItem value="name-za">Name: Z to A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No products found in this category.</p>
            <Link 
              href={getUrl()}
              className="mt-4 inline-block text-sm font-medium hover:underline"
              style={{ color: themeColor }}
            >
              Browse all products
            </Link>
          </div>
        ) : isParentCategory && productsBySubcategory.length > 0 ? (
          // Parent category view - show products grouped by subcategory
          <div className="space-y-12">
            {productsBySubcategory.map((group) => {
              // Filter and sort products for this group
              const groupProducts = group.products
                .filter(product => product.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .sort((a, b) => {
                  switch (sortBy) {
                    case "price-low": return a.price - b.price
                    case "price-high": return b.price - a.price
                    case "name-az": return a.name.localeCompare(b.name)
                    case "name-za": return b.name.localeCompare(a.name)
                    default: return 0
                  }
                })
              
              if (groupProducts.length === 0) return null
              
              return (
                <div key={group.category.id}>
                  {/* Subcategory Title */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-gray-900">{group.category.name}</h2>
                      <span className="text-sm text-gray-500">({groupProducts.length} products)</span>
                    </div>
                    {group.category.id !== category?.id && (
                      <Link
                        href={getUrl(`/category/${category?.slug}/${group.category.slug}`)}
                        className="text-sm font-medium hover:underline"
                        style={{ color: themeColor }}
                      >
                        View All →
                      </Link>
                    )}
                  </div>
                  
                  {/* Products Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {groupProducts.map((product) => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        username={params.username}
                        themeColor={themeColor}
                        onQuickView={handleQuickView}
                        getUrl={getUrl}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          // Regular category view - simple grid
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                username={params.username}
                themeColor={themeColor}
                onQuickView={handleQuickView}
                getUrl={getUrl}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <StorefrontFooter 
        store={store}
        categories={categories}
        username={params.username}
      />

      {/* Floating Buttons */}
      <FloatingButtons 
        username={params.username}
        themeColor={themeColor}
        whatsappNumber={store.social_links?.whatsapp}
      />

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct as any}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        themeColor={themeColor}
        currency={store.currency}
        username={params.username}
      />
    </div>
  )
}

// Product Card Component
function ProductCard({ 
  product, 
  username,
  themeColor,
  currency = "BDT",
  onQuickView,
  getUrl
}: { 
  product: Product
  username: string
  themeColor: string
  currency?: string
  onQuickView?: (product: Product) => void
  getUrl: (path?: string) => string
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const { addItem, removeByProductId, isInCart } = useCart()
  
  const productImages = product.images && product.images.length > 0 
    ? product.images 
    : product.image_url 
      ? [product.image_url] 
      : []

  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
  const discountPercent = hasDiscount 
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0
  const isOutOfStock = product.stock === null || product.stock === undefined || product.stock <= 0
  const isHot = (product.daily_sales || 0) > 10
  const inCart = isInCart(product.id)

  // Auto-rotate images
  useEffect(() => {
    if (productImages.length <= 1) return
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % productImages.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [productImages.length])

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (inCart) {
      // Remove by productId (no variant for default)
      removeByProductId(product.id, undefined)
      toast.success(`${product.name} removed from cart`)
    } else {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        compareAtPrice: product.compare_at_price || undefined,
        quantity: 1,
        image: productImages[0] || null,
        stock: product.stock || 0
      })
      toast.success(`${product.name} added to cart`)
    }
  }

  return (
    <div className={`group bg-white border border-black/10 rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${isOutOfStock ? 'opacity-75' : ''}`}>
      <Link href={getUrl(`/products/${product.slug || product.id}`)}>
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {productImages.length > 0 ? (
            <>
              {productImages.map((imageUrl, index) => (
                <img 
                  key={index}
                  src={imageUrl} 
                  alt={`${product.name} ${index + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    currentImageIndex === index ? "opacity-100" : "opacity-0"
                  } ${isOutOfStock ? 'grayscale' : ''}`}
                />
              ))}
              {/* Image indicators */}
              {productImages.length > 1 && (
                <div className="absolute bottom-2 left-2 flex gap-1">
                  {productImages.map((_, index) => (
                    <div 
                      key={index}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        currentImageIndex === index ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="h-12 w-12 text-gray-300" />
            </div>
          )}

          {/* Badges */}
          {isOutOfStock ? (
            <div className="absolute top-2 left-2 bg-gray-800 text-white text-xs font-medium px-2 py-1 rounded">
              STOCK OUT
            </div>
          ) : hasDiscount ? (
            <div 
              className="absolute top-2 left-2 text-white text-xs font-medium px-2 py-1 rounded"
              style={{ backgroundColor: themeColor }}
            >
              {discountPercent}% OFF
            </div>
          ) : null}

          {/* Hot badge */}
          {!isOutOfStock && isHot && (
            <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded">
              🔥 HOT
            </div>
          )}
        </div>
      </Link>

      <div className="p-3">
        <Link href={getUrl(`/products/${product.slug || product.id}`)}>
          <h3 className="font-medium text-gray-900 truncate hover:underline">
            {product.name.toUpperCase()}
          </h3>
        </Link>

        <div className="mt-1 flex items-center gap-2">
          <span 
            className={`font-bold ${isOutOfStock ? 'text-gray-400' : ''}`}
            style={{ color: isOutOfStock ? undefined : themeColor }}
          >
            {formatPrice(product.price, currency)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.compare_at_price!, currency)}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex gap-2">
          <button 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onQuickView?.(product)
            }}
            className="flex-1 py-2 text-sm font-medium text-center border border-black/10 rounded hover:bg-gray-50 transition-colors"
          >
            Quick View
          </button>
          {!isOutOfStock && (
            <button 
              onClick={handleCartClick}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="flex-1 py-2 text-sm font-medium text-white rounded transition-all flex items-center justify-center"
              style={{ backgroundColor: inCart ? (isHovered ? '#ef4444' : '#22c55e') : themeColor }}
            >
              {inCart ? (
                isHovered ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

