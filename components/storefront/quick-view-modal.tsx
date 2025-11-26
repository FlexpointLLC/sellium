"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
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
import { useCart } from "@/lib/cart-context"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

interface Product {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  image_url: string | null
  images: string[] | null
  description: string | null
  short_description?: string | null
  stock: number | null
  sku?: string | null
  category_id: string | null
  has_variants?: boolean
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

interface QuickViewModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  themeColor: string
  currency: string
  username: string
}

export function QuickViewModal({ 
  product, 
  isOpen, 
  onClose, 
  themeColor, 
  currency,
  username
}: QuickViewModalProps) {
  const supabase = createClient()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [addToCartHovered, setAddToCartHovered] = useState(false)
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})
  
  const { addItem, removeByProductId, isInCart } = useCart()

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setCurrentImageIndex(0)
      setQuantity(1)
      setVariants([])
      setSelectedVariant(null)
      setSelectedOptions({})
      setImageErrors({})
      
      // Fetch variants if product has variants
      if (product.has_variants) {
        fetchVariants(product.id)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  async function fetchVariants(productId: string) {
    setLoading(true)
    const { data: variantsData } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .eq("enabled", true)

    if (variantsData && variantsData.length > 0) {
      setVariants(variantsData)
      // Select first variant by default
      setSelectedVariant(variantsData[0])
      setSelectedOptions(variantsData[0].options || {})
    }
    setLoading(false)
  }

  if (!product) return null

  // Get all product images
  const productImages = product.images?.length 
    ? product.images 
    : product.image_url 
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
  const currentPrice = selectedVariant?.price ?? product.price ?? 0
  const currentComparePrice = selectedVariant?.compare_at_price ?? product.compare_at_price
  const currentStock = selectedVariant?.stock ?? product.stock ?? 0
  const isOutOfStock = currentStock <= 0

  const hasDiscount = currentComparePrice && currentComparePrice > currentPrice
  const discountPercent = hasDiscount 
    ? Math.round(((currentComparePrice - currentPrice) / currentComparePrice) * 100)
    : 0

  // Cart state
  const productInCart = isInCart(product.id, selectedVariant?.id)

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
    
    // Add to cart first if not already in cart
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
    
    // Close modal and redirect to checkout
    onClose()
    window.location.href = `/${username}/checkout`
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white">
        <VisuallyHidden>
          <DialogTitle>{product.name}</DialogTitle>
        </VisuallyHidden>
        
        <div className="grid md:grid-cols-2 gap-0">
          {/* Product Images */}
          <div className="relative bg-gray-100">
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden">
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
                  {hasDiscount && !isOutOfStock && (
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
              <div className="flex gap-2 p-4 overflow-x-auto bg-white">
                {productImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
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
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            <div className="space-y-5">
              {/* Title & SKU */}
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">{product.name}</h2>
                {(selectedVariant?.sku || product.sku) && (
                  <p className="text-sm text-gray-500 mt-1">SKU: {selectedVariant?.sku || product.sku}</p>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold" style={{ color: themeColor }}>
                  {formatPrice(currentPrice, currency)}
                </span>
                {hasDiscount && (
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(currentComparePrice, currency)}
                  </span>
                )}
                {hasDiscount && (
                  <span 
                    className="px-2 py-1 text-xs font-medium text-white rounded"
                    style={{ backgroundColor: themeColor }}
                  >
                    Save {discountPercent}%
                  </span>
                )}
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
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200">
                <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
                  <Truck className="h-6 w-6 text-gray-600 mb-1" />
                  <span className="text-xs text-gray-600">Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
                  <ShieldCheck className="h-6 w-6 text-gray-600 mb-1" />
                  <span className="text-xs text-gray-600">Secure Payment</span>
                </div>
                <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
                  <ArrowsClockwise className="h-6 w-6 text-gray-600 mb-1" />
                  <span className="text-xs text-gray-600">Easy Returns</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

