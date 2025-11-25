"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Stack, Plus, MagnifyingGlass, Pencil, Trash, X } from "phosphor-react"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface VariantTemplate {
  id: string
  name: string
  display_name: string
  options: string[]
  sort_order: number
  created_at: string
}

interface Store {
  id: string
}

export default function VariantsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [store, setStore] = useState<Store | null>(null)
  const [variants, setVariants] = useState<VariantTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<VariantTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    options: [""]
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
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!storeData) {
      router.push("/onboarding")
      return
    }

    setStore(storeData)

    // Fetch variant templates
    const { data: variantsData } = await supabase
      .from("variants")
      .select("*")
      .eq("store_id", storeData.id)
      .order("sort_order", { ascending: true })

    if (variantsData) {
      setVariants(variantsData)
    }

    setLoading(false)
  }

  function resetForm() {
    setFormData({
      name: "",
      display_name: "",
      options: [""]
    })
    setSelectedVariant(null)
  }

  function handleNameChange(name: string) {
    setFormData({
      ...formData,
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      display_name: formData.display_name || name
    })
  }

  function handleDisplayNameChange(displayName: string) {
    setFormData({
      ...formData,
      display_name: displayName,
      name: formData.name || displayName.toLowerCase().replace(/[^a-z0-9_]/g, "_")
    })
  }

  function addOptionValue() {
    setFormData({
      ...formData,
      options: [...formData.options, ""]
    })
  }

  function updateOptionValue(index: number, value: string) {
    setFormData({
      ...formData,
      options: formData.options.map((v, i) => i === index ? value : v)
    })
  }

  function removeOptionValue(index: number) {
    if (formData.options.length > 1) {
      setFormData({
        ...formData,
        options: formData.options.filter((_, i) => i !== index)
      })
    }
  }

  async function handleAddVariant() {
    if (!store || !formData.name.trim() || !formData.display_name.trim()) return

    setSaving(true)

    const validOptions = formData.options.filter(o => o.trim())
    if (validOptions.length === 0) {
      alert("Please add at least one option value")
      setSaving(false)
      return
    }

    const { data, error } = await supabase
      .from("variants")
      .insert({
        store_id: store.id,
        name: formData.name.trim(),
        display_name: formData.display_name.trim(),
        options: validOptions,
        sort_order: variants.length
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating variant:", error)
      alert(`Error creating variant: ${error.message}`)
      setSaving(false)
      return
    }

    setVariants([...variants, data])
    setIsAddDialogOpen(false)
    resetForm()
    setSaving(false)
  }

  async function handleEditVariant() {
    if (!selectedVariant || !formData.name.trim() || !formData.display_name.trim()) return

    setSaving(true)

    const validOptions = formData.options.filter(o => o.trim())
    if (validOptions.length === 0) {
      alert("Please add at least one option value")
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from("variants")
      .update({
        name: formData.name.trim(),
        display_name: formData.display_name.trim(),
        options: validOptions
      })
      .eq("id", selectedVariant.id)

    if (error) {
      console.error("Error updating variant:", error)
      alert(`Error updating variant: ${error.message}`)
      setSaving(false)
      return
    }

    setVariants(variants.map(v =>
      v.id === selectedVariant.id
        ? { ...v, name: formData.name.trim(), display_name: formData.display_name.trim(), options: validOptions }
        : v
    ))
    setIsEditDialogOpen(false)
    resetForm()
    setSaving(false)
  }

  async function handleDeleteVariant() {
    if (!selectedVariant) return

    setSaving(true)

    const { error } = await supabase
      .from("variants")
      .delete()
      .eq("id", selectedVariant.id)

    if (error) {
      console.error("Error deleting variant:", error)
      setSaving(false)
      return
    }

    setVariants(variants.filter(v => v.id !== selectedVariant.id))
    setIsDeleteDialogOpen(false)
    setSelectedVariant(null)
    setSaving(false)
  }

  function openEditDialog(variant: VariantTemplate) {
    setSelectedVariant(variant)
    setFormData({
      name: variant.name,
      display_name: variant.display_name,
      options: variant.options.length > 0 ? variant.options : [""]
    })
    setIsEditDialogOpen(true)
  }

  function openDeleteDialog(variant: VariantTemplate) {
    setSelectedVariant(variant)
    setIsDeleteDialogOpen(true)
  }

  const filteredVariants = variants.filter(v =>
    v.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-xl font-normal">Variant Templates</h1>
          <p className="text-sm font-normal text-muted-foreground">
            Create reusable variant options for your products
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
          <Plus />
          Add Variant
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search variants..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Tip:</strong> Create variant templates here (like Size, Color, Material) with predefined values. 
          When adding products, you can quickly select from these templates instead of typing them manually each time.
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b">
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Variant Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Options</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVariants.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Stack className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No variants found matching your search." : "No variant templates yet."}
                    </p>
                    {!searchQuery && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
                      >
                        <Plus />
                        Create your first variant template
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredVariants.map((variant) => (
                <tr key={variant.id} className="border-b last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <Stack className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-medium">{variant.display_name}</span>
                        <p className="text-xs text-muted-foreground">{variant.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {variant.options.map((option, index) => (
                        <span
                          key={index}
                          className="inline-flex rounded-md bg-muted px-2 py-1 text-xs"
                        >
                          {option}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(variant)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(variant)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Variant Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsAddDialogOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Variant Template</DialogTitle>
            <DialogDescription>
              Create a reusable variant option with predefined values.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name *</Label>
              <Input
                id="display_name"
                placeholder="e.g. Size, Color, Material"
                value={formData.display_name}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This is what customers will see
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Internal Name</Label>
              <Input
                id="name"
                placeholder="e.g. size, color, material"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used for system identification (lowercase, no spaces)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Option Values *</Label>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Value ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOptionValue(index, e.target.value)}
                    />
                    {formData.options.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => removeOptionValue(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={addOptionValue}
                className="mt-2"
              >
                <Plus />
                Add Value
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsAddDialogOpen(false); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddVariant}
              disabled={saving || !formData.name.trim() || !formData.display_name.trim()}
            >
              {saving ? "Creating..." : "Create Variant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Variant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsEditDialogOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Variant Template</DialogTitle>
            <DialogDescription>
              Update the variant option and its values.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_display_name">Display Name *</Label>
              <Input
                id="edit_display_name"
                placeholder="e.g. Size, Color, Material"
                value={formData.display_name}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_name">Internal Name</Label>
              <Input
                id="edit_name"
                placeholder="e.g. size, color, material"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Option Values *</Label>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Value ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOptionValue(index, e.target.value)}
                    />
                    {formData.options.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => removeOptionValue(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={addOptionValue}
                className="mt-2"
              >
                <Plus />
                Add Value
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsEditDialogOpen(false); }}>
              Cancel
            </Button>
            <Button
              onClick={handleEditVariant}
              disabled={saving || !formData.name.trim() || !formData.display_name.trim()}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variant Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedVariant?.display_name}&quot;? 
              This will not affect products that already use this variant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVariant}
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
