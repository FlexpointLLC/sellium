"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Folders, 
  Plus, 
  MagnifyingGlass, 
  Pencil, 
  Trash, 
  X, 
  Image as ImageIcon, 
  Upload,
  CaretRight,
  CaretDown,
  FolderSimple,
  FolderOpen,
  DotsSixVertical
} from "phosphor-react"
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
import { toast } from "sonner"

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  image_url: string | null
  store_id: string
  parent_id: string | null
  sort_order: number
  created_at: string
  product_count?: number
  children?: Category[]
}

interface Store {
  id: string
  username: string
}

type DropPosition = "above" | "inside" | "below" | null

export default function CategoriesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [store, setStore] = useState<Store | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [flatCategories, setFlatCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  
  // Drag and drop states
  const draggedCategoryRef = useRef<Category | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<DropPosition>(null)
  const [isDragging, setIsDragging] = useState(false)
  
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
    image_url: "",
    parent_id: ""
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Build tree structure from flat categories
  function buildCategoryTree(flatList: Category[]): Category[] {
    const categoryMap = new Map<string, Category>()
    const rootCategories: Category[] = []

    // Sort by sort_order first
    const sortedList = [...flatList].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    // First pass: create map of all categories
    sortedList.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] })
    })

    // Second pass: build tree structure
    sortedList.forEach(cat => {
      const category = categoryMap.get(cat.id)!
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        const parent = categoryMap.get(cat.parent_id)!
        parent.children = parent.children || []
        parent.children.push(category)
      } else {
        rootCategories.push(category)
      }
    })

    return rootCategories
  }

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push("/login")
      return
    }

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

    const { data: categoriesData } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", storeData.id)
      .order("sort_order", { ascending: true })

    if (categoriesData) {
      const categoriesWithCounts = await Promise.all(
        categoriesData.map(async (cat) => {
          const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("category_id", cat.id)
          
          return { ...cat, product_count: count || 0 }
        })
      )
      
      setFlatCategories(categoriesWithCounts)
      const tree = buildCategoryTree(categoriesWithCounts)
      setCategories(tree)
      
      // Expand all parent categories by default
      const parentsWithChildren = new Set(
        categoriesWithCounts
          .filter(cat => cat.parent_id)
          .map(cat => cat.parent_id!)
      )
      setExpandedCategories(parentsWithChildren)
    }

    setLoading(false)
  }

  function toggleExpand(categoryId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
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

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB")
      return
    }

    setImageFile(file)
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function uploadImage(file: File, categorySlug: string, oldImageUrl?: string): Promise<string | null> {
    if (!store) return null

    if (oldImageUrl) {
      try {
        const urlParts = oldImageUrl.split('/Sellium/')
        if (urlParts[1]) {
          const oldFilePath = urlParts[1].split('?')[0]
          await supabase.storage.from('Sellium').remove([oldFilePath])
        }
      } catch (e) {
        console.log("Could not delete old image")
      }
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `categories/${store.id}/${categorySlug}.${fileExt}`

    const { error } = await supabase.storage
      .from('Sellium')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error("Error uploading image:", error)
      alert(`Failed to upload image: ${error.message}`)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('Sellium')
      .getPublicUrl(fileName)

    return `${publicUrl}?t=${Date.now()}`
  }

  function removeImage() {
    setFormData({ ...formData, image_url: "" })
    setImageFile(null)
    setImagePreview("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function resetForm() {
    setFormData({ 
      name: "", 
      slug: "", 
      description: "", 
      status: "active", 
      image_url: "",
      parent_id: ""
    })
    setImageFile(null)
    setImagePreview("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function getAvailableParents(excludeId?: string): Category[] {
    if (!excludeId) return flatCategories
    
    const getDescendantIds = (categoryId: string): string[] => {
      const descendants: string[] = []
      const children = flatCategories.filter(c => c.parent_id === categoryId)
      children.forEach(child => {
        descendants.push(child.id)
        descendants.push(...getDescendantIds(child.id))
      })
      return descendants
    }
    
    const excludeIds = new Set([excludeId, ...getDescendantIds(excludeId)])
    return flatCategories.filter(c => !excludeIds.has(c.id))
  }

  // Check if target is a descendant of dragged
  function isDescendant(draggedId: string, targetId: string): boolean {
    if (draggedId === targetId) return true
    
    const getDescendantIds = (categoryId: string): string[] => {
      const descendants: string[] = []
      const children = flatCategories.filter(c => c.parent_id === categoryId)
      children.forEach(child => {
        descendants.push(child.id)
        descendants.push(...getDescendantIds(child.id))
      })
      return descendants
    }
    
    return getDescendantIds(draggedId).includes(targetId)
  }

  // Drag handlers
  function handleDragStart(e: React.DragEvent, category: Category) {
    // Set data immediately - this is required for drag to work
    e.dataTransfer.setData("text/plain", category.id)
    e.dataTransfer.effectAllowed = "move"
    
    // Store the dragged category
    draggedCategoryRef.current = category
    
    // Use a ghost image
    const dragImage = document.createElement("div")
    dragImage.textContent = category.name
    dragImage.style.cssText = "position: fixed; top: -1000px; left: -1000px; padding: 8px 12px; background: #333; color: white; border-radius: 4px; font-size: 14px; pointer-events: none; z-index: 9999;"
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    
    // Set dragging state after a micro delay to ensure drag starts
    requestAnimationFrame(() => {
      setIsDragging(true)
      document.body.removeChild(dragImage)
    })
  }

  function handleDragEnd() {
    draggedCategoryRef.current = null
    setIsDragging(false)
    setDragOverId(null)
    setDropPosition(null)
  }

  function handleDragOver(e: React.DragEvent, category: Category) {
    e.preventDefault()
    e.stopPropagation()
    
    const dragged = draggedCategoryRef.current
    if (!dragged || dragged.id === category.id) return
    if (isDescendant(dragged.id, category.id)) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height
    
    let position: DropPosition = null
    if (y < height * 0.25) {
      position = "above"
    } else if (y > height * 0.75) {
      position = "below"
    } else {
      position = "inside"
    }
    
    setDragOverId(category.id)
    setDropPosition(position)
  }

  function handleDragLeave(e: React.DragEvent) {
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    
    if (!currentTarget.contains(relatedTarget)) {
      if (dragOverId === (e.currentTarget as HTMLElement).dataset.categoryId) {
        setDragOverId(null)
        setDropPosition(null)
      }
    }
  }

  async function handleDrop(e: React.DragEvent, targetCategory: Category) {
    e.preventDefault()
    e.stopPropagation()
    
    const dragged = draggedCategoryRef.current
    const currentDropPosition = dropPosition // Capture current value
    
    if (!dragged || dragged.id === targetCategory.id) {
      handleDragEnd()
      return
    }
    
    if (isDescendant(dragged.id, targetCategory.id)) {
      toast.error("Cannot move a category into its own subcategory")
      handleDragEnd()
      return
    }

    let newParentId: string | null = null
    let newSortOrder: number = 0

    // Get ALL siblings at a level (including target, excluding dragged)
    const getAllSiblingsAtLevel = (parentId: string | null) => 
      flatCategories
        .filter(c => c.parent_id === parentId && c.id !== dragged.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    if (currentDropPosition === "inside") {
      // Dropping inside - make it a child of target
      newParentId = targetCategory.id
      const existingChildren = getAllSiblingsAtLevel(targetCategory.id)
      newSortOrder = existingChildren.length > 0 
        ? Math.max(...existingChildren.map(c => c.sort_order || 0)) + 10 
        : 10
    } else {
      // Dropping above or below - same level as target
      newParentId = targetCategory.parent_id
      const siblings = getAllSiblingsAtLevel(targetCategory.parent_id)
      const targetIndex = siblings.findIndex(c => c.id === targetCategory.id)
      
      console.log("Drop position:", currentDropPosition)
      console.log("Target:", targetCategory.name, "sort_order:", targetCategory.sort_order)
      console.log("Siblings:", siblings.map(s => ({ name: s.name, sort_order: s.sort_order })))
      console.log("Target index in siblings:", targetIndex)
      
      if (currentDropPosition === "above") {
        if (targetIndex <= 0) {
          // First item or not found - place before target
          newSortOrder = (targetCategory.sort_order || 0) - 10
        } else {
          // Between previous sibling and target
          const prevSibling = siblings[targetIndex - 1]
          newSortOrder = ((prevSibling.sort_order || 0) + (targetCategory.sort_order || 0)) / 2
        }
      } else { // below
        if (targetIndex === -1 || targetIndex >= siblings.length - 1) {
          // Last item or not found - place after target
          newSortOrder = (targetCategory.sort_order || 0) + 10
        } else {
          // Between target and next sibling
          const nextSibling = siblings[targetIndex + 1]
          newSortOrder = ((targetCategory.sort_order || 0) + (nextSibling.sort_order || 0)) / 2
        }
      }
      
      console.log("New sort order:", newSortOrder)
    }

    const { error } = await supabase
      .from("categories")
      .update({ 
        parent_id: newParentId,
        sort_order: newSortOrder
      })
      .eq("id", dragged.id)

    if (error) {
      console.error("Error moving category:", error)
      toast.error("Failed to move category")
    } else {
      if (currentDropPosition === "inside") {
        setExpandedCategories(prev => new Set([...prev, targetCategory.id]))
      }
      
      const action = currentDropPosition === "inside" 
        ? `into "${targetCategory.name}"` 
        : `${currentDropPosition} "${targetCategory.name}"`
      toast.success(`Moved "${dragged.name}" ${action}`)
      
      await fetchData()
    }

    handleDragEnd()
  }

  async function handleDropOnRoot(e: React.DragEvent) {
    e.preventDefault()
    
    const dragged = draggedCategoryRef.current
    if (!dragged || !dragged.parent_id) {
      handleDragEnd()
      return
    }

    const rootCategories = flatCategories.filter(c => !c.parent_id && c.id !== dragged.id)
    const newSortOrder = rootCategories.length > 0 
      ? Math.max(...rootCategories.map(c => c.sort_order || 0)) + 10 
      : 10

    const { error } = await supabase
      .from("categories")
      .update({ 
        parent_id: null,
        sort_order: newSortOrder
      })
      .eq("id", dragged.id)

    if (error) {
      console.error("Error moving category:", error)
      toast.error("Failed to move category")
    } else {
      toast.success(`Moved "${dragged.name}" to root level`)
      await fetchData()
    }

    handleDragEnd()
  }

  async function handleAddCategory() {
    if (!store || !formData.name.trim()) return

    setSaving(true)

    const slug = formData.slug || generateSlug(formData.name)

    let imageUrl: string | null = null
    if (imageFile) {
      setUploadingImage(true)
      imageUrl = await uploadImage(imageFile, slug)
      setUploadingImage(false)
    }

    // Get sort order for new category
    const siblings = flatCategories.filter(c => 
      formData.parent_id ? c.parent_id === formData.parent_id : !c.parent_id
    )
    const newSortOrder = siblings.length > 0 
      ? Math.max(...siblings.map(c => c.sort_order || 0)) + 10 
      : 10

    const { error } = await supabase
      .from("categories")
      .insert({
        store_id: store.id,
        name: formData.name.trim(),
        slug: slug,
        description: formData.description.trim() || null,
        image_url: imageUrl,
        parent_id: formData.parent_id || null,
        sort_order: newSortOrder
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating category:", error)
      alert(`Error creating category: ${error.message || 'Unknown error'}`)
      setSaving(false)
      return
    }

    await fetchData()
    setIsAddDialogOpen(false)
    resetForm()
    setSaving(false)
  }

  async function handleEditCategory() {
    if (!selectedCategory || !formData.name.trim()) return

    setSaving(true)

    const slug = formData.slug || generateSlug(formData.name)

    let imageUrl: string | null = formData.image_url || null
    if (imageFile) {
      setUploadingImage(true)
      const newImageUrl = await uploadImage(imageFile, slug, selectedCategory?.image_url || undefined)
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
        parent_id: formData.parent_id || null,
      })
      .eq("id", selectedCategory.id)

    if (error) {
      console.error("Error updating category:", error)
      setSaving(false)
      return
    }

    await fetchData()
    setIsEditDialogOpen(false)
    setSelectedCategory(null)
    resetForm()
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

    await fetchData()
    setIsDeleteDialogOpen(false)
    setSelectedCategory(null)
    setSaving(false)
  }

  function openAddDialog(parentId?: string) {
    resetForm()
    if (parentId) {
      setFormData(prev => ({ ...prev, parent_id: parentId }))
    }
    setIsAddDialogOpen(true)
  }

  function openEditDialog(category: Category) {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      status: category.status,
      image_url: category.image_url || "",
      parent_id: category.parent_id || ""
    })
    setIsEditDialogOpen(true)
  }

  function openDeleteDialog(category: Category) {
    setSelectedCategory(category)
    setIsDeleteDialogOpen(true)
  }

  function getChildCount(categoryId: string): number {
    return flatCategories.filter(c => c.parent_id === categoryId).length
  }

  function filterCategories(cats: Category[], query: string): Category[] {
    if (!query) return cats
    
    const lowerQuery = query.toLowerCase()
    
    return cats.reduce((acc: Category[], cat) => {
      const matchesSelf = cat.name.toLowerCase().includes(lowerQuery) ||
                          cat.slug.toLowerCase().includes(lowerQuery)
      
      const filteredChildren = cat.children ? filterCategories(cat.children, query) : []
      
      if (matchesSelf || filteredChildren.length > 0) {
        acc.push({
          ...cat,
          children: matchesSelf ? cat.children : filteredChildren
        })
      }
      
      return acc
    }, [])
  }

  const filteredCategories = filterCategories(categories, searchQuery)

  // Helper to get the full URL path for a category
  function getCategoryUrlPath(category: Category): string {
    if (category.parent_id) {
      // Find parent category
      const parent = flatCategories.find(c => c.id === category.parent_id)
      if (parent) {
        return `${parent.slug}/${category.slug}`
      }
    }
    return category.slug
  }

  // Category row component
  function CategoryRow({ category, depth = 0 }: { category: Category; depth?: number }) {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedCategories.has(category.id)
    const childCount = getChildCount(category.id)
    const isOver = dragOverId === category.id
    const isDraggedItem = isDragging && draggedCategoryRef.current?.id === category.id
    
    const getRowStyle = () => {
      if (isDraggedItem) return "opacity-40"
      if (!isOver) return ""
      
      switch (dropPosition) {
        case "above":
          return "border-t-2 border-t-blue-500"
        case "below":
          return "border-b-2 border-b-blue-500"
        case "inside":
          return "bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-500 ring-inset"
        default:
          return ""
      }
    }
    
    return (
      <>
        <tr 
          data-category-id={category.id}
          className={`border-b border-border/50 last:border-0 transition-all select-none ${getRowStyle()}`}
          draggable="true"
          onDragStart={(e) => handleDragStart(e, category)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, category)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, category)}
        >
          <td className="px-4 py-2.5 text-sm">
            <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 20}px` }}>
              <DotsSixVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 cursor-grab active:cursor-grabbing" />
              
              {hasChildren ? (
                <button
                  onClick={(e) => toggleExpand(category.id, e)}
                  className="p-0.5 hover:bg-muted rounded transition-colors flex-shrink-0"
                >
                  {isExpanded ? (
                    <CaretDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <CaretRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ) : (
                <div className="w-5" />
              )}
              
              {hasChildren ? (
                isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" weight="fill" />
                ) : (
                  <FolderSimple className="h-4 w-4 text-amber-500 flex-shrink-0" weight="fill" />
                )
              ) : category.image_url ? (
                <img 
                  src={category.image_url} 
                  alt={category.name}
                  className="h-6 w-6 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded bg-muted flex-shrink-0">
                  <Folders className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{category.name}</span>
                {childCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {childCount} subcategories
                  </span>
                )}
              </div>
            </div>
          </td>
          <td className="px-4 py-2.5 text-muted-foreground text-sm">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              /category/{getCategoryUrlPath(category)}
            </span>
          </td>
          <td className="px-4 py-2.5 text-sm">{category.product_count || 0}</td>
          <td className="px-4 py-2.5">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
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
          <td className="px-4 py-2.5">
            <div className="flex items-center gap-0.5">
              <Button 
                variant="ghost" 
                size="icon-sm"
                onClick={() => openAddDialog(category.id)}
                title="Add subcategory"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon-sm"
                onClick={() => openEditDialog(category)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => openDeleteDialog(category)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </td>
        </tr>
        {hasChildren && isExpanded && category.children!.map(child => (
          <CategoryRow key={child.id} category={child} depth={depth + 1} />
        ))}
      </>
    )
  }

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
          <p className="text-sm font-normal text-muted-foreground">Drag to reorder or nest categories</p>
        </div>
        <Button size="sm" onClick={() => openAddDialog()}>
          <Plus />
          Add Category
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
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

      <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
        {/* Root drop zone */}
        {isDragging && draggedCategoryRef.current?.parent_id && (
          <div 
            className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border-b border-dashed border-blue-300 text-sm text-blue-600 dark:text-blue-400 text-center font-medium"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnRoot}
          >
            Drop here to move to root level
          </div>
        )}
        
        <div className="overflow-x-scroll scrollbar-visible pb-1">
          <table className="w-full min-w-[650px]">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">URL Path</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">Products</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Folders className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        {searchQuery ? "No categories found." : "No categories yet."}
                      </p>
                      {!searchQuery && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="mt-4"
                          onClick={() => openAddDialog()}
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
                  <CategoryRow key={category.id} category={category} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize your products.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Parent Category (optional)</Label>
              <Select
                value={formData.parent_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (root level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root level)</SelectItem>
                  {flatCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.parent_id ? `└─ ${cat.name}` : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category Image</Label>
              <div className="flex items-start gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="h-20 w-20 rounded-lg object-cover border"
                    />
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      className="absolute -top-2 -right-2 h-5 w-5"
                      onClick={removeImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="h-20 w-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
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
                    <Upload className="h-4 w-4 mr-1" />
                    {imagePreview ? "Change" : "Upload"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 5MB
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Men"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="e.g. men"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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
              {uploadingImage ? "Uploading..." : saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Parent Category</Label>
              <Select
                value={formData.parent_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (root level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root level)</SelectItem>
                  {getAvailableParents(selectedCategory?.id).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.parent_id ? `└─ ${cat.name}` : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category Image</Label>
              <div className="flex items-start gap-4">
                {(imagePreview || formData.image_url) ? (
                  <div className="relative">
                    <img 
                      src={imagePreview || formData.image_url} 
                      alt="Preview" 
                      className="h-20 w-20 rounded-lg object-cover border"
                    />
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      className="absolute -top-2 -right-2 h-5 w-5"
                      onClick={removeImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="h-20 w-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
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
                    <Upload className="h-4 w-4 mr-1" />
                    {(imagePreview || formData.image_url) ? "Change" : "Upload"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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
              {uploadingImage ? "Uploading..." : saving ? "Saving..." : "Save"}
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
              Are you sure you want to delete &quot;{selectedCategory?.name}&quot;?
              {(selectedCategory?.product_count || 0) > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: {selectedCategory?.product_count} product(s) will lose their category.
                </span>
              )}
              {getChildCount(selectedCategory?.id || '') > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: {getChildCount(selectedCategory?.id || '')} subcategories will become root categories.
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
