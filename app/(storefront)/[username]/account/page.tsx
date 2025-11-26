"use client"
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StorefrontHeader } from "@/components/storefront/header"
import { StorefrontFooter } from "@/components/storefront/footer"
import { FloatingButtons } from "@/components/storefront/floating-buttons"
import { CartProvider } from "@/lib/cart-context"
import { useStorefrontUrl } from "@/lib/use-storefront-url"
import { useStoreMeta } from "@/lib/use-store-meta"
import { ArrowLeft } from "phosphor-react"

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

export default function AccountPage({ params }: { params: { username: string } }) {
  return (
    <CartProvider storeUsername={params.username}>
      <AccountPageContent params={params} />
    </CartProvider>
  )
}

function AccountPageContent({ params }: { params: { username: string } }) {
  const username = params.username as string
  const { getUrl } = useStorefrontUrl(username)
  const [email, setEmail] = useState("")
  const [store, setStore] = useState<Store | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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

  // Set custom favicon and meta tags
  useStoreMeta(store)

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

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
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
              Log in to your Sellium account
            </p>
          </div>

          <form className="space-y-4">
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
              />
              <p className="text-xs text-gray-600">
                Use an organization email to easily collaborate with teammates
              </p>
            </div>

            <button
              type="button"
              className="w-full h-11 rounded-md text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: store.theme_color || "#000000" }}
              disabled={!email}
            >
              Continue
            </button>
          </form>

          <p className="text-xs text-gray-600 text-center leading-relaxed">
            By continuing, you acknowledge that you understand and agree to the{" "}
            <Link
              href="/terms"
              className="text-gray-900 hover:underline underline-offset-2"
            >
              Terms & Conditions
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
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
