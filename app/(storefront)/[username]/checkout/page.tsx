"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { notFound } from "next/navigation"
import Link from "next/link"
import { 
  ShoppingBag,
  User,
  ArrowLeft,
  WhatsappLogo,
  CreditCard,
  Truck,
  ShieldCheck,
  CheckCircle
} from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CartProvider, useCart } from "@/lib/cart-context"
import { toast } from "sonner"
import { StorefrontHeader } from "@/components/storefront/header"
import { StorefrontFooter } from "@/components/storefront/footer"

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

export default function CheckoutPage({ params }: { params: { username: string } }) {
  return (
    <CartProvider storeUsername={params.username}>
      <CheckoutContent params={params} />
    </CartProvider>
  )
}

function CheckoutContent({ params }: { params: { username: string } }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const { items, itemCount, subtotal, clearCart } = useCart()

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Bangladesh",
    notes: "",
    paymentMethod: "cod" // cod, bkash, nagad, card
  })

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (items.length === 0) {
      toast.error("Your cart is empty")
      return
    }

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.address || !formData.city) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)

    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`
      
      // Calculate totals
      const shipping = 0
      const tax = 0
      const total = subtotal + shipping + tax

      // Find or create customer
      let customerId: string | null = null
      
      // Check if customer exists by email
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("store_id", store?.id)
        .eq("email", formData.email)
        .single()
      
      if (existingCustomer) {
        customerId = existingCustomer.id
        // Update customer info
        await supabase
          .from("customers")
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            last_order_at: new Date().toISOString()
          })
          .eq("id", customerId)
      } else {
        // Create new customer
        const { data: newCustomer } = await supabase
          .from("customers")
          .insert({
            store_id: store?.id,
            email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            status: "active",
            last_order_at: new Date().toISOString()
          })
          .select("id")
          .single()
        
        if (newCustomer) {
          customerId = newCustomer.id
        }
      }

      // Create order in Supabase
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          store_id: store?.id,
          customer_id: customerId,
          order_number: orderNumber,
          customer_email: formData.email,
          customer_name: `${formData.firstName} ${formData.lastName}`,
          customer_phone: formData.phone,
          shipping_address: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postalCode,
            country: formData.country
          },
          subtotal: subtotal,
          shipping: shipping,
          tax: tax,
          total: total,
          currency: store?.currency || "BDT",
          status: "pending",
          payment_status: formData.paymentMethod === "cod" ? "pending" : "pending",
          fulfillment_status: "unfulfilled",
          notes: formData.notes || null,
          source: "web"
        })
        .select("id")
        .single()

      if (orderError) {
        console.error("Order error:", orderError)
        toast.error("Failed to place order. Please try again.")
        setSubmitting(false)
        return
      }

      // Create order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.productId,
        product_variant_id: item.variantId || null,
        product_name: item.name,
        variant_name: item.variantTitle || null,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        sku: item.sku || null,
        image_url: item.image || null
      }))

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems)

      if (itemsError) {
        console.error("Order items error:", itemsError)
        // Order was created but items failed - still show success
      }

      // Reduce stock for each item
      for (const item of items) {
        if (item.variantId) {
          // Reduce variant stock
          const { data: variant } = await supabase
            .from("product_variants")
            .select("stock")
            .eq("id", item.variantId)
            .single()
          
          if (variant) {
            await supabase
              .from("product_variants")
              .update({ stock: Math.max(0, (variant.stock || 0) - item.quantity) })
              .eq("id", item.variantId)
          }
        } else {
          // Reduce product stock
          const { data: product } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.productId)
            .single()
          
          if (product) {
            await supabase
              .from("products")
              .update({ stock: Math.max(0, (product.stock || 0) - item.quantity) })
              .eq("id", item.productId)
          }
        }
      }

      // Clear cart and show success
      clearCart()
      setOrderId(orderNumber)
      setOrderPlaced(true)
      toast.success("Order placed successfully!")

    } catch (err) {
      console.error("Checkout error:", err)
      toast.error("Something went wrong. Please try again.")
    }

    setSubmitting(false)
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
  const shipping = 0
  const tax = 0
  const total = subtotal + shipping + tax

  // Order Success View
  if (orderPlaced) {
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

        {/* Success Content */}
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: `${themeColor}20` }}
          >
            <CheckCircle className="h-10 w-10" style={{ color: themeColor }} weight="fill" />
          </div>
          
          <h1 className="text-3xl font-bold mb-4">Thank You!</h1>
          <p className="text-gray-600 mb-2">Your order has been placed successfully.</p>
          <p className="text-lg font-medium mb-8">Order Number: <span style={{ color: themeColor }}>{orderId}</span></p>

          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-bold mb-4">What&apos;s Next?</h2>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">1</span>
                </div>
                <span>You will receive an order confirmation email shortly.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">2</span>
                </div>
                <span>We will process your order and prepare it for shipping.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">3</span>
                </div>
                <span>You will receive a tracking number once your order is shipped.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/${params.username}`}>
              <Button style={{ backgroundColor: themeColor }} className="text-white">
                Continue Shopping
              </Button>
            </Link>
            {store.social_links?.whatsapp && (
              <a 
                href={`https://wa.me/${store.social_links.whatsapp.replace(/\D/g, '')}?text=Hi! I just placed order ${orderId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button style={{ backgroundColor: "#25D366" }} className="text-white">
                  <WhatsappLogo className="h-4 w-4 mr-2" />
                  Contact via WhatsApp
                </Button>
              </a>
            )}
          </div>
        </main>

        {/* Footer */}
        <StorefrontFooter 
          store={store}
          categories={categories}
          username={params.username}
        />
      </div>
    )
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
      <div className="bg-gray-50 border-b border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link href={`/${params.username}`} className="text-gray-500 hover:text-gray-700">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <Link href={`/${params.username}/cart`} className="text-gray-500 hover:text-gray-700">
              Cart
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">Checkout</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {items.length === 0 ? (
          /* Empty Cart */
          <div className="text-center py-16">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Add some items to your cart to checkout.</p>
            <Link href={`/${params.username}`}>
              <Button style={{ backgroundColor: themeColor }} className="text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              {/* Checkout Form */}
              <div className="lg:col-span-7">
                <h1 className="text-2xl font-bold mb-8">Checkout</h1>

                {/* Contact Information */}
                <div className="mb-8">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Contact Information
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                        className="mt-1 bg-white border-gray-200 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                        className="mt-1 bg-white border-gray-200 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="mt-1 bg-white border-gray-200 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        className="mt-1 bg-white border-gray-200 text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="mb-8">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Shipping Address
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="House number, street name"
                        required
                        className="mt-1 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          required
                          className="mt-1 bg-white border-gray-200 text-gray-900"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State / Division</Label>
                        <Input
                          id="state"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="mt-1 bg-white border-gray-200 text-gray-900"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          value={formData.postalCode}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          className="mt-1 bg-white border-gray-200 text-gray-900"
                        />
                      </div>
                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="mt-1 bg-white border-gray-200 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-8">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Method
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <label 
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.paymentMethod === "cod" ? "border-2" : "border-gray-200"
                      }`}
                      style={{ borderColor: formData.paymentMethod === "cod" ? themeColor : undefined }}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={formData.paymentMethod === "cod"}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="sr-only"
                      />
                      <div 
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.paymentMethod === "cod" ? "" : "border-gray-300"
                        }`}
                        style={{ borderColor: formData.paymentMethod === "cod" ? themeColor : undefined }}
                      >
                        {formData.paymentMethod === "cod" && (
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeColor }} />
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Cash on Delivery</span>
                        <p className="text-xs text-gray-500">Pay when you receive</p>
                      </div>
                    </label>

                    <label 
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.paymentMethod === "bkash" ? "border-2" : "border-gray-200"
                      }`}
                      style={{ borderColor: formData.paymentMethod === "bkash" ? themeColor : undefined }}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bkash"
                        checked={formData.paymentMethod === "bkash"}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="sr-only"
                      />
                      <div 
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.paymentMethod === "bkash" ? "" : "border-gray-300"
                        }`}
                        style={{ borderColor: formData.paymentMethod === "bkash" ? themeColor : undefined }}
                      >
                        {formData.paymentMethod === "bkash" && (
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeColor }} />
                        )}
                      </div>
                      <div>
                        <span className="font-medium">bKash</span>
                        <p className="text-xs text-gray-500">Mobile payment</p>
                      </div>
                    </label>

                    <label 
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.paymentMethod === "nagad" ? "border-2" : "border-gray-200"
                      }`}
                      style={{ borderColor: formData.paymentMethod === "nagad" ? themeColor : undefined }}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="nagad"
                        checked={formData.paymentMethod === "nagad"}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="sr-only"
                      />
                      <div 
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.paymentMethod === "nagad" ? "" : "border-gray-300"
                        }`}
                        style={{ borderColor: formData.paymentMethod === "nagad" ? themeColor : undefined }}
                      >
                        {formData.paymentMethod === "nagad" && (
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeColor }} />
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Nagad</span>
                        <p className="text-xs text-gray-500">Mobile payment</p>
                      </div>
                    </label>

                    <label 
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.paymentMethod === "card" ? "border-2" : "border-gray-200"
                      }`}
                      style={{ borderColor: formData.paymentMethod === "card" ? themeColor : undefined }}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={formData.paymentMethod === "card"}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="sr-only"
                      />
                      <div 
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.paymentMethod === "card" ? "" : "border-gray-300"
                        }`}
                        style={{ borderColor: formData.paymentMethod === "card" ? themeColor : undefined }}
                      >
                        {formData.paymentMethod === "card" && (
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeColor }} />
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Credit/Debit Card</span>
                        <p className="text-xs text-gray-500">Visa, Mastercard</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Order Notes */}
                <div className="mb-8">
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special instructions for your order..."
                    className="mt-1 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                    rows={3}
                  />
                </div>

                {/* Back to Cart */}
                <Link 
                  href={`/${params.username}/cart`}
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Cart
                </Link>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-5 mt-8 lg:mt-0">
                <div className="border border-black/10 rounded-lg p-6 sticky top-24">
                  <h2 className="text-lg font-bold mb-4">Order Summary</h2>

                  {/* Items */}
                  <div className="max-h-64 overflow-y-auto mb-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 py-3 border-b border-black/5 last:border-0">
                        <div className="h-16 w-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <ShoppingBag className="h-6 w-6 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium truncate">{item.name}</h3>
                          {item.variantTitle && (
                            <p className="text-xs text-gray-500">{item.variantTitle}</p>
                          )}
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <span className="text-sm font-medium">
                          {formatPrice(item.price * item.quantity, currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="space-y-3 text-sm border-t border-black/10 pt-4">
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

                  <Button 
                    type="submit"
                    className="w-full text-white"
                    style={{ backgroundColor: themeColor }}
                    disabled={submitting}
                  >
                    {submitting ? "Processing..." : "Place Order"}
                  </Button>

                  {/* Trust Badges */}
                  <div className="mt-6 pt-6 border-t border-black/10">
                    <div className="flex flex-col gap-2 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Secure & encrypted checkout</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span>Free shipping on all orders</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <StorefrontFooter 
        store={store}
        categories={categories}
        username={params.username}
      />
    </div>
  )
}
