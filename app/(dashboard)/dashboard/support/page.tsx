"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Headset, Question, Plus, Code, CaretDown, CaretUp } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const statusColors: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  resolved: "bg-green-500/10 text-green-500 border-green-500/30",
  closed: "bg-gray-500/10 text-gray-500 border-gray-500/30",
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  urgent: "bg-red-500/10 text-red-500 border-red-500/30",
}

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
]

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  description: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "open" | "in_progress" | "resolved" | "closed"
  category: string | null
  admin_response: string | null
  created_at: string
  updated_at: string
}

const faqItems = [
  { 
    question: "How do I add products to my store?", 
    answer: "Navigate to Products in the dashboard and click 'Add Product'. Fill in the product details including name, description, price, images, and stock. You can also add variants (sizes, colors, etc.) for products with multiple options." 
  },
  { 
    question: "How do I manage orders and fulfill them?", 
    answer: "Go to the Orders page to view all customer orders. You can update order status (pending, processing, shipped, delivered) and payment status directly from the table. Click the eye icon to view full order details including customer information and shipping address." 
  },
  { 
    question: "How do I set up a custom domain for my store?", 
    answer: "Go to Settings > Custom Domain and enter your domain name. Follow the DNS configuration instructions provided. Once verified, your store will be accessible at your custom domain instead of the default Sellium subdomain." 
  },
  { 
    question: "How do I organize products with categories?", 
    answer: "Use the Categories page to create and manage product categories. You can create nested categories (parent and child categories) and drag-and-drop to organize them. Categories help customers find products easily on your storefront." 
  },
  { 
    question: "When do I receive payouts for my sales?", 
    answer: "Payouts are processed weekly on Fridays for all completed orders. You can track your earnings and transactions in the Earnings tab. Payment status is updated automatically when orders are marked as delivered." 
  },
  { 
    question: "How can I customize my storefront appearance?", 
    answer: "Go to Settings > Store to customize your store logo, favicon, theme colors, and store description. You can also set custom meta titles and descriptions for better SEO. Changes are reflected immediately on your storefront." 
  },
  { 
    question: "How do I add live chat support to my store?", 
    answer: "Go to Support > Integrate Linquo Live Chat and enter your Linquo Organization ID. The chat widget will automatically appear on your storefront, allowing customers to contact you directly." 
  },
  { 
    question: "How do I manage product variants (sizes, colors, etc.)?", 
    answer: "First, create variant templates in the Variants page (e.g., Size, Color). Then when adding or editing a product, you can generate variants by selecting the templates and their values. Each variant can have its own price, SKU, and stock level." 
  },
  { 
    question: "How do I track my store performance?", 
    answer: "Visit the Dashboard to see an overview of your sales, orders, customers, and earnings. The Earnings page provides detailed transaction history and payout information. Use the Customers page to manage and view customer data." 
  },
  { 
    question: "What should I do if I need help with my store?", 
    answer: "You can create a support ticket by clicking 'New Ticket' on this page. Our support team will respond to your ticket. You can also check the FAQ section for common questions and solutions." 
  },
]

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return "Just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
  return date.toLocaleDateString()
}

export default function SupportPage() {
  const router = useRouter()
  const supabase = createClient()
  const [linquoOrgId, setLinquoOrgId] = useState("")
  const [savedLinquoOrgId, setSavedLinquoOrgId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)
  
  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [isNewTicketDialogOpen, setIsNewTicketDialogOpen] = useState(false)
  const [isViewTicketDialogOpen, setIsViewTicketDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [creatingTicket, setCreatingTicket] = useState(false)
  
  // New ticket form
  const [newTicketForm, setNewTicketForm] = useState({
    subject: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    category: ""
  })
  
  // FAQ expanded state
  const [isFaqSectionOpen, setIsFaqSectionOpen] = useState(false)
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null)

  async function fetchTickets(storeId: string) {
    setLoadingTickets(true)
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("Failed to load tickets")
    } else {
      setTickets(data || [])
    }
    setLoadingTickets(false)
  }

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/login")
        return
      }

      const { data: storeData } = await supabase
        .from("stores")
        .select("id, linquo_org_id")
        .eq("user_id", user.id)
        .single()

      if (storeData) {
        setStoreId(storeData.id)
        setLinquoOrgId(storeData.linquo_org_id || "")
        setSavedLinquoOrgId(storeData.linquo_org_id || null)
        await fetchTickets(storeData.id)
      }
      setLoading(false)
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase])

  async function handleSaveLinquo() {
    if (!storeId || !linquoOrgId.trim()) return

    setSaving(true)
    const { error } = await supabase
      .from("stores")
      .update({ linquo_org_id: linquoOrgId.trim() })
      .eq("id", storeId)

    if (error) {
      toast.error("Failed to save Linquo settings")
    } else {
      setSavedLinquoOrgId(linquoOrgId.trim())
      toast.success("Linquo live chat settings saved!")
    }
    setSaving(false)
  }

  async function handleRemoveLinquo() {
    if (!storeId) return

    setRemoving(true)
    const { error } = await supabase
      .from("stores")
      .update({ linquo_org_id: null })
      .eq("id", storeId)

    if (error) {
      toast.error("Failed to remove Linquo integration")
    } else {
      setLinquoOrgId("")
      setSavedLinquoOrgId(null)
      toast.success("Linquo live chat removed!")
    }
    setRemoving(false)
  }

  // Extract Linquo Organization ID from script tag if pasted
  const extractLinquoOrgId = (input: string): string => {
    const trimmed = input.trim()
    
    // Check if it's a script tag
    if (trimmed.includes('<script') && trimmed.includes('linquo')) {
      // Try to extract ID from src attribute (UUID pattern: 8-4-4-4-12 hex digits)
      const idMatch = trimmed.match(/id=([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)
      if (idMatch && idMatch[1]) {
        return idMatch[1]
      }
      // Fallback: try to match any id= value
      const fallbackMatch = trimmed.match(/id=([a-f0-9-]+)/i)
      if (fallbackMatch && fallbackMatch[1]) {
        return fallbackMatch[1]
      }
    }
    
    // If it's just a UUID, return it as is
    const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
    if (uuidPattern.test(trimmed)) {
      return trimmed
    }
    
    // Return original input if no pattern matches
    return trimmed
  }

  const handleLinquoOrgIdChange = (value: string) => {
    const extractedId = extractLinquoOrgId(value)
    setLinquoOrgId(extractedId)
  }

  async function generateTicketNumber(storeId: string): Promise<string> {
    const { count } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId)
    
    const ticketCount = (count || 0) + 1
    return `TKT-${String(ticketCount).padStart(4, "0")}`
  }

  async function handleCreateTicket() {
    if (!storeId || !newTicketForm.subject.trim() || !newTicketForm.description.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    setCreatingTicket(true)
    const ticketNumber = await generateTicketNumber(storeId)

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        store_id: storeId,
        ticket_number: ticketNumber,
        subject: newTicketForm.subject.trim(),
        description: newTicketForm.description.trim(),
        priority: newTicketForm.priority,
        category: newTicketForm.category.trim() || null,
        status: "open"
      })
      .select()
      .single()

    if (error) {
      toast.error("Failed to create ticket")
      console.error(error)
    } else {
      toast.success("Ticket created successfully!")
      setTickets([data, ...tickets])
      setIsNewTicketDialogOpen(false)
      setNewTicketForm({
        subject: "",
        description: "",
        priority: "medium",
        category: ""
      })
    }
    setCreatingTicket(false)
  }

  function handleViewTicket(ticket: SupportTicket) {
    setSelectedTicket(ticket)
    setIsViewTicketDialogOpen(true)
  }

  async function handleUpdateStatus(ticketId: string, newStatus: "open" | "in_progress" | "resolved" | "closed") {
    if (!storeId) return

    const { error } = await supabase
      .from("support_tickets")
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
        resolved_at: newStatus === "resolved" || newStatus === "closed" ? new Date().toISOString() : null
      })
      .eq("id", ticketId)

    if (error) {
      toast.error("Failed to update status")
    } else {
      toast.success("Status updated")
      // Update local state
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t))
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus })
      }
    }
  }

  async function handleUpdatePriority(ticketId: string, newPriority: "low" | "medium" | "high" | "urgent") {
    if (!storeId) return

    const { error } = await supabase
      .from("support_tickets")
      .update({ 
        priority: newPriority,
        updated_at: new Date().toISOString()
      })
      .eq("id", ticketId)

    if (error) {
      toast.error("Failed to update priority")
    } else {
      toast.success("Priority updated")
      // Update local state
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, priority: newPriority } : t))
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, priority: newPriority })
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-normal">Support</h1>
          <p className="text-sm font-normal text-muted-foreground">Get help and contact our support team</p>
        </div>
        <Button size="sm" onClick={() => setIsNewTicketDialogOpen(true)}>
          <Plus />
          New Ticket
        </Button>
      </div>

      {/* Linquo Live Chat Integration */}
      <div className="rounded-lg border border-border/50 bg-card">
        <div className="border-b border-border/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Code className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Integrate Linquo Live Chat</h2>
              <p className="text-sm text-muted-foreground">Add live chat support to your storefront</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="linquo-org-id">Linquo Organization ID</Label>
            <div className="flex gap-3">
              <Input
                id="linquo-org-id"
                placeholder="Enter your Linquo organization ID"
                value={linquoOrgId}
                onChange={(e) => handleLinquoOrgIdChange(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault()
                  const pastedText = e.clipboardData.getData('text')
                  const extractedId = extractLinquoOrgId(pastedText)
                  setLinquoOrgId(extractedId)
                  toast.success("Organization ID extracted from script tag")
                }}
                disabled={loading || !!savedLinquoOrgId}
                className="max-w-md"
              />
              {savedLinquoOrgId ? (
                <Button 
                  variant="destructive" 
                  onClick={handleRemoveLinquo} 
                  disabled={removing || loading}
                >
                  {removing ? "Removing..." : "Remove"}
                </Button>
              ) : (
                <Button 
                  onClick={handleSaveLinquo} 
                  disabled={saving || loading || !linquoOrgId.trim()}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Get your organization ID from your{" "}
              <a 
                href="https://admin.linquo.app/dashboard?tab=embed" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Linquo dashboard
              </a>
            </p>
          </div>
          
          {linquoOrgId && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">The following script will be added to your storefront:</p>
              <code className="text-xs break-all">
                {`<script id="linquo" async="true" src="https://admin.linquo.app/widget.js?id=${linquoOrgId}"></script>`}
              </code>
            </div>
          )}
        </div>
      </div>


      {/* Support Tickets */}
      <div className="rounded-lg border border-border/50 bg-card">
        <div className="border-b border-border/50 px-6 py-4">
          <h2 className="text-lg font-semibold">Your Tickets</h2>
        </div>
        <div className="grid grid-cols-5 gap-4 border-b border-border/50 px-6 py-3 text-sm font-medium text-muted-foreground">
          <div>Ticket ID</div>
          <div>Subject</div>
          <div>Status</div>
          <div>Priority</div>
          <div>Last Updated</div>
        </div>
        {loadingTickets ? (
          <div className="px-6 py-8 text-center text-muted-foreground">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="px-6 py-8 text-center text-muted-foreground">No tickets yet. Create your first ticket to get started.</div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="grid grid-cols-5 gap-4 border-b border-border/50 px-6 py-4 last:border-0 hover:bg-muted/50"
            >
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => handleViewTicket(ticket)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Headset className="h-4 w-4" />
                </div>
                <span className="font-medium">{ticket.ticket_number}</span>
              </div>
              <div 
                className="flex items-center cursor-pointer"
                onClick={() => handleViewTicket(ticket)}
              >
                {ticket.subject}
              </div>
              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={ticket.status}
                  onValueChange={(value: "open" | "in_progress" | "resolved" | "closed") => 
                    handleUpdateStatus(ticket.id, value)
                  }
                >
                  <SelectTrigger 
                    className={`w-[140px] h-8 text-xs font-medium capitalize border ${statusColors[ticket.status] || "bg-gray-500/10 text-gray-500 border-gray-500/30"}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        className="text-xs capitalize"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={ticket.priority}
                  onValueChange={(value: "low" | "medium" | "high" | "urgent") => 
                    handleUpdatePriority(ticket.id, value)
                  }
                >
                  <SelectTrigger 
                    className={`w-[120px] h-8 text-xs font-medium capitalize border ${priorityColors[ticket.priority] || "bg-gray-500/10 text-gray-500 border-gray-500/30"}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        className="text-xs capitalize"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div 
                className="flex items-center text-muted-foreground cursor-pointer"
                onClick={() => handleViewTicket(ticket)}
              >
                {formatTimeAgo(ticket.updated_at)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAQ Section */}
      <div className="rounded-lg border border-border/50 bg-card">
        <button
          onClick={() => setIsFaqSectionOpen(!isFaqSectionOpen)}
          className="w-full border-b border-border/50 px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
          {isFaqSectionOpen ? (
            <CaretUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <CaretDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        {isFaqSectionOpen && (
          <div className="divide-y">
            {faqItems.map((item, index) => {
              const isExpanded = expandedFaqIndex === index
              return (
                <div key={index} className="px-3 py-4">
                  <button
                    onClick={() => setExpandedFaqIndex(isExpanded ? null : index)}
                    className="w-full flex items-start gap-3 text-left hover:bg-muted/50 py-2 px-3 rounded-md transition-colors"
                  >
                    <Question className="mt-0.5 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium">{item.question}</h3>
                        {isExpanded ? (
                          <CaretUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <CaretDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      {isExpanded && (
                        <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
                      )}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Ticket Dialog */}
      <Dialog open={isNewTicketDialogOpen} onOpenChange={setIsNewTicketDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue and we&apos;ll get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={newTicketForm.subject}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Input
                id="category"
                placeholder="e.g. Payment, Product, Account"
                value={newTicketForm.category}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newTicketForm.priority}
                onValueChange={(value: "low" | "medium" | "high" | "urgent") => 
                  setNewTicketForm({ ...newTicketForm, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide detailed information about your issue..."
                value={newTicketForm.description}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTicketDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicket} disabled={creatingTicket || !newTicketForm.subject.trim() || !newTicketForm.description.trim()}>
              {creatingTicket ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Ticket Dialog */}
      <Dialog open={isViewTicketDialogOpen} onOpenChange={setIsViewTicketDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTicket?.ticket_number} - {selectedTicket?.subject}
            </DialogTitle>
            <DialogDescription>
              Created {selectedTicket ? formatTimeAgo(selectedTicket.created_at) : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value: "open" | "in_progress" | "resolved" | "closed") => 
                      handleUpdateStatus(selectedTicket.id, value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={selectedTicket.priority}
                    onValueChange={(value: "low" | "medium" | "high" | "urgent") => 
                      handleUpdatePriority(selectedTicket.id, value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedTicket.category && (
                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <p className="mt-1 text-sm">{selectedTicket.category}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>
              {selectedTicket.admin_response && (
                <div className="rounded-lg border border-border/50 bg-muted/50 p-4">
                  <Label className="text-xs text-muted-foreground">Admin Response</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selectedTicket.admin_response}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewTicketDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
