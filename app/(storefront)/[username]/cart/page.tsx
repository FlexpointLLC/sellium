"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { notFound } from "next/navigation"
import Link from "next/link"
import { 
  ShoppingBag,
  Minus,
  Plus,
  Trash,
  ArrowLeft
} from "phosphor-react"
import { Button } from "@/components/ui/button"
import { CartProvider, useCart } from "@/lib/cart-context"
import { StorefrontHeader } from "@/components/storefront/header"
import { StorefrontFooter } from "@/components/storefront/footer"
import { FloatingButtons } from "@/components/storefront/floating-buttons"
import { useStorefrontUrl } from "@/lib/use-storefront-url"

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

interface Category {
  id: string
  name: string
  slug: string
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

export default function CartPage({ params }: { params: { username: string } }) {
  return (
    <CartProvider storeUsername={params.username}>
      <CartContent params={params} />
    </CartProvider>
  )
}

function CartContent({ params }: { params: { username: string } }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<Store | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { getUrl } = useStorefrontUrl(params.username)
  
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useCart()

  useEffect(() => {
    fetchStore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.username])

  async function fetchStore() {
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

    // Fetch categories for navigation
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("store_id", storeData.id)
      .eq("status", "active")
      .order("sort_order", { ascending: true })

    if (categoriesData) {
      setCategories(categoriesData)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error || !store) {
    notFound()
  }

  const themeColor = store.theme_color || "#000000"
  const currency = store.currency || "BDT"

  // Calculate totals
  const shipping = 0 // Free shipping or calculate based on rules
  const tax = 0 // Calculate based on tax rules
  const total = subtotal + shipping + tax

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
      <div className="bg-gray-50 border-b border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link href={getUrl()} className="text-gray-500 hover:text-gray-700">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">Shopping Cart</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          {items.length > 0 && (
            <button 
              onClick={clearCart}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              Clear Cart
            </button>
          )}
        </div>

        {items.length === 0 ? (
          /* Empty Cart */
          <div className="text-center py-16">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Looks like you haven&apos;t added anything to your cart yet.</p>
            <Link href={getUrl()}>
              <Button style={{ backgroundColor: themeColor }} className="text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        ) : (
          /* Cart with Items */
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-8">
              <div className="border border-black/10 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-sm font-medium text-gray-500">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>

                {/* Items */}
                <div className="divide-y divide-black/10">
                  {items.map((item) => (
                    <div key={item.id} className="p-4 sm:p-6">
                      <div className="sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center">
                        {/* Product Info */}
                        <div className="flex items-start gap-4 sm:col-span-6">
                          <div className="h-20 w-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  target.parentElement?.classList.add('flex', 'items-center', 'justify-center')
                                  const placeholder = document.createElement('div')
                                  placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#d1d5db" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z"></path></svg>'
                                  target.parentElement?.appendChild(placeholder)
                                }}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <ShoppingBag className="h-8 w-8 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                            {item.variantTitle && (
                              <p className="text-sm text-gray-500 mt-1">{item.variantTitle}</p>
                            )}
                            {item.sku && (
                              <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>
                            )}
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="text-sm text-red-500 hover:text-red-600 mt-2 flex items-center gap-1 sm:hidden"
                            >
                              <Trash className="h-4 w-4" />
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Price - Mobile shows inline, Desktop in column */}
                        <div className="hidden sm:block sm:col-span-2 text-center">
                          <span className="font-medium">{formatPrice(item.price, currency)}</span>
                          {item.compareAtPrice && item.compareAtPrice > item.price && (
                            <span className="block text-sm text-gray-400 line-through">
                              {formatPrice(item.compareAtPrice, currency)}
                            </span>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="flex items-center justify-between mt-4 sm:mt-0 sm:col-span-2 sm:justify-center">
                          <span className="text-sm text-gray-500 sm:hidden">Quantity:</span>
                          <div className="flex items-center border border-gray-200 rounded">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-2 hover:bg-gray-100 transition-colors text-gray-700"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center text-sm font-medium text-gray-700">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                              className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 text-gray-700"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between mt-4 sm:mt-0 sm:col-span-2 sm:justify-end">
                          <span className="text-sm text-gray-500 sm:hidden">Total:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold" style={{ color: themeColor }}>
                              {formatPrice(item.price * item.quantity, currency)}
                            </span>
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="hidden sm:block p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Continue Shopping */}
              <div className="mt-6">
                <Link 
                  href={getUrl()}
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Continue Shopping
                </Link>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-4 mt-8 lg:mt-0">
              <div className="border border-black/10 rounded-lg p-6 sticky top-24">
                <h2 className="text-lg font-bold mb-4">Order Summary</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal ({itemCount} items)</span>
                    <span className="font-medium">{formatPrice(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium text-green-600">Free</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium">{formatPrice(tax, currency)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-black/10 my-4" />

                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-xl font-bold" style={{ color: themeColor }}>
                    {formatPrice(total, currency)}
                  </span>
                </div>

                <Link href={getUrl('/checkout')}>
                  <Button 
                    className="w-full text-white"
                    style={{ backgroundColor: themeColor }}
                  >
                    Proceed to Checkout
                  </Button>
                </Link>

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t border-black/10">
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Secure Checkout
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Safe Payment
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

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
