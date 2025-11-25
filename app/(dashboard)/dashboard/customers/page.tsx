"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Users, MagnifyingGlass, Eye, Plus, Pencil, Trash, User } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface Customer {
  id: string
  email: string
  name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  notes: string | null
  accepts_marketing: boolean
  total_orders: number
  total_spent: number
  status: string
  created_at: string
  last_order_at: string | null
}

interface Store {
  id: string
  name: string
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500",
  inactive: "bg-gray-500/10 text-gray-500",
  blocked: "bg-red-500/10 text-red-500",
}

export default function CustomersPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<Store | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    notes: "",
    accepts_marketing: false,
    status: "active"
  })

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push("/login")
      return
    }

    // Fetch store
    const { data: storeData } = await supabase
      .from("stores")
      .select("id, name")
      .eq("user_id", user.id)
      .single()

    if (!storeData) {
      router.push("/onboarding")
      return
    }

    setStore(storeData)

    // Fetch customers
    const { data: customersData } = await supabase
      .from("customers")
      .select("*")
      .eq("store_id", storeData.id)
      .order("created_at", { ascending: false })

    if (customersData) {
      setCustomers(customersData)
    }

    setLoading(false)
  }

  function resetForm() {
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      notes: "",
      accepts_marketing: false,
      status: "active"
    })
  }

  function openAddDialog() {
    resetForm()
    setIsAddDialogOpen(true)
  }

  function openEditDialog(customer: Customer) {
    setSelectedCustomer(customer)
    setFormData({
      email: customer.email,
      first_name: customer.first_name || "",
      last_name: customer.last_name || "",
      phone: customer.phone || "",
      notes: customer.notes || "",
      accepts_marketing: customer.accepts_marketing,
      status: customer.status
    })
    setIsEditDialogOpen(true)
  }

  function openDeleteDialog(customer: Customer) {
    setSelectedCustomer(customer)
    setIsDeleteDialogOpen(true)
  }

  function openViewDialog(customer: Customer) {
    setSelectedCustomer(customer)
    setIsViewDialogOpen(true)
  }

  async function handleAddCustomer() {
    if (!store || !formData.email.trim()) return

    const name = [formData.first_name, formData.last_name].filter(Boolean).join(" ") || null

    const { data, error } = await supabase
      .from("customers")
      .insert({
        store_id: store.id,
        email: formData.email.trim(),
        name,
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        phone: formData.phone.trim() || null,
        notes: formData.notes.trim() || null,
        accepts_marketing: formData.accepts_marketing,
        status: formData.status
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding customer:", error)
      toast.error(error.message || "Failed to add customer")
      return
    }

    setCustomers([data, ...customers])
    setIsAddDialogOpen(false)
    resetForm()
    toast.success("Customer added successfully")
  }

  async function handleUpdateCustomer() {
    if (!selectedCustomer || !formData.email.trim()) return

    const name = [formData.first_name, formData.last_name].filter(Boolean).join(" ") || null

    const { data, error } = await supabase
      .from("customers")
      .update({
        email: formData.email.trim(),
        name,
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        phone: formData.phone.trim() || null,
        notes: formData.notes.trim() || null,
        accepts_marketing: formData.accepts_marketing,
        status: formData.status,
        updated_at: new Date().toISOString()
      })
      .eq("id", selectedCustomer.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating customer:", error)
      toast.error(error.message || "Failed to update customer")
      return
    }

    setCustomers(customers.map(c => c.id === selectedCustomer.id ? data : c))
    setIsEditDialogOpen(false)
    setSelectedCustomer(null)
    resetForm()
    toast.success("Customer updated successfully")
  }

  async function handleDeleteCustomer() {
    if (!selectedCustomer) return

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", selectedCustomer.id)

    if (error) {
      console.error("Error deleting customer:", error)
      toast.error(error.message || "Failed to delete customer")
      return
    }

    setCustomers(customers.filter(c => c.id !== selectedCustomer.id))
    setIsDeleteDialogOpen(false)
    setSelectedCustomer(null)
    toast.success("Customer deleted successfully")
  }

  const filteredCustomers = customers.filter(customer =>
    (customer.name && customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchQuery))
  )

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  function getDisplayName(customer: Customer) {
    if (customer.name) return customer.name
    if (customer.first_name || customer.last_name) {
      return [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    }
    return customer.email.split("@")[0]
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-10 w-64" />
        <div className="rounded-lg border bg-card p-4">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-normal">Customers</h1>
          <p className="text-sm font-normal text-muted-foreground">View and manage your customers</p>
        </div>
        <Button size="sm" onClick={openAddDialog}>
          <Plus />
          Add Customer
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search customers..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full min-w-[750px]">
          <thead>
            <tr className="border-b">
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Orders</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Total Spent</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Joined</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No customers found matching your search." : "No customers yet."}
                    </p>
                    {!searchQuery && (
                      <Button size="sm" className="mt-4" onClick={openAddDialog}>
                        <Plus />
                        Add your first customer
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{getDisplayName(customer)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{customer.email}</td>
                  <td className="px-6 py-4">{customer.total_orders}</td>
                  <td className="px-6 py-4 font-medium">${customer.total_spent.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${statusColors[customer.status] || "bg-gray-500/10 text-gray-500"}`}
                    >
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(customer.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openViewDialog(customer)}>
                        <Eye />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(customer)}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openDeleteDialog(customer)}>
                        <Trash />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      {customers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Customers</p>
            <p className="text-2xl font-semibold">{customers.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold">{customers.filter(c => c.status === "active").length}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-semibold">{customers.reduce((sum, c) => sum + c.total_orders, 0)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-semibold">
              ${customers.reduce((sum, c) => sum + c.total_spent, 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>
              Add a new customer to your store.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this customer..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="marketing">Accepts Marketing</Label>
              <Switch
                id="marketing"
                checked={formData.accepts_marketing}
                onCheckedChange={(checked) => setFormData({ ...formData, accepts_marketing: checked })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddCustomer} disabled={!formData.email.trim()}>
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="customer@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-first_name">First Name</Label>
                <Input
                  id="edit-first_name"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-last_name">Last Name</Label>
                <Input
                  id="edit-last_name"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Add any notes about this customer..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-marketing">Accepts Marketing</Label>
              <Switch
                id="edit-marketing"
                checked={formData.accepts_marketing}
                onCheckedChange={(checked) => setFormData({ ...formData, accepts_marketing: checked })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdateCustomer} disabled={!formData.email.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Customer Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-lg font-medium">{getDisplayName(selectedCustomer)}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedCustomer.phone || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${statusColors[selectedCustomer.status]}`}
                  >
                    {selectedCustomer.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="font-medium">{selectedCustomer.total_orders}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="font-medium">${selectedCustomer.total_spent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">{formatDate(selectedCustomer.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Order</p>
                  <p className="font-medium">
                    {selectedCustomer.last_order_at ? formatDate(selectedCustomer.last_order_at) : "Never"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Marketing</p>
                  <p className="font-medium">
                    {selectedCustomer.accepts_marketing ? "Subscribed" : "Not subscribed"}
                  </p>
                </div>
              </div>

              {selectedCustomer.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm">{selectedCustomer.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={() => {
              setIsViewDialogOpen(false)
              if (selectedCustomer) openEditDialog(selectedCustomer)
            }}>
              Edit Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedCustomer ? getDisplayName(selectedCustomer) : ""}&quot;? 
              This action cannot be undone. All associated data including order history will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
