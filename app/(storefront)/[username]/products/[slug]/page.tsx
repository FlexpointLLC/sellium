"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { notFound } from "next/navigation"
import Link from "next/link"
import { 
  ShoppingCart,
  CaretLeft,
  CaretRight,
  Heart,
  ShareNetwork,
  Truck,
  ShieldCheck,
  ArrowsClockwise,
  Minus,
  Plus,
  Check,
  X,
  ShoppingBag
} from "phosphor-react"
import { Button } from "@/components/ui/button"
import { CartProvider, useCart } from "@/lib/cart-context"
import { toast } from "sonner"
import { StorefrontHeader } from "@/components/storefront/header"
import { StorefrontFooter } from "@/components/storefront/footer"
import { FloatingButtons } from "@/components/storefront/floating-buttons"
import { useStorefrontUrl } from "@/lib/use-storefront-url"

interface Product {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  image_url: string | null
  images: string[] | null
  description: string | null
  short_description: string | null
  stock: number | null
  sku: string | null
  category_id: string | null
  category?: { id: string; name: string; slug: string } | null
  has_variants: boolean
  store_id: string
}

interface ProductVariant {
  id: string
  title: string
  options: Record<string, string>
  price: number
  compare_at_price: number | null
  stock: number
  sku: string | null
  enabled: boolean
}

interface Store {
  id: string
  name: string
  username: string
  logo_url: string | null
  theme_color: string
  currency: string
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

interface Category {
  id: string
  name: string
  slug: string
  parent_id?: string | null
  children?: Category[]
}

export default function ProductDetailPage({ 
  params 
}: { 
  params: { username: string; slug: string } 
}) {
  return (
    <CartProvider storeUsername={params.username}>
      <ProductDetailContent params={params} />
    </CartProvider>
  )
}

function ProductDetailContent({ 
  params 
}: { 
  params: { username: string; slug: string } 
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState(false)
  const { getUrl } = useStorefrontUrl(params.username)
  const [searchQuery, setSearchQuery] = useState("")
  const { addItem, removeByProductId, isInCart } = useCart()
  const [addToCartHovered, setAddToCartHovered] = useState(false)
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})

  useEffect(() => {
    fetchProduct()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.username, params.slug])

  async function fetchProduct() {
    // Fetch store by username
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("id, name, username, logo_url, theme_color, currency, social_links, address")
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

    // Fetch categories for this store (include parent_id for nested dropdowns)
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name, slug, parent_id")
      .eq("store_id", storeData.id)
      .eq("status", "active")
      .order("sort_order", { ascending: true })

    if (categoriesData) {
      setCategories(categoriesData.map(cat => ({
        ...cat,
        parent_id: cat.parent_id || null
      })))
    }

    // Fetch product by slug
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select(`
        *,
        category:categories(id, name, slug)
      `)
      .eq("store_id", storeData.id)
      .eq("slug", params.slug)
      .maybeSingle()

    let foundProduct = productData

    if (!foundProduct) {
      // Try fetching by ID if slug doesn't match (only if it looks like a UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(params.slug)) {
        const { data: productById } = await supabase
          .from("products")
          .select(`
            *,
            category:categories(id, name, slug)
          `)
          .eq("store_id", storeData.id)
          .eq("id", params.slug)
          .maybeSingle()
        
        foundProduct = productById
      }
    }

    if (!foundProduct) {
      // Try fetching by name-based slug (convert slug back to possible name)
      // e.g., "polo-panjabi" -> search for products with name containing "polo" and "panjabi"
      const searchTerms = params.slug.split('-').filter(term => term.length > 0)
      if (searchTerms.length > 0) {
        const { data: productsByName } = await supabase
          .from("products")
          .select(`
            *,
            category:categories(id, name, slug)
          `)
          .eq("store_id", storeData.id)
          .ilike("name", `%${searchTerms.join('%')}%`)
          .limit(1)
        
        if (productsByName && productsByName.length > 0) {
          foundProduct = productsByName[0]
        }
      }
    }

    if (!foundProduct) {
      setError(true)
      setLoading(false)
      return
    }

    setProduct(foundProduct)
      
    // Fetch variants if product has variants
    // Also check for variants even if has_variants is false (in case of data inconsistency)
    const { data: variantsData } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", foundProduct.id)
      .eq("enabled", true)
      .order("created_at", { ascending: true })

    if (variantsData && variantsData.length > 0) {
      setVariants(variantsData)
      // Select first variant by default
      setSelectedVariant(variantsData[0])
      setSelectedOptions(variantsData[0].options || {})
    }

    setLoading(false)
  }

  // Get all product images
  const productImages = product?.images?.length 
    ? product.images 
    : product?.image_url 
      ? [product.image_url] 
      : []

  // Get unique option names and values from variants
  const optionGroups: Record<string, string[]> = {}
  variants.forEach(variant => {
    if (variant.options) {
      Object.entries(variant.options).forEach(([key, value]) => {
        if (!optionGroups[key]) {
          optionGroups[key] = []
        }
        if (!optionGroups[key].includes(value)) {
          optionGroups[key].push(value)
        }
      })
    }
  })

  // Find matching variant based on selected options
  const findMatchingVariant = (options: Record<string, string>) => {
    return variants.find(variant => {
      if (!variant.options) return false
      return Object.entries(options).every(
        ([key, value]) => variant.options[key] === value
      )
    })
  }

  // Handle option selection
  const handleOptionSelect = (optionName: string, value: string) => {
    const newOptions = { ...selectedOptions, [optionName]: value }
    setSelectedOptions(newOptions)
    
    const matchingVariant = findMatchingVariant(newOptions)
    if (matchingVariant) {
      setSelectedVariant(matchingVariant)
    }
  }

  // Get current price and stock
  const currentPrice = selectedVariant?.price ?? product?.price ?? 0
  const currentComparePrice = selectedVariant?.compare_at_price ?? product?.compare_at_price
  const currentStock = selectedVariant?.stock ?? product?.stock ?? 0
  const isOutOfStock = currentStock <= 0

  const hasDiscount = currentComparePrice && currentComparePrice > currentPrice
  const discountPercent = hasDiscount 
    ? Math.round(((currentComparePrice - currentPrice) / currentComparePrice) * 100)
    : 0

  const themeColor = store?.theme_color || "#4F46E5"

  // Cart state
  const productInCart = isInCart(product?.id || "", selectedVariant?.id)

  const router = useRouter()

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return

    if (productInCart) {
      // Remove from cart
      removeByProductId(product.id, selectedVariant?.id)
      toast.success(`${product.name} removed from cart`)
    } else {
      // Add to cart
      addItem({
        productId: product.id,
        variantId: selectedVariant?.id,
        name: product.name,
        variantTitle: selectedVariant?.title,
        price: currentPrice,
        compareAtPrice: currentComparePrice || undefined,
        quantity: quantity,
        image: productImages[0] || null,
        stock: currentStock,
        sku: selectedVariant?.sku || product.sku || undefined
      })
      toast.success(`${product.name} added to cart`)
    }
  }

  const handleBuyNow = () => {
    if (!product || isOutOfStock) return

    // Add to cart if not already in cart
    if (!productInCart) {
      addItem({
        productId: product.id,
        variantId: selectedVariant?.id,
        name: product.name,
        variantTitle: selectedVariant?.title,
        price: currentPrice,
        compareAtPrice: currentComparePrice || undefined,
        quantity: quantity,
        image: productImages[0] || null,
        stock: currentStock,
        sku: selectedVariant?.sku || product.sku || undefined
      })
    }

    // Navigate to checkout
    router.push(getUrl('/checkout'))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="aspect-square bg-gray-200 rounded-lg" />
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-6 bg-gray-200 rounded w-1/4" />
                <div className="h-24 bg-gray-200 rounded" />
                <div className="h-12 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product || !store) {
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
      />

      {/* Breadcrumb */}
      <div className="border-b border-black/10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href={getUrl()} className="hover:text-gray-900">Home</Link>
            <span>/</span>
            {product.category && (
              <>
                <Link 
                  href={getUrl(`/category/${product.category.slug}`)}
                  className="hover:text-gray-900"
                >
                  {product.category.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-gray-900">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {productImages.length > 0 && !imageErrors[currentImageIndex] ? (
                <>
                  <img 
                    src={productImages[currentImageIndex]} 
                    alt={product.name}
                    onError={() => setImageErrors(prev => ({ ...prev, [currentImageIndex]: true }))}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Navigation Arrows */}
                  {productImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex(prev => prev === 0 ? productImages.length - 1 : prev - 1)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors"
                      >
                        <CaretLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex(prev => prev === productImages.length - 1 ? 0 : prev + 1)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors"
                      >
                        <CaretRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  {/* Discount Badge */}
                  {hasDiscount && (
                    <div 
                      className="absolute top-4 left-4 px-3 py-1 text-sm font-bold text-white rounded"
                      style={{ backgroundColor: themeColor }}
                    >
                      {discountPercent}% OFF
                    </div>
                  )}

                  {/* Stock Out Badge */}
                  {isOutOfStock && (
                    <div className="absolute top-4 left-4 px-3 py-1 text-sm font-bold text-white bg-gray-600 rounded">
                      STOCK OUT
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="h-24 w-24 text-gray-300" />
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {productImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      currentImageIndex === index 
                        ? 'border-gray-900' 
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    {imageErrors[index] ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <ShoppingBag className="h-6 w-6 text-gray-300" />
                      </div>
                    ) : (
                      <img 
                        src={image} 
                        alt={`${product.name} ${index + 1}`} 
                        onError={() => setImageErrors(prev => ({ ...prev, [index]: true }))}
                        className="w-full h-full object-cover" 
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title & Price */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{product.name}</h1>
              
              {product.sku && (
                <p className="text-sm text-gray-500 mt-1">SKU: {selectedVariant?.sku || product.sku}</p>
              )}

              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-bold" style={{ color: themeColor }}>
                  {formatPrice(currentPrice, store?.currency || "BDT")}
                </span>
                {hasDiscount && (
                  <span className="text-xl text-gray-400 line-through">
                    {formatPrice(currentComparePrice, store?.currency || "BDT")}
                  </span>
                )}
                {hasDiscount && (
                  <span 
                    className="px-2 py-1 text-sm font-medium text-white rounded"
                    style={{ backgroundColor: themeColor }}
                  >
                    Save {discountPercent}%
                  </span>
                )}
              </div>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {isOutOfStock ? (
                <>
                  <X className="h-5 w-5 text-red-500" />
                  <span className="text-red-500 font-medium">Out of Stock</span>
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-green-600 font-medium">
                    In Stock {currentStock > 0 && currentStock <= 10 && `(Only ${currentStock} left)`}
                  </span>
                </>
              )}
            </div>

            {/* Short Description */}
            {product.short_description && (
              <p className="text-gray-600">{product.short_description}</p>
            )}

            {/* Variant Options */}
            {Object.keys(optionGroups).length > 0 && (
              <div className="space-y-4">
                {Object.entries(optionGroups).map(([optionName, values]) => (
                  <div key={optionName}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {optionName}: <span className="font-normal">{selectedOptions[optionName]}</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {values.map((value) => {
                        const isSelected = selectedOptions[optionName] === value
                        // Check if this option combination is available
                        const testOptions = { ...selectedOptions, [optionName]: value }
                        const matchingVariant = findMatchingVariant(testOptions)
                        const isAvailable = matchingVariant && matchingVariant.stock > 0

                        return (
                          <button
                            key={value}
                            onClick={() => handleOptionSelect(optionName, value)}
                            disabled={!matchingVariant}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                              isSelected
                                ? 'border-gray-900 bg-gray-900 text-white'
                                : !matchingVariant
                                  ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                                  : !isAvailable
                                    ? 'border-gray-200 text-gray-400 bg-white line-through'
                                    : 'border-gray-300 text-gray-700 bg-white hover:border-gray-900'
                            }`}
                          >
                            {value}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-gray-100 transition-colors text-gray-700"
                    disabled={isOutOfStock}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-medium text-gray-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(currentStock || 99, quantity + 1))}
                    className="p-3 hover:bg-gray-100 transition-colors text-gray-700"
                    disabled={isOutOfStock || quantity >= currentStock}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {currentStock > 0 && currentStock <= 10 && (
                  <span className="text-sm text-orange-600">Only {currentStock} available</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                onMouseEnter={() => setAddToCartHovered(true)}
                onMouseLeave={() => setAddToCartHovered(false)}
                className="flex-1 h-12 text-base text-white transition-all"
                style={{ 
                  backgroundColor: isOutOfStock 
                    ? '#9ca3af' 
                    : productInCart 
                      ? (addToCartHovered ? '#ef4444' : '#22c55e')
                      : themeColor 
                }}
                disabled={isOutOfStock}
              >
                {productInCart ? (
                  addToCartHovered ? (
                    <>
                      <X className="h-5 w-5 mr-2" />
                      Remove from Cart
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Added to Cart
                    </>
                  )
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>
              <button
                onClick={handleBuyNow}
                className="flex-1 h-12 text-base font-medium border-2 rounded-md transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: themeColor, color: themeColor }}
                disabled={isOutOfStock}
              >
                Buy Now
              </button>
            </div>

            {/* Wishlist & Share */}
            <div className="flex gap-4 pt-2">
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Heart className="h-5 w-5" />
                <span className="text-sm">Add to Wishlist</span>
              </button>
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ShareNetwork className="h-5 w-5" />
                <span className="text-sm">Share</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
                <Truck className="h-8 w-8 text-gray-600 mb-2" />
                <span className="text-xs text-gray-600">Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
                <ShieldCheck className="h-8 w-8 text-gray-600 mb-2" />
                <span className="text-xs text-gray-600">Secure Payment</span>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
                <ArrowsClockwise className="h-8 w-8 text-gray-600 mb-2" />
                <span className="text-xs text-gray-600">Easy Returns</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        {product.description && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Product Description</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 whitespace-pre-wrap">{product.description}</p>
            </div>
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
    </div>
  )
}

