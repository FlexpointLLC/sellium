"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { notFound, useParams } from "next/navigation"
import { StorefrontHeader } from "@/components/storefront/header"
import { StorefrontFooter } from "@/components/storefront/footer"
import { FloatingButtons } from "@/components/storefront/floating-buttons"
import { useStorefrontUrl } from "@/lib/use-storefront-url"
import { useStoreMeta } from "@/lib/use-store-meta"
import { CartProvider } from "@/lib/cart-context"

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

interface StorePage {
  id: string
  slug: string
  title: string
  content: string
  is_published: boolean
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

// Only allow the 4 specific pages
const ALLOWED_PAGES = ["about", "privacy", "shipping", "returns"] as const

function PageContent() {
  const params = useParams()
  const username = params.username as string
  const pageSlug = params.page as string
  const { getUrl } = useStorefrontUrl(username)

  const [store, setStore] = useState<Store | null>(null)
  const [page, setPage] = useState<StorePage | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Validate page slug
  useEffect(() => {
    if (!ALLOWED_PAGES.includes(pageSlug as any)) {
      notFound()
    }
  }, [pageSlug])

  // Use store meta hook with store data
  useStoreMeta(store ? {
    id: store.id,
    name: store.name,
    favicon_url: null,
    meta_title: page ? `${page.title} - ${store.name}` : null,
    meta_description: page ? page.content.substring(0, 160).replace(/<[^>]*>/g, '') || `${page.title} for ${store.name}` : null,
    description: null
  } : null)

  useEffect(() => {
    // Don't fetch if page slug is not allowed
    if (!ALLOWED_PAGES.includes(pageSlug as any)) {
      return
    }

    async function fetchData() {
      const supabase = createClient()

      // Fetch store
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("username", username)
        .eq("status", "active")
        .single()

      if (storeError || !storeData) {
        notFound()
        return
      }

      const storeObj = {
        id: storeData.id,
        name: storeData.name,
        username: storeData.username,
        description: storeData.description,
        logo_url: storeData.logo_url,
        favicon_url: storeData.favicon_url,
        banner_url: storeData.banner_url,
        banner_images: storeData.banner_images,
        meta_title: storeData.meta_title,
        meta_description: storeData.meta_description,
        theme_color: storeData.theme_color,
        currency: storeData.currency,
        linquo_org_id: storeData.linquo_org_id,
        social_links: storeData.social_links,
        address: storeData.address
      }

      setStore(storeObj)

      // Fetch page - only published pages and only the 4 allowed pages
      const { data: pageData, error: pageError } = await supabase
        .from("store_pages")
        .select("*")
        .eq("store_id", storeData.id)
        .eq("slug", pageSlug)
        .eq("is_published", true)
        .in("slug", ALLOWED_PAGES)
        .single()

      if (pageError || !pageData) {
        notFound()
        return
      }

      setPage(pageData)

      // Update document title
      if (typeof document !== 'undefined') {
        document.title = `${pageData.title} - ${storeData.name}`
      }

      // Fetch categories with full structure (same as homepage)
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("store_id", storeData.id)
        .eq("status", "active")
        .order("sort_order", { ascending: true })

      if (categoriesData && categoriesData.length > 0) {
        // Fetch product counts for each category (including children)
        const categoriesWithCount = await Promise.all(
          categoriesData.map(async (cat: any) => {
            // Find all child categories
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

    fetchData()
  }, [username, pageSlug])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!store || !page) {
    notFound()
    return null
  }

  const themeColor = store.theme_color || "#000000"

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <StorefrontHeader 
        store={store}
        categories={categories}
        username={username}
      />

      <main className="flex-1 bg-white">
        <div className="max-w-[650px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">{page.title}</h1>
          <div 
            className="rich-text-content text-gray-900"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>
      </main>
      <style jsx global>{`
        .rich-text-content {
          font-size: 14px;
          line-height: 1.6;
        }
        .rich-text-content h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.67em 0;
          line-height: 1.2;
        }
        .rich-text-content h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.75em 0;
          line-height: 1.3;
        }
        .rich-text-content h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 0.83em 0;
          line-height: 1.4;
        }
        .rich-text-content h4 {
          font-size: 1em;
          font-weight: bold;
          margin: 1em 0;
          line-height: 1.5;
        }
        .rich-text-content h5 {
          font-size: 0.83em;
          font-weight: bold;
          margin: 1.17em 0;
          line-height: 1.5;
        }
        .rich-text-content h6 {
          font-size: 0.67em;
          font-weight: bold;
          margin: 1.33em 0;
          line-height: 1.5;
        }
        .rich-text-content p {
          margin: 0;
          margin-bottom: 8px;
        }
        .rich-text-content p:last-child {
          margin-bottom: 0;
        }
        .rich-text-content ul,
        .rich-text-content ol {
          padding-left: 24px;
          margin: 8px 0;
        }
        .rich-text-content li {
          margin: 4px 0;
        }
        .rich-text-content strong {
          font-weight: bold;
        }
        .rich-text-content em {
          font-style: italic;
        }
        .rich-text-content u {
          text-decoration: underline;
        }
        .rich-text-content s {
          text-decoration: line-through;
        }
        .rich-text-content blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 16px;
          margin: 16px 0;
          color: #6b7280;
          font-style: italic;
        }
        .rich-text-content code {
          background-color: #f3f4f6;
          border-radius: 4px;
          padding: 2px 4px;
          font-family: monospace;
          font-size: 0.9em;
        }
        .rich-text-content pre {
          background-color: #f3f4f6;
          border-radius: 4px;
          padding: 12px;
          margin: 8px 0;
          overflow-x: auto;
        }
        .rich-text-content pre code {
          background-color: transparent;
          padding: 0;
        }
        .rich-text-content a {
          color: #3b82f6;
          text-decoration: underline;
        }
        .rich-text-content a:hover {
          color: #2563eb;
        }
        .rich-text-content sub {
          font-size: 0.8em;
          vertical-align: sub;
        }
        .rich-text-content sup {
          font-size: 0.8em;
          vertical-align: super;
        }
      `}</style>

      <StorefrontFooter 
        store={store}
        categories={categories}
        username={username}
      />

      <FloatingButtons 
        username={username}
        themeColor={themeColor}
        whatsappNumber={store.social_links?.whatsapp}
        currency={store.currency}
        linquoOrgId={store.linquo_org_id}
      />
    </div>
  )
}

export default function StorePage() {
  const params = useParams()
  const username = params.username as string

  return (
    <CartProvider storeUsername={username}>
      <PageContent />
    </CartProvider>
  )
}

