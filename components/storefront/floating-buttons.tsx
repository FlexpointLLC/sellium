"use client"
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { ShoppingBag, WhatsappLogo, X, Minus, Plus, Trash } from "phosphor-react"
import { useCart } from "@/lib/cart-context"
import { useStorefrontUrl } from "@/lib/use-storefront-url"

interface FloatingButtonsProps {
  username: string
  themeColor: string
  whatsappNumber?: string
  currency?: string
  linquoOrgId?: string | null
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

export function FloatingButtons({ username, themeColor, whatsappNumber, currency = "BDT", linquoOrgId }: FloatingButtonsProps) {
  const { items, itemCount, subtotal, updateQuantity, removeItem } = useCart()
  const { getUrl } = useStorefrontUrl(username)
  const [isExpanded, setIsExpanded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isExpanded])

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener("keydown", handleEscape)
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isExpanded])

  return (
    <>
      {/* Floating Cart Button & Panel */}
      <div ref={panelRef} className={`fixed ${linquoOrgId ? 'bottom-24' : 'bottom-6'} right-6 z-50`}>
        {/* Expanded Cart Panel */}
        {isExpanded && (
          <div 
            className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
          >
            {/* Panel Header */}
            <div 
              className="flex items-center justify-between px-4 py-3 text-white"
              style={{ backgroundColor: themeColor }}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                <span className="font-medium">Your Cart ({itemCount})</span>
              </div>
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="max-h-72 overflow-y-auto">
              {items.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Your cart is empty</p>
                </div>
              ) : (
                <div className="divide-y divide-black/10">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.variantId || 'default'}`} className="p-3 flex gap-3">
                      {/* Product Image */}
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                        </h4>
                        {item.variantTitle && (
                          <p className="text-xs text-gray-500 truncate">{item.variantTitle}</p>
                        )}
                        <p className="text-sm font-semibold mt-1" style={{ color: themeColor }}>
                          {formatPrice(item.price, currency)}
                        </p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center border border-black/10 rounded-md">
                            <button
                              onClick={() => {
                                if (item.quantity > 1) {
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                              }}
                              className="p-1.5 hover:bg-gray-100 transition-colors"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-2 text-sm font-medium min-w-[24px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1.5 hover:bg-gray-100 transition-colors"
                              disabled={item.stock !== undefined && item.quantity >= item.stock}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel Footer */}
            {items.length > 0 && (
              <div className="border-t border-black/10 p-4 bg-gray-50">
                {/* Subtotal */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="font-bold" style={{ color: themeColor }}>
                    {formatPrice(subtotal, currency)}
                  </span>
                </div>

                {/* Checkout Button */}
                <Link
                  href={getUrl('/checkout')}
                  onClick={() => setIsExpanded(false)}
                  className="block w-full py-3 text-center text-white font-medium rounded-lg transition-opacity hover:opacity-90"
                  style={{ backgroundColor: themeColor }}
                >
                  Proceed to Checkout
                </Link>

                {/* View Cart Link */}
                <Link
                  href={getUrl('/cart')}
                  onClick={() => setIsExpanded(false)}
                  className="block w-full mt-2 py-2 text-center text-sm font-medium transition-colors hover:underline"
                  style={{ color: themeColor }}
                >
                  View Full Cart
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Floating Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-3 text-white rounded-full shadow-lg transition-transform hover:scale-105"
          style={{ backgroundColor: themeColor }}
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="text-sm font-medium">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        </button>
      </div>

      {/* WhatsApp Button */}
      {whatsappNumber && (
        <a
          href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors"
        >
          <WhatsappLogo className="h-7 w-7" weight="fill" />
        </a>
      )}
    </>
  )
}
