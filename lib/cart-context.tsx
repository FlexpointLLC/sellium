"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface CartItem {
  id: string
  productId: string
  variantId?: string
  name: string
  variantTitle?: string
  price: number
  compareAtPrice?: number
  quantity: number
  image: string | null
  stock: number
  sku?: string
}

interface CartContextType {
  items: CartItem[]
  itemCount: number
  subtotal: number
  addItem: (item: Omit<CartItem, "id">) => void
  removeItem: (id: string) => void
  removeByProductId: (productId: string, variantId?: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  isInCart: (productId: string, variantId?: string) => boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ 
  children, 
  storeUsername 
}: { 
  children: ReactNode
  storeUsername: string 
}) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const storageKey = `cart_${storeUsername}`
    const savedCart = localStorage.getItem(storageKey)
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e)
      }
    }
    setIsLoaded(true)
  }, [storeUsername])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      const storageKey = `cart_${storeUsername}`
      localStorage.setItem(storageKey, JSON.stringify(items))
    }
  }, [items, storeUsername, isLoaded])

  const itemCount = items.reduce((total, item) => total + item.quantity, 0)
  const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0)

  const addItem = (newItem: Omit<CartItem, "id">) => {
    setItems(currentItems => {
      // Check if item already exists (same product and variant)
      const existingIndex = currentItems.findIndex(
        item => item.productId === newItem.productId && item.variantId === newItem.variantId
      )

      if (existingIndex > -1) {
        // Update quantity if item exists
        const updatedItems = [...currentItems]
        const newQuantity = updatedItems[existingIndex].quantity + newItem.quantity
        // Don't exceed stock
        updatedItems[existingIndex].quantity = Math.min(newQuantity, newItem.stock)
        return updatedItems
      }

      // Add new item
      const id = `${newItem.productId}-${newItem.variantId || "default"}-${Date.now()}`
      return [...currentItems, { ...newItem, id }]
    })
  }

  const removeItem = (id: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== id))
  }

  const removeByProductId = (productId: string, variantId?: string) => {
    setItems(currentItems => currentItems.filter(item => 
      !(item.productId === productId && item.variantId === variantId)
    ))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(id)
      return
    }

    setItems(currentItems =>
      currentItems.map(item => {
        if (item.id === id) {
          // Don't exceed stock
          return { ...item, quantity: Math.min(quantity, item.stock) }
        }
        return item
      })
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const isInCart = (productId: string, variantId?: string) => {
    return items.some(
      item => item.productId === productId && item.variantId === variantId
    )
  }

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        addItem,
        removeItem,
        removeByProductId,
        updateQuantity,
        clearCart,
        isInCart
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

