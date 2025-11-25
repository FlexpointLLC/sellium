"use client"

import Link from "next/link"
import { ShoppingBag, WhatsappLogo } from "phosphor-react"
import { useCart } from "@/lib/cart-context"

interface FloatingButtonsProps {
  username: string
  themeColor: string
  whatsappNumber?: string
}

export function FloatingButtons({ username, themeColor, whatsappNumber }: FloatingButtonsProps) {
  const { itemCount } = useCart()

  return (
    <>
      {/* Floating Cart Button */}
      <Link 
        href={`/${username}/cart`}
        className="fixed bottom-6 right-6 z-50"
      >
        <div 
          className="flex items-center gap-2 px-4 py-3 text-white rounded-full shadow-lg transition-transform hover:scale-105"
          style={{ backgroundColor: themeColor }}
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="text-sm font-medium">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        </div>
      </Link>

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

