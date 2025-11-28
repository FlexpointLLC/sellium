"use client"
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { notFound, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StorefrontHeader } from "@/components/storefront/header"
import { StorefrontFooter } from "@/components/storefront/footer"
import { FloatingButtons } from "@/components/storefront/floating-buttons"
import { LoadingSpinner } from "@/components/storefront/loading-spinner"
import { CartProvider } from "@/lib/cart-context"
import { useStorefrontUrl } from "@/lib/use-storefront-url"
import { useStoreMeta } from "@/lib/use-store-meta"
import { ArrowLeft, Package, Ticket, Plus, Eye } from "phosphor-react"
import { toast } from "sonner"

interface Store {
  id: string
  name: string
  username: string
  description: string | null
  logo_url: string | null
  favicon_url: string | null
  banner_url: string | null
  banner_images: string[] | null
  meta_title: string | null
  meta_description: string | null
  theme_color: string | null
  currency: string
  linquo_org_id: string | null
  available_time?: string | null
  social_media_text?: string | null
  copyright_text?: string | null
  show_powered_by?: boolean
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

interface Category {
  id: string
  name: string
  slug: string
  image_url: string | null
  parent_id: string | null
  product_count?: number
  children?: Category[]
}

interface Customer {
  id: string
  email: string
  name: string | null
  store_id: string
}

interface Order {
  id: string
  order_number: string
  customer_name: string | null
  customer_email: string
  status: string
  payment_status: string
  payment_method: string | null
  total: number
  currency: string
  created_at: string
}

interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  description: string
  priority: string
  status: string
  category: string | null
  admin_response: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

type TabType = "orders" | "tickets"

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  processing: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  shipped: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  delivered: "bg-green-500/10 text-green-500 border-green-500/30",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/30",
  refunded: "bg-gray-500/10 text-gray-500 border-gray-500/30",
}

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  paid: "bg-green-500/10 text-green-500 border-green-500/30",
  failed: "bg-red-500/10 text-red-500 border-red-500/30",
  refunded: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  partially_refunded: "bg-orange-500/10 text-orange-500 border-orange-500/30",
}

const ticketStatusColors: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  resolved: "bg-green-500/10 text-green-500 border-green-500/30",
  closed: "bg-gray-500/10 text-gray-500 border-gray-500/30",
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  medium: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  urgent: "bg-red-500/10 text-red-500 border-red-500/30",
}

export default function AccountPage({ params }: { params: { username: string } }) {
  return (
    <CartProvider storeUsername={params.username}>
      <AccountPageContent params={params} />
    </CartProvider>
  )
}

function AccountPageContent({ params }: { params: { username: string } }) {
  const username = params.username as string
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getUrl } = useStorefrontUrl(username)
  const [email, setEmail] = useState("")
  const [store, setStore] = useState<Store | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("orders")
  const [submitting, setSubmitting] = useState(false)
  
  // Orders and tickets state
  const [orders, setOrders] = useState<Order[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingTickets, setLoadingTickets] = useState(false)
  
  // Create ticket dialog
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false)
  const [creatingTicket, setCreatingTicket] = useState(false)
  const [newTicketForm, setNewTicketForm] = useState({
    subject: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    category: ""
  })

  useEffect(() => {
    async function fetchStore() {
      const supabase = createClient()
      
      // Fetch store from Supabase
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("username", username)
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
        linquo_org_id: storeData.linquo_org_id || null,
        available_time: storeData.available_time || null,
        social_media_text: storeData.social_media_text || null,
        copyright_text: storeData.copyright_text || null,
        show_powered_by: storeData.show_powered_by !== undefined ? storeData.show_powered_by : true,
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

      setLoading(false)
    }

    fetchStore()
  }, [username])

  // Check for customer ID in URL and load customer if present
  useEffect(() => {
    if (!store || loading) return

    const customerId = searchParams.get("customer")
    const storeId = store.id
    if (customerId && storeId) {
      async function loadCustomerFromId() {
        const supabase = createClient()
        const { data: customerData, error } = await supabase
          .from("customers")
          .select("id, email, name, store_id")
          .eq("id", customerId)
          .eq("store_id", storeId)
          .single()

        if (!error && customerData) {
          setCustomer(customerData)
          setEmail(customerData.email)
        }
      }
      loadCustomerFromId()
    }
  }, [store, loading, searchParams])

  // Fetch orders when customer is set
  useEffect(() => {
    if (!customer || !store) return

    const storeId = store.id
    const customerEmail = customer.email

    async function fetchOrders() {
      setLoadingOrders(true)
      const supabase = createClient()

      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_email, status, payment_status, payment_method, total, currency, created_at")
        .eq("store_id", storeId)
        .eq("customer_email", customerEmail)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching orders:", error)
        toast.error("Failed to load orders")
      } else {
        setOrders(ordersData || [])
      }
      setLoadingOrders(false)
    }

    fetchOrders()
  }, [customer, store])

  // Fetch tickets when customer is set
  useEffect(() => {
    if (!customer || !store) return

    const storeId = store.id
    const customerEmail = customer.email

    async function fetchTickets() {
      setLoadingTickets(true)
      const supabase = createClient()

      // Try to fetch tickets by customer_email (if column exists)
      // If it doesn't exist, we'll get an error and can add it via migration
      const { data: ticketsData, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("store_id", storeId)
        .eq("customer_email", customerEmail)
        .order("created_at", { ascending: false })

      if (error) {
        // If customer_email column doesn't exist, try without it (for backward compatibility)
        if (error.code === '42703') {
          // Column doesn't exist - fetch all tickets for this store (temporary until migration)
          const { data: allTickets } = await supabase
            .from("support_tickets")
            .select("*")
            .eq("store_id", storeId)
            .order("created_at", { ascending: false })
          
          // Filter by email in memory (temporary solution)
          // In production, you should add customer_email column to support_tickets
          setTickets((allTickets || []).filter((t: any) => 
            t.customer_email === customerEmail || !t.customer_email
          ))
        } else {
          console.error("Error fetching tickets:", error)
          toast.error("Failed to load tickets")
        }
      } else {
        setTickets(ticketsData || [])
      }
      setLoadingTickets(false)
    }

    fetchTickets()
  }, [customer, store])

  // Set custom favicon and meta tags
  useStoreMeta(store)

  async function handleContinue() {
    if (!email || !store) return

    setSubmitting(true)
    const supabase = createClient()

    try {
      // Check if customer exists
      const { data: existingCustomer, error: fetchError } = await supabase
        .from("customers")
        .select("id, email, name, store_id")
        .eq("store_id", store.id)
        .eq("email", email.trim().toLowerCase())
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new customers
        console.error("Error fetching customer:", fetchError)
        toast.error("Failed to access account. Please try again.")
        setSubmitting(false)
        return
      }

      if (existingCustomer) {
        // Customer exists, set it and update URL
        setCustomer(existingCustomer)
        router.push(`${getUrl('/account')}?customer=${existingCustomer.id}`, { scroll: false })
      } else {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
          .from("customers")
          .insert({
            store_id: store.id,
            email: email.trim().toLowerCase(),
            name: null,
            status: "active"
          })
          .select("id, email, name, store_id")
          .single()

        if (createError || !newCustomer) {
          console.error("Error creating customer:", createError)
          toast.error("Failed to create account. Please try again.")
          setSubmitting(false)
          return
        }

        setCustomer(newCustomer)
        router.push(`${getUrl('/account')}?customer=${newCustomer.id}`, { scroll: false })
      }
    } catch (err) {
      console.error("Error in handleContinue:", err)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  async function generateTicketNumber(storeId: string): Promise<string> {
    const supabase = createClient()
    const { count } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId)
    
    const ticketCount = (count || 0) + 1
    return `TKT-${String(ticketCount).padStart(4, "0")}`
  }

  async function handleCreateTicket() {
    if (!store || !customer || !newTicketForm.subject.trim() || !newTicketForm.description.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    setCreatingTicket(true)
    const supabase = createClient()
    const ticketNumber = await generateTicketNumber(store.id)

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        store_id: store.id,
        ticket_number: ticketNumber,
        subject: newTicketForm.subject.trim(),
        description: newTicketForm.description.trim(),
        priority: newTicketForm.priority,
        category: newTicketForm.category.trim() || null,
        status: "open",
        customer_email: customer.email // Add customer email
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating ticket:", error)
      toast.error("Failed to create ticket. Please try again.")
    } else {
      toast.success("Ticket created successfully!")
      setTickets([data, ...tickets])
      setIsCreateTicketOpen(false)
      setNewTicketForm({
        subject: "",
        description: "",
        priority: "medium",
        category: ""
      })
    }
    setCreatingTicket(false)
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error || !store) {
    notFound()
  }

  // Show email input form if customer is not set
  if (!customer) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col" data-theme="light">
        <StorefrontHeader 
          store={{
            name: store.name,
            username: store.username,
            logo_url: store.logo_url,
            theme_color: store.theme_color,
            linquo_org_id: store.linquo_org_id,
            social_links: store.social_links
          }}
          categories={categories}
          username={username}
        />

        <div className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-6">
            <Link 
              href={getUrl('/')}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={16} weight="bold" />
              Back to store
            </Link>

            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                Your marketplace.
              </h1>
              <p className="text-3xl text-gray-600 tracking-tight">
                Track orders & Tickets
              </p>
            </div>

            <form 
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                handleContinue()
              }}
            >
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-900"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3 border border-black/10 rounded-md bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900/30 transition-colors"
                  required
                />
                <p className="text-xs text-gray-600">
                  Use an organization email to easily collaborate with teammates
                </p>
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-md text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: store.theme_color || "#000000" }}
                disabled={!email || submitting}
              >
                {submitting ? "Loading..." : "Continue"}
              </button>
            </form>

            <p className="text-xs text-gray-600 text-center leading-relaxed">
              By continuing, you acknowledge that you understand and agree to the{" "}
              <Link
                href={getUrl('/privacy-policy')}
                className="text-gray-900 hover:underline underline-offset-2"
              >
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link
                href={getUrl('/privacy-policy')}
                className="text-gray-900 hover:underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <StorefrontFooter 
          store={{
            name: store.name,
            username: store.username,
            logo_url: store.logo_url,
            theme_color: store.theme_color,
            available_time: store.available_time || null,
            social_media_text: store.social_media_text || null,
            copyright_text: store.copyright_text || null,
            show_powered_by: store.show_powered_by !== undefined ? store.show_powered_by : true,
            social_links: store.social_links,
            address: store.address
          }}
          username={username}
        />

        <FloatingButtons 
          username={username}
          themeColor={store.theme_color || "#000000"}
          currency={store.currency}
          linquoOrgId={store.linquo_org_id}
        />
      </div>
    )
  }

  // Show dashboard with tabs
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col" data-theme="light">
      <StorefrontHeader 
        store={{
          name: store.name,
          username: store.username,
          logo_url: store.logo_url,
          theme_color: store.theme_color,
          linquo_org_id: store.linquo_org_id,
          social_links: store.social_links
        }}
        categories={categories}
        username={username}
      />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="mb-6">
          <Link 
            href={getUrl('/')}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft size={16} weight="bold" />
            Back to store
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">My Account</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your orders and support tickets</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-1 -mb-px">
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === "orders"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <Package size={16} weight={activeTab === "orders" ? "bold" : "regular"} />
              My Orders
            </button>
            <button
              onClick={() => setActiveTab("tickets")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === "tickets"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <Ticket size={16} weight={activeTab === "tickets" ? "bold" : "regular"} />
              My Tickets
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="rounded-lg border border-gray-200 bg-white">
          {activeTab === "orders" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">My Orders</h2>
              {loadingOrders ? (
                <div className="text-sm text-gray-600">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600">No orders found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-900">Order #{order.order_number}</p>
                          <p className="text-sm text-gray-600 mt-1">{formatDate(order.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(order.total, order.currency)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium border ${statusColors[order.status] || statusColors.pending}`}>
                              {order.status}
                            </span>
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium border ${paymentStatusColors[order.payment_status] || paymentStatusColors.pending}`}>
                              {order.payment_status}
                            </span>
                          </div>
                        </div>
                      </div>
                      {order.payment_method && (
                        <p className="text-xs text-gray-600">Payment: {order.payment_method}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "tickets" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">My Tickets</h2>
                <Button
                  onClick={() => setIsCreateTicketOpen(true)}
                  className="flex items-center gap-2 text-white"
                  style={{ backgroundColor: store.theme_color || "#000000" }}
                >
                  <Plus size={16} className="text-white" />
                  Create Ticket
                </Button>
              </div>
              {loadingTickets ? (
                <div className="text-sm text-gray-600">Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                  <Ticket size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-4">No tickets found</p>
                  <Button
                    onClick={() => setIsCreateTicketOpen(true)}
                    className="flex items-center gap-2 mx-auto bg-gray-900 text-white hover:bg-gray-800 border-gray-900"
                  >
                    <Plus size={16} className="text-white" />
                    Create Your First Ticket
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{ticket.subject}</p>
                          <p className="text-sm text-gray-600 mt-1">#{ticket.ticket_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium border ${ticketStatusColors[ticket.status] || ticketStatusColors.open}`}>
                            {ticket.status}
                          </span>
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium border ${priorityColors[ticket.priority] || priorityColors.medium}`}>
                            {ticket.priority}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created: {formatDate(ticket.created_at)}</span>
                        {ticket.category && (
                          <span className="text-gray-400">Category: {ticket.category}</span>
                        )}
                      </div>
                      {ticket.admin_response && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-1">Admin Response:</p>
                          <p className="text-sm text-gray-600">{ticket.admin_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
        <DialogContent className="max-w-2xl bg-white text-gray-900 border-gray-200" data-theme="light">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Create Support Ticket</DialogTitle>
            <DialogDescription className="text-gray-600">
              Describe your issue and we&apos;ll get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-gray-900">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={newTicketForm.subject}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                className="bg-white text-gray-900 border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-900">Description *</Label>
              <Textarea
                id="description"
                placeholder="Please provide detailed information about your issue..."
                rows={6}
                value={newTicketForm.description}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                className="bg-white text-gray-900 border-gray-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-gray-900">Priority</Label>
                <Select
                  value={newTicketForm.priority}
                  onValueChange={(value: "low" | "medium" | "high" | "urgent") =>
                    setNewTicketForm({ ...newTicketForm, priority: value })
                  }
                >
                  <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900 border-gray-200">
                    <SelectItem value="low" className="text-gray-900">Low</SelectItem>
                    <SelectItem value="medium" className="text-gray-900">Medium</SelectItem>
                    <SelectItem value="high" className="text-gray-900">High</SelectItem>
                    <SelectItem value="urgent" className="text-gray-900">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-gray-900">Category (Optional)</Label>
                <Input
                  id="category"
                  placeholder="e.g., Order, Payment, Product"
                  value={newTicketForm.category}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                  className="bg-white text-gray-900 border-gray-300"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsCreateTicketOpen(false)}
              disabled={creatingTicket}
              className="bg-white border border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={creatingTicket || !newTicketForm.subject.trim() || !newTicketForm.description.trim()}
              className="text-white"
              style={{ backgroundColor: store?.theme_color || "#000000" }}
            >
              {creatingTicket ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StorefrontFooter 
        store={{
          name: store.name,
          username: store.username,
          logo_url: store.logo_url,
          theme_color: store.theme_color,
          available_time: store.available_time || null,
          social_media_text: store.social_media_text || null,
          copyright_text: store.copyright_text || null,
          show_powered_by: store.show_powered_by !== undefined ? store.show_powered_by : true,
          social_links: store.social_links,
          address: store.address
        }}
        username={username}
      />

      <FloatingButtons 
        username={username}
        themeColor={store.theme_color || "#000000"}
        currency={store.currency}
        linquoOrgId={store.linquo_org_id}
      />
    </div>
  )
}
