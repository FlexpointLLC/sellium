"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Folders, Plus, MagnifyingGlass, Pencil, Trash, X, Image as ImageIcon, Upload } from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
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

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  image_url: string | null
  store_id: string
  created_at: string
  product_count?: number
}

interface Store {
  id: string
  username: string
}

export default function CategoriesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [store, setStore] = useState<Store | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    status: "active",
    image_url: ""
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push("/login")
      return
    }

    // Fetch store
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("id, username")
      .eq("user_id", user.id)
      .single()

    if (storeError || !storeData) {
      router.push("/onboarding")
      return
    }

    setStore(storeData)

    // Fetch categories with product count
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", storeData.id)
      .order("created_at", { ascending: false })

    if (categoriesData) {
      // Get product counts for each category
      const categoriesWithCounts = await Promise.all(
        categoriesData.map(async (cat) => {
          const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("category_id", cat.id)
          
          return { ...cat, product_count: count || 0 }
        })
      )
      setCategories(categoriesWithCounts)
    }

    setLoading(false)
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  function handleNameChange(name: string) {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name)
    })
  }

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB")
      return
    }

    setImageFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function uploadImage(file: File, categorySlug: string): Promise<string | null> {
    if (!store) return null

    const fileExt = file.name.split('.').pop()
    const fileName = `${store.id}/categories/${categorySlug}-${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('Sellium')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error("Error uploading image:", error)
      return null
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('Sellium')
      .getPublicUrl(fileName)

    return publicUrl
  }

  function removeImage() {
    setFormData({ ...formData, image_url: "" })
    setImageFile(null)
    setImagePreview("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function resetImageState() {
    setImageFile(null)
    setImagePreview("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function handleAddCategory() {
    if (!store || !formData.name.trim()) return

    setSaving(true)

    const slug = formData.slug || generateSlug(formData.name)

    // Upload image if selected
    let imageUrl: string | null = null
    if (imageFile) {
      setUploadingImage(true)
      imageUrl = await uploadImage(imageFile, slug)
      setUploadingImage(false)
    }

    // Try to insert - the schema may or may not have a status column
    const { data, error } = await supabase
      .from("categories")
      .insert({
        store_id: store.id,
        name: formData.name.trim(),
        slug: slug,
        description: formData.description.trim() || null,
        image_url: imageUrl,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating category:", error.message || error)
      alert(`Error creating category: ${error.message || 'Unknown error'}`)
      setSaving(false)
      return
    }

    setCategories([{ ...data, product_count: 0, status: data.status || 'active' }, ...categories])
    setIsAddDialogOpen(false)
    setFormData({ name: "", slug: "", description: "", status: "active", image_url: "" })
    resetImageState()
    setSaving(false)
  }

  async function handleEditCategory() {
    if (!selectedCategory || !formData.name.trim()) return

    setSaving(true)

    const slug = formData.slug || generateSlug(formData.name)

    // Upload new image if selected
    let imageUrl: string | null = formData.image_url || null
    if (imageFile) {
      setUploadingImage(true)
      const newImageUrl = await uploadImage(imageFile, slug)
      if (newImageUrl) {
        imageUrl = newImageUrl
      }
      setUploadingImage(false)
    }

    const { error } = await supabase
      .from("categories")
      .update({
        name: formData.name.trim(),
        slug: slug,
        description: formData.description.trim() || null,
        status: formData.status,
        image_url: imageUrl,
      })
      .eq("id", selectedCategory.id)

    if (error) {
      console.error("Error updating category:", error)
      setSaving(false)
      return
    }

    setCategories(categories.map(cat => 
      cat.id === selectedCategory.id 
        ? { ...cat, name: formData.name, slug: formData.slug, description: formData.description, status: formData.status, image_url: imageUrl }
        : cat
    ))
    setIsEditDialogOpen(false)
    setSelectedCategory(null)
    setFormData({ name: "", slug: "", description: "", status: "active", image_url: "" })
    resetImageState()
    setSaving(false)
  }

  async function handleDeleteCategory() {
    if (!selectedCategory) return

    setSaving(true)

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", selectedCategory.id)

    if (error) {
      console.error("Error deleting category:", error)
      setSaving(false)
      return
    }

    setCategories(categories.filter(cat => cat.id !== selectedCategory.id))
    setIsDeleteDialogOpen(false)
    setSelectedCategory(null)
    setSaving(false)
  }

  function openEditDialog(category: Category) {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      status: category.status,
      image_url: category.image_url || ""
    })
    setIsEditDialogOpen(true)
  }

  function openDeleteDialog(category: Category) {
    setSelectedCategory(category)
    setIsDeleteDialogOpen(true)
  }

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-normal">Categories</h1>
          <p className="text-sm font-normal text-muted-foreground">Manage your product categories</p>
        </div>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus />
          Add Category
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search categories..." 
            className="pl-9" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b">
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Slug</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Products</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Folders className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No categories found matching your search." : "No categories yet."}
                    </p>
                    {!searchQuery && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-4"
                        onClick={() => setIsAddDialogOpen(true)}
                      >
                        <Plus />
                        Add your first category
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredCategories.map((category) => (
                <tr key={category.id} className="border-b last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {category.image_url ? (
                        <img 
                          src={category.image_url} 
                          alt={category.name}
                          className="h-9 w-9 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                          <Folders className="h-4 w-4" />
                        </div>
                      )}
                      <span className="font-medium">{category.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{category.slug}</td>
                  <td className="px-6 py-4">{category.product_count || 0}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        category.status === "active"
                          ? "bg-green-500/10 text-green-500"
                          : category.status === "draft"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-gray-500/10 text-gray-500"
                      }`}
                    >
                      {category.status.charAt(0).toUpperCase() + category.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon-sm"
                        onClick={() => openEditDialog(category)}
                      >
                        <Pencil />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(category)}
                      >
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

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open)
        if (!open) resetImageState()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize your products.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Category Image</Label>
              <div className="flex items-start gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="h-24 w-24 rounded-lg object-cover border"
                    />
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Upload</span>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload />
                    {imagePreview ? "Change Image" : "Upload Image"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: 400x400px. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Electronics"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="e.g. electronics"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly version of the name. Auto-generated from name.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of this category"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddCategory} disabled={saving || uploadingImage || !formData.name.trim()}>
              {uploadingImage ? "Uploading..." : saving ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) resetImageState()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Category Image</Label>
              <div className="flex items-start gap-4">
                {(imagePreview || formData.image_url) ? (
                  <div className="relative">
                    <img 
                      src={imagePreview || formData.image_url} 
                      alt="Preview" 
                      className="h-24 w-24 rounded-lg object-cover border"
                    />
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Upload</span>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload />
                    {(imagePreview || formData.image_url) ? "Change Image" : "Upload Image"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: 400x400px. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g. Electronics"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                placeholder="e.g. electronics"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Input
                id="edit-description"
                placeholder="Brief description of this category"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleEditCategory} disabled={saving || uploadingImage || !formData.name.trim()}>
              {uploadingImage ? "Uploading..." : saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedCategory?.name}&quot;? This action cannot be undone.
              {(selectedCategory?.product_count || 0) > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This category has {selectedCategory?.product_count} product(s) associated with it.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
