"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Megaphone } from "phosphor-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { MagnifyingGlass, Check, CaretDown, Trash } from "phosphor-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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

interface Notice {
  id: string
  title: string
  description: string
  color: string
  status: string
  store_id: string | null
  store_name: string | null
  closeable: boolean
  created_at: string
}

interface Store {
  id: string
  name: string
}

type TabType = "notice" | "history"

export default function AdminNoticePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("notice")
  
  // Notice form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("grey")
  const [storeId, setStoreId] = useState<string>("all")
  const [closeable, setCloseable] = useState(false)
  const [saving, setSaving] = useState(false)
  const [storeSearchOpen, setStoreSearchOpen] = useState(false)
  const [storeSearchQuery, setStoreSearchQuery] = useState("")
  const storeDropdownRef = useRef<HTMLDivElement>(null)
  
  // History state
  const [notices, setNotices] = useState<Notice[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noticeToDelete, setNoticeToDelete] = useState<string | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target as Node)) {
        setStoreSearchOpen(false)
      }
    }

    if (storeSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [storeSearchOpen])

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
      fetchStores()
      fetchNotices()
      setLoading(false)
    }

    checkAccess()
  }, [supabase, router])

  async function fetchStores() {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name")
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching stores:", error)
      return
    }

    setStores(data || [])
  }

  async function fetchNotices() {
    const { data, error } = await supabase
      .from("notices")
      .select(`
        *,
        stores(name)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching notices:", error)
      toast.error("Failed to load notices")
      return
    }

    const noticesWithStoreNames = (data || []).map((notice: any) => ({
      ...notice,
      store_name: notice.stores?.name || null,
    }))

    setNotices(noticesWithStoreNames)
  }

  async function handleCreateNotice() {
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields")
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from("notices")
      .insert({
        title: title.trim(),
        description: description.trim(),
        color: color,
        status: "active",
        store_id: storeId === "all" ? null : storeId,
        closeable: closeable,
      })

    if (error) {
      console.error("Error creating notice:", error)
      toast.error("Failed to create notice")
      setSaving(false)
      return
    }

    toast.success("Notice created successfully")
    setTitle("")
    setDescription("")
    setColor("grey")
    setStoreId("all")
    setCloseable(false)
    fetchNotices()
    setSaving(false)
  }

  async function updateNoticeColor(noticeId: string, newColor: string) {
    const { error } = await supabase
      .from("notices")
      .update({ color: newColor })
      .eq("id", noticeId)

    if (error) {
      console.error("Error updating notice color:", error)
      toast.error("Failed to update notice color")
      return
    }

    fetchNotices()
  }

  async function updateNoticeStatus(noticeId: string, newStatus: string) {
    const { error } = await supabase
      .from("notices")
      .update({ status: newStatus })
      .eq("id", noticeId)

    if (error) {
      console.error("Error updating notice status:", error)
      toast.error("Failed to update notice status")
      return
    }

    fetchNotices()
  }

  async function handleDeleteNotice() {
    if (!noticeToDelete) return

    const { error } = await supabase
      .from("notices")
      .delete()
      .eq("id", noticeToDelete)

    if (error) {
      console.error("Error deleting notice:", error)
      toast.error("Failed to delete notice")
      return
    }

    toast.success("Notice deleted successfully")
    setDeleteDialogOpen(false)
    setNoticeToDelete(null)
    fetchNotices()
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl flex flex-col gap-6">
        <div className="animate-pulse">
          <div className="h-7 w-32 bg-muted rounded mb-2" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
      </div>
    )
  }

  const colorOptions = [
    { value: "red", label: "Red" },
    { value: "green", label: "Green" },
    { value: "blue", label: "Blue" },
    { value: "yellow", label: "Yellow" },
    { value: "grey", label: "Grey" },
  ]

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ]

  const getColorBadgeClass = (color: string) => {
    const colors: Record<string, string> = {
      red: "bg-red-500",
      green: "bg-green-500",
      blue: "bg-blue-500",
      yellow: "bg-yellow-500",
      grey: "bg-gray-500",
    }
    return colors[color] || "bg-gray-500"
  }

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-normal flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Notice
          </h1>
          <p className="text-sm font-normal text-muted-foreground">
            Create and manage system-wide notices
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/50">
        <button
          onClick={() => setActiveTab("notice")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "notice"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Notice
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "history"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          History
        </button>
      </div>

      {/* Notice Tab */}
      {activeTab === "notice" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Create Notice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store">Store</Label>
              <div className="relative" ref={storeDropdownRef}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStoreSearchOpen(!storeSearchOpen)}
                  className="w-full justify-between"
                >
                  {storeId === "all"
                    ? "All Stores (Global)"
                    : stores.find((store) => store.id === storeId)?.name || "Select store..."}
                  <CaretDown className={cn("ml-2 h-4 w-4 shrink-0 transition-transform", storeSearchOpen && "rotate-180")} />
                </Button>
                {storeSearchOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                    <div className="p-2">
                      <div className="flex items-center border-b px-3 pb-2 mb-2">
                        <MagnifyingGlass className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                          placeholder="Search stores..."
                          value={storeSearchQuery}
                          onChange={(e) => setStoreSearchQuery(e.target.value)}
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        <div
                          className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                            storeId === "all" && "bg-accent"
                          )}
                          onClick={() => {
                            setStoreId("all")
                            setStoreSearchOpen(false)
                            setStoreSearchQuery("")
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              storeId === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All Stores (Global)
                        </div>
                        {stores
                          .filter((store) =>
                            store.name.toLowerCase().includes(storeSearchQuery.toLowerCase())
                          )
                          .map((store) => (
                            <div
                              key={store.id}
                              className={cn(
                                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                storeId === store.id && "bg-accent"
                              )}
                              onClick={() => {
                                setStoreId(store.id)
                                setStoreSearchOpen(false)
                                setStoreSearchQuery("")
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  storeId === store.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {store.name}
                            </div>
                          ))}
                        {stores.filter((store) =>
                          store.name.toLowerCase().includes(storeSearchQuery.toLowerCase())
                        ).length === 0 && storeSearchQuery && (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No stores found.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter notice title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter notice description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger id="color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="closeable"
                checked={closeable}
                onCheckedChange={(checked) => setCloseable(checked === true)}
              />
              <Label
                htmlFor="closeable"
                className="text-sm font-normal leading-none cursor-pointer"
              >
                Close button
              </Label>
            </div>

            <Button onClick={handleCreateNotice} disabled={saving}>
              {saving ? "Creating..." : "Create Notice"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notice History</CardTitle>
          </CardHeader>
          <CardContent>
            {notices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No notices found</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 bg-card overflow-x-scroll scrollbar-visible pb-1">
                <table className="w-full min-w-[1100px] text-sm table-fixed">
                  <colgroup>
                    <col className="w-[200px]" />
                    <col className="w-[300px]" />
                    <col className="w-[150px]" />
                    <col className="w-[150px]" />
                    <col className="w-[150px]" />
                    <col className="w-[100px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Title</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Description</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Store</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Color</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notices.map((notice) => (
                      <tr key={notice.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="px-6 py-4 font-medium">{notice.title}</td>
                        <td className="px-6 py-4">
                          <div className="truncate" title={notice.description}>
                            {notice.description}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-muted-foreground">
                            {notice.store_name || "All Stores"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Select
                            value={notice.color}
                            onValueChange={(value) => updateNoticeColor(notice.id, value)}
                          >
                            <SelectTrigger className="w-[120px] h-7 text-xs">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${getColorBadgeClass(notice.color)}`} />
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {colorOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${getColorBadgeClass(option.value)}`} />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-4">
                          <Select
                            value={notice.status}
                            onValueChange={(value) => updateNoticeStatus(notice.id, value)}
                          >
                            <SelectTrigger 
                              className={`w-[110px] h-7 text-xs font-medium capitalize border ${
                                notice.status === "active"
                                  ? "bg-green-500/10 text-green-500 border-green-500/30"
                                  : "bg-gray-500/10 text-gray-500 border-gray-500/30"
                              }`}
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
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNoticeToDelete(notice.id)
                              setDeleteDialogOpen(true)
                            }}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNotice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

