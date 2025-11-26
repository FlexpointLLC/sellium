"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { notFound } from "next/navigation"
import Link from "next/link"
import { 
  ShoppingBag,
  ShoppingCart,
  CaretLeft,
  CaretRight,
  Check,
  X
} from "phosphor-react"
import { CartProvider, useCart } from "@/lib/cart-context"
import { toast } from "sonner"
import { StorefrontHeader } from "@/components/storefront/header"
import { StorefrontFooter } from "@/components/storefront/footer"
import { FloatingButtons } from "@/components/storefront/floating-buttons"
import { QuickViewModal } from "@/components/storefront/quick-view-modal"
import { useStorefrontUrl } from "@/lib/use-storefront-url"
import { useStoreMeta } from "@/lib/use-store-meta"

interface Store {
  id: string
  name: string
  username: string
  description: string | null
  logo_url: string | null
  favicon_url: string | null
  banner_url: string | null
  banner_images: string[] | null  // Multiple banner images for slider
  meta_title: string | null
  meta_description: string | null
  theme_color: string | null
  currency: string  // Currency code (BDT, USD, EUR, etc.)
  social_links: {
    phone?: string
    whatsapp?: string
    instagram?: string
    facebook?: string
    email?: string
  } | null
  address: {
    street?: string
    city?: string
    state?: string
    country?: string
    postal_code?: string
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

interface Category {
  id: string
  name: string
  slug: string
  image_url: string | null
  parent_id: string | null
  product_count?: number
  children?: Category[]
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  image_url: string | null
  images: string[] | null  // Multiple product images
  description: string | null
  sku: string | null
  category_id: string | null
  category?: Category | null
  stock: number | null  // Stock quantity
  daily_sales?: number  // Number of sales today
  is_hot?: boolean  // Hot badge if daily_sales > 10
  has_variants?: boolean  // Whether product has variants
}

interface BannerSlide {
  id: number
  image_url: string
  title: string
  subtitle: string
  link: string
}

export default function StorefrontPage({ params }: { params: { username: string } }) {
  return (
    <CartProvider storeUsername={params.username}>
      <StorefrontContent params={params} />
    </CartProvider>
  )
}

function StorefrontContent({ params }: { params: { username: string } }) {
  const [store, setStore] = useState<Store | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productsByCategory, setProductsByCategory] = useState<Record<string, { name: string; slug: string; products: Product[] }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentSlide, setCurrentSlide] = useState(0)
  const { itemCount } = useCart()
  const { getUrl } = useStorefrontUrl(params.username)
  
  // Quick View Modal state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  
  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product)
    setIsQuickViewOpen(true)
  }

  // Demo banner slides (will be replaced with dynamic data later)
  const bannerSlides: BannerSlide[] = [
    {
      id: 1,
      image_url: "/placeholder-banner-1.jpg",
      title: "New Collection",
      subtitle: "Shop the latest arrivals",
      link: getUrl('/products')
    },
    {
      id: 2,
      image_url: "/placeholder-banner-2.jpg",
      title: "Special Offers",
      subtitle: "Up to 50% off",
      link: getUrl('/products')
    }
  ]

  useEffect(() => {
    async function fetchStore() {
      const supabase = createClient()
      
      // Fetch store from Supabase
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("username", params.username)
        .single()

      if (storeError || !storeData) {
        setError(true)
        setLoading(false)
        return
      }

      setStore({
        id: storeData.id,
        name: storeData.name || storeData.username,
        username: storeData.username,
        description: storeData.description || null,
        logo_url: storeData.logo_url || null,
        favicon_url: storeData.favicon_url || null,
        banner_url: storeData.banner_url || null,
        banner_images: storeData.banner_images || null,
        meta_title: storeData.meta_title || null,
        meta_description: storeData.meta_description || null,
        theme_color: storeData.theme_color || "#000000",
        currency: storeData.currency || "BDT",
        social_links: storeData.social_links || null,
        address: storeData.address || null
      })

      // Fetch categories for this store
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("store_id", storeData.id)
        .eq("status", "active")
        .order("sort_order", { ascending: true })

      if (categoriesData) {
        // Get product count for each category (including subcategory products for parent categories)
        const categoriesWithCount = await Promise.all(
          categoriesData.map(async (cat) => {
            // Find all child category IDs for this category
            const childCategoryIds = categoriesData
              .filter(c => c.parent_id === cat.id)
              .map(c => c.id)
            
            // Include this category and all its children
            const allCategoryIds = [cat.id, ...childCategoryIds]
            
            // Count products in this category and all subcategories
            const { count } = await supabase
              .from("products")
              .select("*", { count: "exact", head: true })
              .in("category_id", allCategoryIds)
              .eq("status", "active")
            
            return {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              image_url: cat.image_url || null,
              parent_id: cat.parent_id || null,
              product_count: count || 0
            }
          })
        )
        setCategories(categoriesWithCount)
      }

      // Fetch all active products for this store
      const { data: productsData } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(id, name, slug)
        `)
        .eq("store_id", storeData.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (productsData && productsData.length > 0) {
        // For products with variants, fetch variant stocks
        const formattedProducts = await Promise.all(productsData.map(async (p: any) => {
          let totalStock = p.stock !== undefined && p.stock !== null ? p.stock : 0
          let hasVariants = p.has_variants || false
          
          // Always check for variants (in case has_variants flag is incorrect)
          const { data: variants } = await supabase
            .from("product_variants")
            .select("stock, enabled")
            .eq("product_id", p.id)
            .eq("enabled", true)
          
          if (variants && variants.length > 0) {
            // Product has variants - calculate total stock from enabled variants
            hasVariants = true
            totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
          }
          
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            compare_at_price: p.compare_at_price,
            image_url: p.image_url || null,
            images: p.images || null,  // Include multiple images
            description: p.description || null,
            sku: p.sku || null,
            category_id: p.category_id,
            category: p.category,
            stock: totalStock,  // Stock quantity (from variants if applicable)
            daily_sales: p.daily_sales || 0,
            is_hot: (p.daily_sales || 0) > 10,  // Hot if more than 10 sales today
            has_variants: hasVariants
          }
        }))
        setProducts(formattedProducts)

        // Group products by category
        const grouped: Record<string, { name: string; slug: string; products: Product[] }> = {}
        formattedProducts.forEach((product: Product) => {
          if (product.category) {
            const catSlug = product.category.slug
            if (!grouped[catSlug]) {
              grouped[catSlug] = {
                name: product.category.name,
                slug: product.category.slug,
                products: []
              }
            }
            grouped[catSlug].products.push(product)
          }
        })
        setProductsByCategory(grouped)
      }

      setLoading(false)
    }

    fetchStore()
  }, [params.username])

  // Set custom favicon and meta tags
  useStoreMeta(store)

  // Auto-slide for banner - only if multiple images
  useEffect(() => {
    const bannerImages = store?.banner_images?.length 
      ? store.banner_images 
      : store?.banner_url 
        ? [store.banner_url] 
        : []
    
    if (bannerImages.length <= 1) return
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerImages.length)
    }, 4000) // Change slide every 4 seconds
    
    return () => clearInterval(timer)
  }, [store?.banner_images, store?.banner_url])

  function nextSlide() {
    setCurrentSlide((prev) => (prev + 1) % bannerSlides.length)
  }

  function prevSlide() {
    setCurrentSlide((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length)
  }

  function calculateDiscount(price: number, compareAt: number): number {
    return Math.round(((compareAt - price) / compareAt) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-gray-500">Loading store...</div>
      </div>
    )
  }

  if (error || !store) {
    notFound()
  }

  const themeColor = store.theme_color || "#000000"

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header & Categories Navigation */}
      <StorefrontHeader 
        store={store}
        categories={categories}
        username={params.username}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Image Slider / Banner */}
      {(() => {
        // Get all banner images - combine banner_images array with banner_url fallback
        const bannerImages = store.banner_images?.length 
          ? store.banner_images 
          : store.banner_url 
            ? [store.banner_url] 
            : []
        
        const hasMultipleImages = bannerImages.length > 1
        
        return (
          <section className="relative bg-gray-100">
            <div className="relative h-[300px] sm:h-[400px] md:h-[450px] overflow-hidden">
              {bannerImages.length > 0 ? (
                <>
                  {/* Banner Images - Slide Animation */}
                  <div 
                    className="flex h-full transition-transform duration-700 ease-in-out"
                    style={{ 
                      width: `${bannerImages.length * 100}%`,
                      transform: `translateX(-${currentSlide * (100 / bannerImages.length)}%)`
                    }}
                  >
                    {bannerImages.map((imageUrl, index) => (
                      <div 
                        key={index}
                        className="relative h-full flex-shrink-0"
                        style={{ width: `${100 / bannerImages.length}%` }}
                      >
                        <img 
                          src={imageUrl} 
                          alt={`${store.name} banner ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  
                  {/* Slider Navigation Arrows - Only show if multiple images */}
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={() => setCurrentSlide(prev => prev === 0 ? bannerImages.length - 1 : prev - 1)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full transition-colors z-10"
                      >
                        <CaretLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setCurrentSlide(prev => prev === bannerImages.length - 1 ? 0 : prev + 1)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full transition-colors z-10"
                      >
                        <CaretRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  
                  {/* Slider Navigation Dots - Only show if multiple images */}
                  {hasMultipleImages && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                      {bannerImages.map((_, index) => (
                        <button
                          key={index}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            currentSlide === index ? "bg-gray-800" : "bg-gray-400"
                          }`}
                          onClick={() => setCurrentSlide(index)}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // Placeholder when no banner images - just a clean gradient
                <div 
                  className="w-full h-full"
                  style={{ background: `linear-gradient(135deg, ${themeColor}15 0%, ${themeColor}30 100%)` }}
                />
              )}
            </div>
          </section>
        )
      })()}

      {/* Browse Categories - Only show parent categories when not searching */}
      {!searchQuery.trim() && categories.filter(c => !c.parent_id).length > 0 && (
        <section className="py-10 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-lg font-bold tracking-wide">BROWSE CATEGORIES</h2>
              <div className="flex-1 h-px bg-black/10" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.filter(c => !c.parent_id).map((category) => (
                <Link
                  key={category.id}
                  href={getUrl(`/category/${category.slug}`)}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100"
                >
                  {category.image_url ? (
                    <img 
                      src={category.image_url} 
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: `${themeColor}10` }}
                    >
                      <span className="text-2xl font-bold" style={{ color: themeColor }}>
                        {category.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-white font-medium text-sm">{category.name}</h3>
                    {category.product_count !== undefined && (
                      <p className="text-white/70 text-xs">{category.product_count} products</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Search Results */}
      {searchQuery.trim() && (
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-lg font-bold tracking-wide">
                Search Results for &quot;{searchQuery}&quot;
              </h2>
              <div className="flex-1 h-px bg-black/10" />
              <span className="text-sm text-gray-500">
                {(() => {
                  const filtered = products.filter(p => 
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  return `${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`
                })()}
              </span>
            </div>

            {(() => {
              const filteredProducts = products.filter(p => 
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
              )

              if (filteredProducts.length === 0) {
                return (
                  <div className="text-center py-16">
                    <p className="text-gray-500 mb-4">No products found matching &quot;{searchQuery}&quot;</p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-sm font-medium hover:underline"
                      style={{ color: themeColor }}
                    >
                      Clear search
                    </button>
                  </div>
                )
              }

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard 
                      key={product.id}
                      product={product} 
                      username={params.username}
                      themeColor={themeColor}
                      currency={store?.currency || "BDT"}
                      onQuickView={handleQuickView}
                      getUrl={getUrl}
                    />
                  ))}
                </div>
              )
            })()}
          </div>
        </section>
      )}

      {/* Products by Category - Only show when not searching */}
      {!searchQuery.trim() && Object.entries(productsByCategory).map(([categorySlug, categoryData]) => (
        <section key={categorySlug} className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-lg font-bold tracking-wide shrink-0">{categoryData.name.toUpperCase()}</h2>
              <div className="flex-1 h-px bg-black/10" />
              <Link 
                href={getUrl(`/category/${categoryData.slug}`)}
                className="text-sm font-medium hover:underline shrink-0"
                style={{ color: themeColor }}
              >
                SEE ALL
              </Link>
            </div>

            {/* Product Carousel */}
            <ProductCarousel 
              products={categoryData.products.slice(0, 12)} 
              username={params.username}
              themeColor={themeColor}
              currency={store?.currency || "BDT"}
              onQuickView={handleQuickView}
              getUrl={getUrl}
            />
          </div>
        </section>
      ))}

      {/* All Products (if no categories) - Only show when not searching */}
      {!searchQuery.trim() && Object.keys(productsByCategory).length === 0 && products.length > 0 && (
        <section className="py-10 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-lg font-bold tracking-wide">ALL PRODUCTS</h2>
              <div className="flex-1 h-px bg-black/10" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard 
                  key={product.id}
                  product={product} 
                  username={params.username}
                  themeColor={themeColor}
                  currency={store?.currency || "BDT"}
                  onQuickView={handleQuickView}
                  getUrl={getUrl}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-600 mb-2">No products yet</h2>
            <p className="text-gray-400">Check back soon for new arrivals!</p>
          </div>
        </section>
      )}

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
        currency={store.currency}
      />

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        themeColor={themeColor}
        currency={store.currency}
        username={params.username}
      />
    </div>
  )
}

// Product Carousel Component with scroll arrows
function ProductCarousel({ 
  products, 
  username, 
  themeColor,
  currency = "BDT",
  onQuickView,
  getUrl
}: { 
  products: Product[]
  username: string
  themeColor: string
  currency?: string
  onQuickView?: (product: Product) => void
  getUrl: (path?: string) => string
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  // Check scroll position to show/hide arrows
  const checkScrollPosition = () => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    setShowLeftArrow(scrollLeft > 0)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScrollPosition()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScrollPosition)
      // Also check on resize
      window.addEventListener('resize', checkScrollPosition)
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScrollPosition)
      }
      window.removeEventListener('resize', checkScrollPosition)
    }
  }, [products])

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const cardWidth = 220 + 16 // card width + gap
    const scrollAmount = cardWidth * 3 // Scroll 3 cards at a time
    
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  return (
    <div className="relative">
      {/* Scroll Container */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-4 scroll-smooth px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {products.map((product) => (
          <div key={product.id} className="flex-shrink-0 w-[220px]">
            <ProductCard 
              product={product} 
              username={username}
              themeColor={themeColor}
              currency={currency}
              onQuickView={onQuickView}
              getUrl={getUrl}
            />
          </div>
        ))}
      </div>
      
      {/* Left Arrow - Show when can scroll left */}
      {showLeftArrow && (
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-all z-20 border border-gray-200"
        >
          <CaretLeft className="h-5 w-5 text-gray-700" />
        </button>
      )}
      
      {/* Right Arrow - Show when can scroll right */}
      {showRightArrow && (
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-all z-20 border border-gray-200"
        >
          <CaretRight className="h-5 w-5 text-gray-700" />
        </button>
      )}
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
  const [isAdding, setIsAdding] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})
  const { addItem, removeByProductId, isInCart } = useCart()
  
  // Get all product images - combine images array with image_url fallback
  const productImages = product.images?.length 
    ? product.images 
    : product.image_url 
      ? [product.image_url] 
      : []
  
  const hasMultipleImages = productImages.length > 1
  
  // Auto-slide for product images
  useEffect(() => {
    if (!hasMultipleImages) return
    
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % productImages.length)
    }, 3000) // Change image every 3 seconds
    
    return () => clearInterval(timer)
  }, [hasMultipleImages, productImages.length])
  
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
  const discountPercent = hasDiscount 
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0
  // For products with variants, don't show out of stock on the card - let user view variants
  // Only show out of stock for simple products (no variants) with 0 or less stock
  const isOutOfStock = !product.has_variants && product.stock !== null && product.stock !== undefined && product.stock <= 0
  const inCart = isInCart(product.id)

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isOutOfStock || isAdding) return
    
    // If product has variants and not in cart, open quick view to select variant
    if (product.has_variants && !inCart) {
      onQuickView?.(product)
      return
    }
    
    setIsAdding(true)
    
    if (inCart) {
      // Remove from cart
      removeByProductId(product.id, undefined)
      toast.success(`${product.name} removed from cart`)
    } else {
      // Add to cart (for products without variants)
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        compareAtPrice: product.compare_at_price || undefined,
        quantity: 1,
        image: productImages[0] || null,
        stock: product.stock || 0,
        sku: product.sku || undefined
      })
      toast.success(`${product.name} added to cart`)
    }
    
    setTimeout(() => setIsAdding(false), 500)
  }

  return (
    <div className={`group bg-white border border-black/10 rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${isOutOfStock ? 'opacity-75' : ''}`}>
      <Link href={getUrl(`/products/${product.slug || product.id}`)}>
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {productImages.length > 0 ? (
            <>
              {productImages.map((imageUrl, index) => (
                imageErrors[index] ? (
                  <div 
                    key={index}
                    className={`absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100 transition-opacity duration-500 ${
                      currentImageIndex === index ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <ShoppingBag className="h-12 w-12 text-gray-300" />
                  </div>
                ) : (
                  <img 
                    key={index}
                    src={imageUrl} 
                    alt={`${product.name} ${index + 1}`}
                    onError={() => setImageErrors(prev => ({ ...prev, [index]: true }))}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                      currentImageIndex === index ? "opacity-100" : "opacity-0"
                    } ${isOutOfStock ? 'grayscale' : ''}`}
                  />
                )
              ))}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-gray-300" />
            </div>
          )}
          
          {/* Stock Out Badge - Priority over discount badge */}
          {isOutOfStock ? (
            <div className="absolute top-2 left-2 px-2 py-1 text-xs font-bold text-white bg-gray-600 rounded z-10">
              STOCK OUT
            </div>
          ) : hasDiscount ? (
            /* Discount Badge */
            <div 
              className="absolute top-2 left-2 px-2 py-1 text-xs font-bold text-white rounded z-10"
              style={{ backgroundColor: themeColor }}
            >
              {discountPercent} BDT OFF
            </div>
          ) : null}

          {/* Hot Badge - Show if product has more than 10 daily sales */}
          {product.is_hot && !isOutOfStock && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded z-10 flex items-center gap-1">
              🔥 HOT
            </div>
          )}
          
          {/* Image Dots - Only show if multiple images */}
          {hasMultipleImages && (
            <div className="absolute bottom-2 left-2 flex gap-1 z-10">
              {productImages.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    currentImageIndex === index ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </Link>

      <div className="p-3">
        <Link href={getUrl(`/products/${product.slug || product.id}`)}>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-gray-600 transition-colors">
            {product.name.toUpperCase()}
          </h3>
        </Link>
        
        <div className="mt-2 flex items-center gap-2">
          <span className="font-bold" style={{ color: isOutOfStock ? '#9ca3af' : themeColor }}>
            {formatPrice(product.price, currency)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.compare_at_price!, currency)}
            </span>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <button 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onQuickView?.(product)
            }}
            className={`${isOutOfStock ? 'flex-1' : ''} py-2 px-3 text-sm font-medium border border-black/10 rounded hover:bg-gray-50 transition-colors`}
          >
            Quick View
          </button>
          {!isOutOfStock && (
            <button 
              onClick={handleCartClick}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`flex-1 py-2 text-sm font-medium text-white rounded transition-all flex items-center justify-center ${isAdding ? 'scale-95' : ''}`}
              style={{ backgroundColor: inCart ? (isHovered ? '#ef4444' : '#22c55e') : themeColor }}
            >
              {inCart ? (
                isHovered ? <X className="h-5 w-5" /> : <Check className="h-5 w-5" />
              ) : (
                <ShoppingCart className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
