"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Package, Plus, MagnifyingGlass, Pencil, Trash, X, 
  CaretRight, CaretLeft, Check, Stack, Lightning
} from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  compare_at_price: number | null
  sku: string | null
  stock: number
  status: string
  image_url: string | null
  category_id: string | null
  has_variants: boolean
  variant_count?: number
}

interface Category {
  id: string
  name: string
}

interface VariantTemplate {
  id: string
  name: string
  display_name: string
  options: string[]
}

interface ProductOption {
  id: string
  name: string
  display_name: string
  values: string[]
  isFromTemplate: boolean
  templateId?: string
}

interface ProductVariant {
  id: string
  combination: Record<string, string>
  price: number
  stock: number
  sku: string
  enabled: boolean
}

interface Store {
  id: string
  username: string
}

export default function ProductsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [variantTemplates, setVariantTemplates] = useState<VariantTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
  // Wizard step (1: Basic Info, 2: Options, 3: Variants)
  const [wizardStep, setWizardStep] = useState(1)
  const [editWizardStep, setEditWizardStep] = useState(1)
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    compare_at_price: "",
    sku: "",
    stock: "",
    status: "draft",
    category_id: "",
    has_variants: false
  })
  
  // Variant options
  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const [generatedVariants, setGeneratedVariants] = useState<ProductVariant[]>([])

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
    const { data: storeData } = await supabase
      .from("stores")
      .select("id, username")
      .eq("user_id", user.id)
      .single()

    if (!storeData) {
      router.push("/onboarding")
      return
    }

    setStore(storeData)

    // Fetch products
    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", storeData.id)
      .order("created_at", { ascending: false })

    if (productsData) {
      // For products with variants, fetch the total stock from product_variants
      const productsWithStock = await Promise.all(productsData.map(async (p) => {
        if (p.has_variants) {
          // Get total stock from all variants
          const { data: variants } = await supabase
            .from("product_variants")
            .select("stock")
            .eq("product_id", p.id)
            .eq("enabled", true)
          
          const totalStock = variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0
          return { 
            ...p, 
            has_variants: true, 
            variant_count: p.variant_count || variants?.length || 0,
            stock: totalStock  // Override stock with combined variant stock
          }
        }
        return { 
          ...p, 
          has_variants: p.has_variants || false, 
          variant_count: p.variant_count || 0 
        }
      }))
      
      setProducts(productsWithStock)
    }

    // Fetch categories
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name")
      .eq("store_id", storeData.id)
      .order("name")

    if (categoriesData) {
      setCategories(categoriesData)
    }

    // Fetch variant templates
    const { data: variantsData } = await supabase
      .from("variants")
      .select("id, name, display_name, options")
      .eq("store_id", storeData.id)
      .order("sort_order")

    if (variantsData) {
      setVariantTemplates(variantsData)
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

  function resetForm() {
    setFormData({
      name: "",
      slug: "",
      description: "",
      price: "",
      compare_at_price: "",
      sku: "",
      stock: "",
      status: "draft",
      category_id: "",
      has_variants: false
    })
    setProductOptions([])
    setGeneratedVariants([])
    setWizardStep(1)
    setEditWizardStep(1)
    setSelectedProduct(null)
    setFormError(null)
  }

  function addOption() {
    setProductOptions([
      ...productOptions,
      { id: crypto.randomUUID(), name: "", display_name: "", values: [""], isFromTemplate: false }
    ])
  }

  function addOptionFromTemplate(template: VariantTemplate) {
    // Check if this template is already added
    if (productOptions.some(o => o.templateId === template.id)) {
      return
    }
    
    setProductOptions([
      ...productOptions,
      { 
        id: crypto.randomUUID(), 
        name: template.name, 
        display_name: template.display_name,
        values: [...template.options], 
        isFromTemplate: true,
        templateId: template.id
      }
    ])
  }

  function removeOption(optionId: string) {
    setProductOptions(productOptions.filter(o => o.id !== optionId))
  }

  function updateOptionName(optionId: string, name: string, displayName?: string) {
    setProductOptions(productOptions.map(o => 
      o.id === optionId ? { ...o, name, display_name: displayName || name } : o
    ))
  }

  function addOptionValue(optionId: string) {
    setProductOptions(productOptions.map(o => 
      o.id === optionId ? { ...o, values: [...o.values, ""] } : o
    ))
  }

  function updateOptionValue(optionId: string, index: number, value: string) {
    setProductOptions(productOptions.map(o => 
      o.id === optionId 
        ? { ...o, values: o.values.map((v, i) => i === index ? value : v) }
        : o
    ))
  }

  function removeOptionValue(optionId: string, index: number) {
    setProductOptions(productOptions.map(o => 
      o.id === optionId 
        ? { ...o, values: o.values.filter((_, i) => i !== index) }
        : o
    ))
  }

  function generateVariants() {
    // Filter out empty options and values
    const validOptions = productOptions
      .filter(o => (o.name.trim() || o.display_name.trim()) && o.values.some(v => v.trim()))
      .map(o => ({ ...o, values: o.values.filter(v => v.trim()) }))

    if (validOptions.length === 0) {
      setGeneratedVariants([])
      return
    }

    // Generate all combinations
    const combinations: Record<string, string>[] = []
    
    function generateCombinations(optionIndex: number, current: Record<string, string>) {
      if (optionIndex >= validOptions.length) {
        combinations.push({ ...current })
        return
      }
      
      const option = validOptions[optionIndex]
      for (const value of option.values) {
        current[option.display_name || option.name] = value
        generateCombinations(optionIndex + 1, current)
      }
    }
    
    generateCombinations(0, {})

    // Create variant objects
    const variants: ProductVariant[] = combinations.map((combo, index) => ({
      id: crypto.randomUUID(),
      combination: combo,
      price: parseFloat(formData.price) || 0,
      stock: 0,
      sku: formData.sku ? `${formData.sku}-${index + 1}` : "",
      enabled: true
    }))

    setGeneratedVariants(variants)
  }

  function updateVariant(variantId: string, field: keyof ProductVariant, value: any) {
    console.log(`updateVariant called: field=${field}, value=${value}, type=${typeof value}`)
    setGeneratedVariants(generatedVariants.map(v => 
      v.id === variantId ? { ...v, [field]: value } : v
    ))
  }

  function getVariantTitle(combination: Record<string, string>) {
    return Object.values(combination).join(" / ")
  }

  async function saveNewVariantTemplates() {
    if (!store) return

    // Find custom options (not from templates) that have valid data
    const customOptions = productOptions.filter(
      o => !o.isFromTemplate && 
           (o.name.trim() || o.display_name.trim()) && 
           o.values.some(v => v.trim())
    )

    // Save each custom option as a variant template
    for (const option of customOptions) {
      const validValues = option.values.filter(v => v.trim())
      if (validValues.length === 0) continue

      // Check if a template with this name already exists
      const existingTemplate = variantTemplates.find(
        t => t.name.toLowerCase() === option.name.toLowerCase() ||
             t.display_name.toLowerCase() === (option.display_name || option.name).toLowerCase()
      )

      if (!existingTemplate) {
        const { data, error } = await supabase
          .from("variants")
          .insert({
            store_id: store.id,
            name: option.name || option.display_name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
            display_name: option.display_name || option.name,
            options: validValues,
            sort_order: variantTemplates.length
          })
          .select()
          .single()

        if (!error && data) {
          // Add to local state
          setVariantTemplates([...variantTemplates, data])
        }
      }
    }
  }

  async function handleSaveProduct() {
    if (!store || !formData.name.trim()) return

    setSaving(true)

    const variantCount = formData.has_variants ? generatedVariants.filter(v => v.enabled).length : 0
    const sku = formData.sku.trim() || null
    const productSlug = formData.slug || generateSlug(formData.name)
    
    // Check if SKU already exists
    if (sku) {
      const { data: existingProduct } = await supabase
        .from("products")
        .select("id, name, slug")
        .eq("store_id", store.id)
        .eq("sku", sku)
        .single()

      if (existingProduct) {
        // SKU exists - check if name and slug match
        if (existingProduct.name === formData.name.trim() && existingProduct.slug === productSlug) {
          // Same SKU, same name/slug - UPDATE existing product
          const productData = {
            name: formData.name.trim(),
            slug: productSlug,
            description: formData.description.trim() || null,
            price: parseFloat(formData.price) || 0,
            compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
            sku: sku,
            stock: parseInt(formData.stock) || 0,
            status: formData.status,
            category_id: formData.category_id || null,
            has_variants: formData.has_variants,
            variant_count: variantCount,
          }

          const { data, error } = await supabase
            .from("products")
            .update(productData)
            .eq("id", existingProduct.id)
            .select()
            .single()

          if (error) {
            console.error("Error updating product:", error)
            setFormError(`Error updating product: ${error.message}`)
            setSaving(false)
            return
          }

          // Handle variants for updated product
          if (formData.has_variants) {
            await saveNewVariantTemplates()
            
            // Delete existing variants and insert new ones
            await supabase
              .from("product_variants")
              .delete()
              .eq("product_id", existingProduct.id)

            const enabledVariants = generatedVariants.filter(v => v.enabled)
            if (enabledVariants.length > 0) {
              const variantsToInsert = enabledVariants.map((v, index) => ({
                product_id: existingProduct.id,
                title: getVariantTitle(v.combination),
                options: v.combination,
                price: v.price || parseFloat(formData.price) || 0,
                sku: v.sku || null,
                stock: parseInt(String(v.stock)) || 0,
                enabled: v.enabled,
                is_default: index === 0,
              }))

              await supabase
                .from("product_variants")
                .insert(variantsToInsert)
            }
          }

          // Calculate total stock from variants if has_variants
          const totalStock = formData.has_variants 
            ? generatedVariants.filter(v => v.enabled).reduce((sum, v) => sum + (v.stock || 0), 0)
            : parseInt(formData.stock) || 0

          // Update local state - replace existing product
          setProducts(products.map(p =>
            p.id === existingProduct.id
              ? { ...data, has_variants: formData.has_variants, variant_count: variantCount, stock: totalStock }
              : p
          ))
          setIsAddDialogOpen(false)
          resetForm()
          setSaving(false)
          return
        } else {
          // Same SKU but different name/slug - show error
          setFormError("Duplicate SKU: A product with this SKU already exists but has a different name or slug.")
          setSaving(false)
          return
        }
      }
    }
    
    // No existing SKU or no SKU provided - create new product
    const productData = {
      store_id: store.id,
      name: formData.name.trim(),
      slug: productSlug,
      description: formData.description.trim() || null,
      price: parseFloat(formData.price) || 0,
      compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
      sku: sku,
      stock: parseInt(formData.stock) || 0,
      status: formData.status,
      category_id: formData.category_id || null,
      has_variants: formData.has_variants,
      variant_count: variantCount,
    }

    const { data, error } = await supabase
      .from("products")
      .insert(productData)
      .select()
      .single()

    if (error) {
      console.error("Error creating product:", error)
      setFormError(`Error creating product: ${error.message}`)
      setSaving(false)
      return
    }

    // Save new custom variant options as templates
    if (formData.has_variants) {
      await saveNewVariantTemplates()
      
      // Save product variants
      const enabledVariants = generatedVariants.filter(v => v.enabled)
      console.log("Add - Enabled variants to save:", JSON.stringify(enabledVariants, null, 2))
      
      if (enabledVariants.length > 0) {
        const variantsToInsert = enabledVariants.map((v, index) => {
          console.log(`Add Variant ${index}: stock = ${v.stock}, type = ${typeof v.stock}`)
          return {
            product_id: data.id,
            title: getVariantTitle(v.combination),
            options: v.combination,
            price: v.price || parseFloat(formData.price) || 0,
            sku: v.sku || null,
            stock: parseInt(String(v.stock)) || 0,
            enabled: v.enabled,
            is_default: index === 0,
          }
        })

        console.log("Add - Variants to insert:", JSON.stringify(variantsToInsert, null, 2))

        const { data: insertedVariants, error: variantError } = await supabase
          .from("product_variants")
          .insert(variantsToInsert)
          .select()

        console.log("Add - Inserted variants:", JSON.stringify(insertedVariants, null, 2))
        
        if (variantError) {
          console.error("Error saving variants:", variantError)
          setFormError(`Error saving variants: ${variantError.message}`)
        }
      }
    }

    // Calculate total stock from variants if has_variants
    const totalStock = formData.has_variants 
      ? generatedVariants.filter(v => v.enabled).reduce((sum, v) => sum + (v.stock || 0), 0)
      : parseInt(formData.stock) || 0
    
    setProducts([{ ...data, has_variants: formData.has_variants, variant_count: variantCount, stock: totalStock }, ...products])
    setIsAddDialogOpen(false)
    resetForm()
    setSaving(false)
  }

  async function handleDeleteProduct() {
    if (!selectedProduct) return

    setSaving(true)

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", selectedProduct.id)

    if (error) {
      console.error("Error deleting product:", error)
      setSaving(false)
      return
    }

    setProducts(products.filter(p => p.id !== selectedProduct.id))
    setIsDeleteDialogOpen(false)
    setSelectedProduct(null)
    setSaving(false)
  }

  async function openEditDialog(product: Product) {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      price: product.price.toString(),
      compare_at_price: product.compare_at_price?.toString() || "",
      sku: product.sku || "",
      stock: product.stock.toString(),
      status: product.status,
      category_id: product.category_id || "",
      has_variants: product.has_variants || false
    })
    
    // Load existing variants if product has variants
    if (product.has_variants) {
      const { data: existingVariants } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)

      console.log("Loaded existing variants from DB:", JSON.stringify(existingVariants, null, 2))
      
      if (existingVariants && existingVariants.length > 0) {
        // Extract unique option names from variants
        const optionNames = new Set<string>()
        existingVariants.forEach(v => {
          if (v.options && typeof v.options === 'object') {
            Object.keys(v.options).forEach(key => optionNames.add(key))
          }
        })

        // Build product options from existing variants
        const options: ProductOption[] = Array.from(optionNames).map(name => {
          const values = new Set<string>()
          existingVariants.forEach(v => {
            if (v.options && v.options[name]) {
              values.add(v.options[name])
            }
          })
          return {
            id: crypto.randomUUID(),
            name: name.toLowerCase().replace(/\s+/g, '_'),
            display_name: name,
            values: Array.from(values),
            isFromTemplate: false
          }
        })

        setProductOptions(options.length > 0 ? options : [{ id: crypto.randomUUID(), name: "", display_name: "", values: [""], isFromTemplate: false }])

        // Convert existing variants to our format
        const variants: ProductVariant[] = existingVariants.map(v => ({
          id: v.id,
          combination: v.options || {},
          price: parseFloat(v.price) || 0,
          stock: v.stock || 0,
          sku: v.sku || "",
          enabled: v.enabled !== false
        }))
        setGeneratedVariants(variants)
      } else {
        setProductOptions([{ id: crypto.randomUUID(), name: "", display_name: "", values: [""], isFromTemplate: false }])
        setGeneratedVariants([])
      }
    } else {
      setProductOptions([])
      setGeneratedVariants([])
    }
    
    setEditWizardStep(1)
    setIsEditDialogOpen(true)
  }

  function openDeleteDialog(product: Product) {
    setSelectedProduct(product)
    setIsDeleteDialogOpen(true)
  }

  async function handleEditProduct() {
    if (!selectedProduct || !formData.name.trim()) return

    setSaving(true)

    const variantCount = formData.has_variants ? generatedVariants.filter(v => v.enabled).length : 0

    const productData = {
      name: formData.name.trim(),
      slug: formData.slug || generateSlug(formData.name),
      description: formData.description.trim() || null,
      price: parseFloat(formData.price) || 0,
      compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
      sku: formData.sku.trim() || null,
      stock: parseInt(formData.stock) || 0,
      status: formData.status,
      category_id: formData.category_id || null,
      has_variants: formData.has_variants,
      variant_count: variantCount,
    }

    const { error } = await supabase
      .from("products")
      .update(productData)
      .eq("id", selectedProduct.id)

    if (error) {
      console.error("Error updating product:", error)
      setFormError(`Error updating product: ${error.message}`)
      setSaving(false)
      return
    }

    // Save new custom variant options as templates
    if (formData.has_variants) {
      await saveNewVariantTemplates()
      
      // Delete existing variants and insert new ones
      await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", selectedProduct.id)

      // Save product variants
      const enabledVariants = generatedVariants.filter(v => v.enabled)
      console.log("Edit - Enabled variants to save:", JSON.stringify(enabledVariants, null, 2))
      
      if (enabledVariants.length > 0) {
        const variantsToInsert = enabledVariants.map((v, index) => {
          console.log(`Variant ${index}: stock = ${v.stock}, type = ${typeof v.stock}`)
          return {
            product_id: selectedProduct.id,
            title: getVariantTitle(v.combination),
            options: v.combination,
            price: v.price || parseFloat(formData.price) || 0,
            sku: v.sku || null,
            stock: parseInt(String(v.stock)) || 0,
            enabled: v.enabled,
            is_default: index === 0,
          }
        })

        console.log("Edit - Variants to insert:", JSON.stringify(variantsToInsert, null, 2))

        const { data: insertedVariants, error: variantError } = await supabase
          .from("product_variants")
          .insert(variantsToInsert)
          .select()

        console.log("Edit - Inserted variants:", JSON.stringify(insertedVariants, null, 2))
        
        if (variantError) {
          console.error("Error saving variants:", variantError)
          setFormError(`Error saving variants: ${variantError.message}`)
        }
      }
    } else {
      // If variants are disabled, delete all existing variants
      await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", selectedProduct.id)
    }

    // Calculate total stock from variants if has_variants
    const totalStock = formData.has_variants 
      ? generatedVariants.filter(v => v.enabled).reduce((sum, v) => sum + (v.stock || 0), 0)
      : parseInt(formData.stock) || 0
    
    setProducts(products.map(p =>
      p.id === selectedProduct.id
        ? { ...p, ...productData, has_variants: formData.has_variants, variant_count: variantCount, stock: totalStock }
        : p
    ))
    setIsEditDialogOpen(false)
    resetForm()
    setSaving(false)
  }

  function nextStep() {
    if (wizardStep === 2 && formData.has_variants) {
      generateVariants()
    }
    setWizardStep(Math.min(wizardStep + 1, formData.has_variants ? 3 : 1))
  }

  function prevStep() {
    setWizardStep(Math.max(wizardStep - 1, 1))
  }

  function nextEditStep() {
    if (editWizardStep === 2 && formData.has_variants) {
      // Only regenerate if we don't have existing variants or options changed
      if (generatedVariants.length === 0) {
        generateVariants()
      } else {
        // Merge existing variants with new combinations (preserve stock, price, sku)
        mergeVariants()
      }
    }
    setEditWizardStep(Math.min(editWizardStep + 1, formData.has_variants ? 3 : 1))
  }

  function mergeVariants() {
    // Filter out empty options and values
    const validOptions = productOptions
      .filter(o => (o.name.trim() || o.display_name.trim()) && o.values.some(v => v.trim()))
      .map(o => ({ ...o, values: o.values.filter(v => v.trim()) }))

    if (validOptions.length === 0) {
      setGeneratedVariants([])
      return
    }

    // Generate all combinations
    const combinations: Record<string, string>[] = []
    
    function generateCombinations(optionIndex: number, current: Record<string, string>) {
      if (optionIndex >= validOptions.length) {
        combinations.push({ ...current })
        return
      }
      
      const option = validOptions[optionIndex]
      for (const value of option.values) {
        current[option.display_name || option.name] = value
        generateCombinations(optionIndex + 1, current)
      }
    }
    
    generateCombinations(0, {})

    // Create variant objects, preserving existing data where possible
    const variants: ProductVariant[] = combinations.map((combo, index) => {
      // Try to find existing variant with same combination
      const existingVariant = generatedVariants.find(v => {
        const comboKeys = Object.keys(combo)
        const existingKeys = Object.keys(v.combination)
        if (comboKeys.length !== existingKeys.length) return false
        return comboKeys.every(key => v.combination[key] === combo[key])
      })

      if (existingVariant) {
        // Preserve existing data
        return { ...existingVariant, combination: combo }
      }

      // Create new variant with defaults
      return {
        id: crypto.randomUUID(),
        combination: combo,
        price: parseFloat(formData.price) || 0,
        stock: 0,
        sku: formData.sku ? `${formData.sku}-${index + 1}` : "",
        enabled: true
      }
    })

    setGeneratedVariants(variants)
  }

  function prevEditStep() {
    setEditWizardStep(Math.max(editWizardStep - 1, 1))
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const maxSteps = formData.has_variants ? 3 : 1
  const editMaxSteps = formData.has_variants ? 3 : 1

  // Get available templates (not already added)
  const availableTemplates = variantTemplates.filter(
    t => !productOptions.some(o => o.templateId === t.id)
  )

  // Render variant options UI (shared between add and edit)
  function renderVariantOptionsUI() {
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground">
          Add options like Size, Color, Material, etc. Each option can have multiple values.
        </p>

        {/* Quick Add from Templates */}
        {availableTemplates.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lightning className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">Quick Add from Templates</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTemplates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  onClick={() => addOptionFromTemplate(template)}
                >
                  <Stack />
                  {template.display_name}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({template.options.length})
                  </span>
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to add a pre-defined variant option. You can still customize the values.
            </p>
          </div>
        )}

        {productOptions.map((option, optionIndex) => (
          <div key={option.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Option {optionIndex + 1}</Label>
                {option.isFromTemplate && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    <Stack />
                    From template
                  </span>
                )}
              </div>
              {productOptions.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeOption(option.id)}
                >
                  <X />
                </Button>
              )}
            </div>
            
            <Input
              placeholder="Option name (e.g. Size, Color)"
              value={option.display_name || option.name}
              onChange={(e) => updateOptionName(option.id, e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"), e.target.value)}
            />

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Values</Label>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value, valueIndex) => (
                  <div key={valueIndex} className="flex items-center gap-1">
                    <Input
                      className="w-24"
                      placeholder="Value"
                      value={value}
                      onChange={(e) => updateOptionValue(option.id, valueIndex, e.target.value)}
                    />
                    {option.values.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeOptionValue(option.id, valueIndex)}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addOptionValue(option.id)}
                >
                  <Plus />
                  Add Value
                </Button>
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addOption} className="w-full">
          <Plus />
          Add Custom Option
        </Button>
      </div>
    )
  }

  // Render variant table UI (shared between add and edit)
  function renderVariantTableUI() {
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground">
          Review and customize price, stock, and SKU for each variant. Uncheck to disable a variant.
        </p>

        {generatedVariants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No variants generated. Go back and add option values.
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Enabled</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Variant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Price</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Stock</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedVariants.map((variant) => (
                    <tr key={variant.id} className={`border-b last:border-0 ${!variant.enabled ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        <Switch
                          checked={variant.enabled}
                          onCheckedChange={(checked) => updateVariant(variant.id, "enabled", checked)}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {getVariantTitle(variant.combination)}
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          value={variant.price}
                          onChange={(e) => updateVariant(variant.id, "price", parseFloat(e.target.value) || 0)}
                          disabled={!variant.enabled}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          className="w-20"
                          value={variant.stock}
                          onChange={(e) => updateVariant(variant.id, "stock", parseInt(e.target.value) || 0)}
                          disabled={!variant.enabled}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          className="w-28"
                          value={variant.sku}
                          onChange={(e) => updateVariant(variant.id, "sku", e.target.value)}
                          disabled={!variant.enabled}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {generatedVariants.filter(v => v.enabled).length} of {generatedVariants.length} variants enabled
        </p>
      </div>
    )
  }

  // Render basic info form (shared between add and edit)
  function renderBasicInfoForm(isEdit: boolean = false) {
    const idPrefix = isEdit ? "edit_" : ""
    
    return (
      <div className="space-y-4 py-4">
        {/* SKU at top for quick lookup */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}sku`} className="text-sm font-medium">SKU (Stock Keeping Unit)</Label>
            <div className="flex gap-2">
              <Input
                id={`${idPrefix}sku`}
                placeholder="e.g. TSH-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="flex-1"
              />
              <Button 
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!formData.sku.trim() || !store) return
                  const { data } = await supabase
                    .from("products")
                    .select("*")
                    .eq("store_id", store.id)
                    .eq("sku", formData.sku.trim())
                    .single()
                  if (data) {
                    setFormData({
                      name: data.name,
                      slug: data.slug,
                      description: data.description || "",
                      price: data.price.toString(),
                      compare_at_price: data.compare_at_price?.toString() || "",
                      sku: data.sku || "",
                      stock: data.stock.toString(),
                      status: data.status,
                      category_id: data.category_id || "",
                      has_variants: false
                    })
                    if (isEdit) {
                      setSelectedProduct(data)
                    }
                  } else {
                    setFormError(isEdit ? "No product found with this SKU" : "No product found with this SKU. You can create a new product.")
                  }
                }}
                disabled={!formData.sku.trim()}
              >
                <MagnifyingGlass />
                Lookup
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isEdit ? "Enter an existing SKU and click Lookup to auto-fill all fields" : "Enter an existing SKU to auto-fill fields, or create a new SKU for this product"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}name`}>Product Name *</Label>
            <Input
              id={`${idPrefix}name`}
              placeholder="e.g. Classic T-Shirt"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}slug`}>Slug</Label>
            <Input
              id={`${idPrefix}slug`}
              placeholder="e.g. classic-t-shirt"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}description`}>Description</Label>
          <Textarea
            id={`${idPrefix}description`}
            placeholder="Describe your product..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}price`}>Price *</Label>
            <Input
              id={`${idPrefix}price`}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}compare_at_price`}>Compare at Price</Label>
            <Input
              id={`${idPrefix}compare_at_price`}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.compare_at_price}
              onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}category`}>Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}stock`}>Stock Quantity</Label>
            <Input
              id={`${idPrefix}stock`}
              type="number"
              placeholder="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              disabled={formData.has_variants}
            />
            {formData.has_variants && (
              <p className="text-xs text-muted-foreground">Stock is managed per variant</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}status`}>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label htmlFor={`${idPrefix}has_variants`} className="text-base font-medium">
              This product has variants
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable if this product comes in different sizes, colors, etc.
            </p>
          </div>
          <Switch
            id={`${idPrefix}has_variants`}
            checked={formData.has_variants}
            onCheckedChange={(checked) => {
              setFormData({ ...formData, has_variants: checked })
              if (checked && productOptions.length === 0) {
                addOption()
              }
            }}
          />
        </div>
      </div>
    )
  }

  // Render step indicator
  function renderStepIndicator(currentStep: number) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === currentStep 
                  ? "bg-primary text-primary-foreground" 
                  : step < currentStep
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step < currentStep ? <Check className="h-4 w-4" /> : step}
            </div>
            {step < 3 && (
              <div className={`w-12 h-0.5 ${step < currentStep ? "bg-primary/20" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>
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
          <h1 className="text-xl font-normal">Products</h1>
          <p className="text-sm font-normal text-muted-foreground">Manage your product inventory</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
          <Plus />
          Add Product
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b">
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Product</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">SKU</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Price</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Stock</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No products found matching your search." : "No products yet."}
                    </p>
                    {!searchQuery && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-4"
                        onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
                      >
                        <Plus />
                        Add your first product
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className="border-b last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted overflow-hidden shrink-0">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <span className="font-medium">{product.name}</span>
                        {product.variant_count && product.variant_count > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {product.variant_count} variants
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {product.sku || "-"}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    ${product.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    {product.stock}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        product.status === "active"
                          ? "bg-green-500/10 text-green-500"
                          : product.status === "archived"
                          ? "bg-gray-500/10 text-gray-500"
                          : "bg-yellow-500/10 text-yellow-500"
                      }`}
                    >
                      {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(product)}>
                        <Pencil />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(product)}
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

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsAddDialogOpen(open); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formData.has_variants 
                ? `Add Product - Step ${wizardStep} of ${maxSteps}`
                : "Add Product"
              }
            </DialogTitle>
            <DialogDescription>
              {wizardStep === 1 && "Enter the basic product information."}
              {wizardStep === 2 && "Define the options for your product variants."}
              {wizardStep === 3 && "Review and customize your product variants."}
            </DialogDescription>
          </DialogHeader>

          {/* Error Banner */}
          {formError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{formError}</span>
              <button 
                onClick={() => setFormError(null)} 
                className="ml-auto shrink-0 hover:opacity-70"
              >
                ✕
              </button>
            </div>
          )}

          {/* Step Indicator */}
          {formData.has_variants && renderStepIndicator(wizardStep)}

          {/* Step 1: Basic Info */}
          {wizardStep === 1 && renderBasicInfoForm(false)}

          {/* Step 2: Define Options */}
          {wizardStep === 2 && formData.has_variants && renderVariantOptionsUI()}

          {/* Step 3: Variant Table */}
          {wizardStep === 3 && formData.has_variants && renderVariantTableUI()}

          <DialogFooter className="flex justify-between">
            <div>
              {formData.has_variants && wizardStep > 1 && (
                <Button variant="outline" size="sm" onClick={prevStep}>
                  <CaretLeft />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { resetForm(); setIsAddDialogOpen(false); }}>
                Cancel
              </Button>
              {(!formData.has_variants || wizardStep === maxSteps) ? (
                <Button size="sm" onClick={handleSaveProduct} disabled={saving || !formData.name.trim()}>
                  {saving ? "Creating..." : "Create Product"}
                </Button>
              ) : (
                <Button size="sm" onClick={nextStep}>
                  Next
                  <CaretRight />
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsEditDialogOpen(open); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formData.has_variants 
                ? `Edit Product - Step ${editWizardStep} of ${editMaxSteps}`
                : "Edit Product"
              }
            </DialogTitle>
            <DialogDescription>
              {editWizardStep === 1 && "Update the basic product information."}
              {editWizardStep === 2 && "Define the options for your product variants."}
              {editWizardStep === 3 && "Review and customize your product variants."}
            </DialogDescription>
          </DialogHeader>

          {/* Error Banner */}
          {formError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{formError}</span>
              <button 
                onClick={() => setFormError(null)} 
                className="ml-auto shrink-0 hover:opacity-70"
              >
                ✕
              </button>
            </div>
          )}

          {/* Step Indicator */}
          {formData.has_variants && renderStepIndicator(editWizardStep)}

          {/* Step 1: Basic Info */}
          {editWizardStep === 1 && renderBasicInfoForm(true)}

          {/* Step 2: Define Options */}
          {editWizardStep === 2 && formData.has_variants && renderVariantOptionsUI()}

          {/* Step 3: Variant Table */}
          {editWizardStep === 3 && formData.has_variants && renderVariantTableUI()}

          <DialogFooter className="flex justify-between">
            <div>
              {formData.has_variants && editWizardStep > 1 && (
                <Button variant="outline" size="sm" onClick={prevEditStep}>
                  <CaretLeft />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { resetForm(); setIsEditDialogOpen(false); }}>
                Cancel
              </Button>
              {(!formData.has_variants || editWizardStep === editMaxSteps) ? (
                <Button size="sm" onClick={handleEditProduct} disabled={saving || !formData.name.trim()}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              ) : (
                <Button size="sm" onClick={nextEditStep}>
                  Next
                  <CaretRight />
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedProduct?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
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
