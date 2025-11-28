"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { UserCircle, MagnifyingGlass, Pencil, Trash, User, Link as LinkIcon, Crown, CheckCircle } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
import { toast } from "sonner"

interface UserData {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  role: string
  created_at: string
  store: {
    id: string
    name: string
    username: string
    plan: string
    status: string
  } | null
  customDomain: {
    domain: string
    status: string
  } | null
  totalRevenue: number
  totalOrders: number
}

export default function AdminUsersPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  
  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isChangePlanDialogOpen, setIsChangePlanDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [changePlanData, setChangePlanData] = useState<{
    plan: 'paid' | 'pro'
    billingPeriod: 'monthly' | 'yearly'
  }>({
    plan: 'paid',
    billingPeriod: 'monthly'
  })
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "owner",
    plan: "free",
    status: "active"
  })

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push("/dashboard")
        return
      }

      setUserRole(profile.role)
      fetchUsers()
    }

    checkAccess()
  }, [supabase, router])

  async function fetchUsers() {
    // Fetch all profiles with their stores
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(`
        id,
        name,
        email,
        phone,
        role,
        created_at
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to load users")
      setLoading(false)
      return
    }

    // Fetch stores, custom domains, and order stats for each user
    const usersWithStores = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: store } = await supabase
          .from("stores")
          .select("id, name, username, plan, status")
          .eq("user_id", profile.id)
          .single()

        let customDomain = null
        let totalRevenue = 0
        let totalOrders = 0

        if (store) {
          // Fetch custom domain
          const { data: domain } = await supabase
            .from("custom_domains")
            .select("domain, status")
            .eq("store_id", store.id)
            .single()
          
          customDomain = domain || null

          // Fetch all orders for count
          const { count: allOrdersCount } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("store_id", store.id)

          // Fetch paid orders for revenue calculation
          const { data: paidOrders } = await supabase
            .from("orders")
            .select("total")
            .eq("store_id", store.id)
            .eq("payment_status", "paid")

          if (paidOrders) {
            totalRevenue = paidOrders.reduce((sum, order) => sum + (order.total || 0), 0)
          }
          totalOrders = allOrdersCount || 0
        }

        return {
          ...profile,
          store: store || null,
          customDomain: customDomain,
          totalRevenue: totalRevenue,
          totalOrders: totalOrders
        }
      })
    )

    setUsers(usersWithStores)
    setLoading(false)
  }

  const filteredUsers = users.filter(user =>
    (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.phone && user.phone.includes(searchQuery)) ||
    (user.store?.name && user.store.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-500 border-green-500/30",
    inactive: "bg-gray-500/10 text-gray-500 border-gray-500/30",
    suspended: "bg-red-500/10 text-red-500 border-red-500/30",
  }

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "suspended", label: "Suspended" },
  ]

  const planColors: Record<string, string> = {
    pro: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    paid: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    free: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  }

  const planOptions = [
    { value: "free", label: "Free" },
    { value: "paid", label: "Paid" },
    { value: "pro", label: "Pro" },
  ]

  const roleColors: Record<string, string> = {
    admin: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    owner: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    agent: "bg-green-500/10 text-green-500 border-green-500/30",
    rider: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  }

  const roleOptions = [
    { value: "admin", label: "Admin" },
    { value: "owner", label: "Owner" },
    { value: "agent", label: "Agent" },
    { value: "rider", label: "Rider" },
  ]

  async function updateStoreStatus(storeId: string, newStatus: string) {
    const { error } = await supabase
      .from("stores")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", storeId)

    if (error) {
      toast.error("Failed to update store status")
      return
    }

    toast.success("Store status updated")
    fetchUsers()
  }

  async function updateStorePlan(storeId: string, newPlan: string) {
    // Define plan limits
    const planLimits: Record<string, { traffic: number; products: number }> = {
      free: { traffic: 2000, products: 100 },
      paid: { traffic: 50000, products: 1000 },
      pro: { traffic: 999999999, products: 10000 } // Very high number for "unlimited"
    }

    const limits = planLimits[newPlan] || planLimits.free

    // Clear subscription expiration for free plan, keep it for paid/pro
    const updateData: any = {
      plan: newPlan,
      traffic_limit: limits.traffic,
      product_limit: limits.products,
      updated_at: new Date().toISOString()
    }

    if (newPlan === 'free') {
      updateData.subscription_expires_at = null
    }

    const { error } = await supabase
      .from("stores")
      .update(updateData)
      .eq("id", storeId)

    if (error) {
      toast.error("Failed to update store plan")
      return
    }

    toast.success("Store plan and limits updated")
    fetchUsers()
  }

  async function updateUserRole(userId: string, newRole: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (error) {
      toast.error("Failed to update user role")
      return
    }

    toast.success("User role updated")
    fetchUsers()
  }

  function openEditDialog(user: UserData) {
    setSelectedUser(user)
    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "owner",
      plan: user.store?.plan || "free",
      status: user.store?.status || "active"
    })
    setIsEditDialogOpen(true)
  }

  function openDeleteDialog(user: UserData) {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  function openChangePlanDialog(user: UserData) {
    setSelectedUser(user)
    // Pre-select current plan if user has a store
    if (user.store) {
      const currentPlan = user.store.plan === 'paid' ? 'paid' : user.store.plan === 'pro' ? 'pro' : 'paid'
      setChangePlanData({
        plan: currentPlan as 'paid' | 'pro',
        billingPeriod: 'monthly'
      })
    }
    setIsChangePlanDialogOpen(true)
  }

  async function handleChangePlan() {
    if (!selectedUser || !selectedUser.store) {
      toast.error("User doesn't have a store")
      return
    }

    try {
      // Calculate subscription expiration date
      const expiresAt = new Date()
      if (changePlanData.billingPeriod === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      }

      // Define plan limits
      const planLimits: Record<string, { traffic: number; products: number }> = {
        paid: { traffic: 50000, products: 1000 },
        pro: { traffic: 999999999, products: 10000 }
      }

      const limits = planLimits[changePlanData.plan] || planLimits.paid

      const { error } = await supabase
        .from("stores")
        .update({
          plan: changePlanData.plan,
          subscription_expires_at: expiresAt.toISOString(),
          traffic_limit: limits.traffic,
          product_limit: limits.products,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedUser.store.id)

      if (error) {
        toast.error("Failed to change plan")
        return
      }

      toast.success(`Plan changed to ${changePlanData.plan === 'paid' ? 'Paid' : 'Pro'} successfully`)
      setIsChangePlanDialogOpen(false)
      fetchUsers()
    } catch (err) {
      console.error("Change plan error:", err)
      toast.error("Something went wrong")
    }
  }

  function calculatePlanAmount(plan: string, billingPeriod: string): number {
    if (plan === 'paid') {
      return billingPeriod === 'monthly' ? 500 : 5000
    } else {
      return billingPeriod === 'monthly' ? 1500 : 15000
    }
  }

  async function handleSave() {
    if (!selectedUser) return

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name: formData.name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          role: formData.role,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedUser.id)

      if (profileError) {
        toast.error("Failed to update user profile")
        return
      }

      // Update store if exists
      if (selectedUser.store) {
        const { error: storeError } = await supabase
          .from("stores")
          .update({
            plan: formData.plan,
            status: formData.status,
            updated_at: new Date().toISOString()
          })
          .eq("id", selectedUser.store.id)

        if (storeError) {
          toast.error("Failed to update store")
          return
        }
      }

      toast.success("User updated successfully")
      setIsEditDialogOpen(false)
      fetchUsers()
    } catch (err) {
      console.error("Update error:", err)
      toast.error("Something went wrong")
    }
  }

  async function handleDelete() {
    if (!selectedUser) return

    try {
      // Delete profile (this will cascade delete store and related data due to foreign keys)
      // Note: To fully delete the auth user, you'll need to use Supabase Admin API from a server-side route
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", selectedUser.id)

      if (profileError) {
        toast.error("Failed to delete user")
        return
      }

      toast.success("User deleted successfully. Note: Auth account may still exist and needs to be deleted via Admin API.")
      setIsDeleteDialogOpen(false)
      fetchUsers()
    } catch (err) {
      console.error("Delete error:", err)
      toast.error("Something went wrong")
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl flex flex-col gap-6">
        <div className="animate-pulse">
          <div className="h-7 w-32 bg-muted rounded mb-2" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-normal flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Users
          </h1>
          <p className="text-sm font-normal text-muted-foreground">
            Manage all users across the platform
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search users..." 
            className="pl-9" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-x-scroll scrollbar-visible pb-1">
        <table className="w-full min-w-[1400px] text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">User</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Phone</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Role</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Store</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Plan</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Revenue</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Orders</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Storefront</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Joined</th>
              <th className="px-6 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={12}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No users found matching your search." : "No users yet."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-border/50 last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{user.name || "No name"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{user.email || "-"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{user.phone || "-"}</td>
                  <td className="px-6 py-4">
                    <Select
                      value={user.role}
                      onValueChange={(value) => updateUserRole(user.id, value)}
                    >
                      <SelectTrigger 
                        className={`w-[100px] h-7 text-xs font-medium capitalize border ${roleColors[user.role] || "bg-gray-500/10 text-gray-500 border-gray-500/30"}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
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
                  </td>
                  <td className="px-6 py-4">
                    {user.store ? (
                      <span className="font-medium">{user.store.name}</span>
                    ) : (
                      <span className="text-muted-foreground">No store</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.store ? (
                      <Select
                        value={user.store.plan}
                        onValueChange={(value) => updateStorePlan(user.store!.id, value)}
                      >
                        <SelectTrigger 
                          className={`w-[90px] h-7 text-xs font-medium capitalize border ${planColors[user.store.plan] || "bg-gray-500/10 text-gray-500 border-gray-500/30"}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {planOptions.map((option) => (
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
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.store ? (
                      <Select
                        value={user.store.status}
                        onValueChange={(value) => updateStoreStatus(user.store!.id, value)}
                      >
                        <SelectTrigger 
                          className={`w-[110px] h-7 text-xs font-medium capitalize border ${statusColors[user.store.status] || "bg-gray-500/10 text-gray-500 border-gray-500/30"}`}
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
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.store ? (
                      <span className="font-medium">${user.totalRevenue.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.store ? (
                      <span className="font-medium">{user.totalOrders}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.store ? (
                      <div className="flex flex-col gap-1.5">
                        <a
                          href={`/${user.store.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 w-fit"
                        >
                          <LinkIcon className="h-3 w-3" />
                          /{user.store.username}
                        </a>
                        {user.customDomain && user.customDomain.status === 'verified' && (
                          <a
                            href={`https://${user.customDomain.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 w-fit"
                          >
                            <LinkIcon className="h-3 w-3" />
                            {user.customDomain.domain}
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{formatDate(user.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {user.store && (
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={() => openChangePlanDialog(user)}
                          title="Change Plan"
                        >
                          <Crown className="h-4 w-4 text-orange-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openDeleteDialog(user)}>
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information, role, plan, and status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="User name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="rider">Rider</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedUser?.store && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan</label>
                  <Select value={formData.plan} onValueChange={(value) => setFormData({ ...formData, plan: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Store Status</label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.name || selectedUser?.email}? This action cannot be undone and will delete their profile and store.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Plan Dialog */}
      <Dialog open={isChangePlanDialogOpen} onOpenChange={setIsChangePlanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-orange-600" weight="fill" />
              Change Plan
            </DialogTitle>
            <DialogDescription>
              Select a plan and billing period for {selectedUser?.name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Plan Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Plan</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChangePlanData({ ...changePlanData, plan: 'paid' })}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    changePlanData.plan === 'paid'
                      ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/20'
                      : 'border-border hover:border-orange-300'
                  }`}
                >
                  {changePlanData.plan === 'paid' && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-white" weight="bold" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-orange-600" weight="fill" />
                    <span className="font-semibold text-sm">Paid Plan</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    1,000 products, 50k traffic, 5k orders
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setChangePlanData({ ...changePlanData, plan: 'pro' })}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    changePlanData.plan === 'pro'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20'
                      : 'border-border hover:border-purple-300'
                  }`}
                >
                  {changePlanData.plan === 'pro' && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-white" weight="bold" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-purple-600" weight="fill" />
                    <span className="font-semibold text-sm">Pro Plan</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    10k products, Unlimited traffic & orders
                  </p>
                </button>
              </div>
            </div>

            {/* Billing Period Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Billing Period</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChangePlanData({ ...changePlanData, billingPeriod: 'monthly' })}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    changePlanData.billingPeriod === 'monthly'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">Monthly</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {calculatePlanAmount(changePlanData.plan, 'monthly').toLocaleString()} BDT/month
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setChangePlanData({ ...changePlanData, billingPeriod: 'yearly' })}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    changePlanData.billingPeriod === 'yearly'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">Yearly</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {calculatePlanAmount(changePlanData.plan, 'yearly').toLocaleString()} BDT/year
                  </div>
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-border/50 bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-lg font-bold">
                  {calculatePlanAmount(changePlanData.plan, changePlanData.billingPeriod).toLocaleString()} BDT
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {changePlanData.billingPeriod === 'monthly' ? 'Billed monthly' : 'Billed yearly (save 2 months)'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsChangePlanDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePlan}
              className={`${
                changePlanData.plan === 'paid'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              } text-white`}
            >
              Change Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
