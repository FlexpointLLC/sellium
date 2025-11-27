"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react"
import Link from "next/link"
import { 
  Phone, 
  WhatsappLogo,
  InstagramLogo,
  FacebookLogo,
  MapPin,
  Clock,
  Envelope
} from "phosphor-react"
import { useStorefrontUrl } from "@/lib/use-storefront-url"
import { createClient } from "@/lib/supabase/client"

interface Store {
  name: string
  username: string
  logo_url: string | null
  theme_color: string | null
  available_time?: string | null
  social_media_text?: string | null
  copyright_text?: string | null
  show_powered_by?: boolean
  social_links?: {
    phone?: string
    whatsapp?: string
    instagram?: string
    facebook?: string
    email?: string
  } | null
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
  } | null
}

interface Category {
  id: string
  name: string
  slug: string
}

interface StorefrontFooterProps {
  store: Store
  categories?: Category[]
  username: string
}

interface StorePage {
  slug: string
  title: string
  is_published: boolean
}

export function StorefrontFooter({ store, categories = [], username }: StorefrontFooterProps) {
  const { getUrl } = useStorefrontUrl(username)
  const themeColor = store.theme_color || "#000000"
  const [pages, setPages] = useState<StorePage[]>([])

  useEffect(() => {
    async function fetchPages() {
      // Get store ID from username
      const supabase = createClient()
      const { data: storeData } = await supabase
        .from("stores")
        .select("id")
        .eq("username", username)
        .single()

      if (!storeData) return

      // Fetch only published pages - only the 4 specific pages
      const { data: pagesData } = await supabase
        .from("store_pages")
        .select("slug, title, is_published")
        .eq("store_id", storeData.id)
        .eq("is_published", true)
        .in("slug", ["about", "privacy", "shipping", "returns"])
        .order("slug", { ascending: true })

      if (pagesData) {
        setPages(pagesData)
      }
    }

    fetchPages()
  }, [username])

  // Only show published pages - no defaults
  const displayPages = pages.map(p => ({ slug: p.slug, title: p.title }))

  return (
    <footer className="bg-white border-t border-black/10 mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Store Info */}
          <div className="md:col-span-1">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="h-10 w-auto mb-4" />
            ) : (
              <div className="flex items-center gap-2 mb-4">
                <div 
                  className="h-8 w-8 rounded flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: themeColor }}
                >
                  {store.name.charAt(0)}
                </div>
                <span className="font-bold text-lg">{store.name}</span>
              </div>
            )}
            {store.social_links?.phone && (
              <p className="text-sm text-gray-600 mb-2">
                <Phone className="inline h-4 w-4 mr-2" />
                {store.social_links.phone}
              </p>
            )}
            <div className="flex items-center gap-2 mt-4">
              {store.social_links?.facebook && (
                <a 
                  href={store.social_links.facebook} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <FacebookLogo className="h-4 w-4" />
                </a>
              )}
              {store.social_links?.instagram && (
                <a 
                  href={store.social_links.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <InstagramLogo className="h-4 w-4" />
                </a>
              )}
              {store.social_links?.whatsapp && (
                <a 
                  href={`https://wa.me/${store.social_links.whatsapp.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <WhatsappLogo className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Information */}
          <div>
            <h3 className="font-bold text-sm tracking-wide mb-4">INFORMATION</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {displayPages.map((page) => (
                <li key={page.slug}>
                  <Link href={getUrl(`/${page.slug}`)} className="hover:text-gray-900">
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-bold text-sm tracking-wide mb-4">CONTACT INFO</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {store.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    {[store.address.street, store.address.city, store.address.state, store.address.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </li>
              )}
              {store.available_time && (
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>{store.available_time}</span>
                </li>
              )}
              {store.social_links?.email && (
                <li className="flex items-center gap-2">
                  <Envelope className="h-4 w-4 flex-shrink-0" />
                  <a href={`mailto:${store.social_links.email}`} className="hover:text-gray-900">
                    {store.social_links.email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h3 className="font-bold text-sm tracking-wide mb-4">FOLLOW US</h3>
            {store.social_media_text && (
              <p className="text-sm text-gray-600 mb-4">
                {store.social_media_text}
              </p>
            )}
          </div>
        </div>

        {/* Payment Methods Placeholder */}
        <div className="mt-8 pt-8 border-t border-black/10">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <div className="h-6 w-10 bg-gray-100 rounded" />
            <div className="h-6 w-10 bg-gray-100 rounded" />
            <div className="h-6 w-10 bg-gray-100 rounded" />
            <div className="h-6 w-10 bg-gray-100 rounded" />
            <div className="h-6 w-10 bg-gray-100 rounded" />
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-sm text-gray-500">
          {store.copyright_text ? (
            <p>{store.copyright_text.replace(/{store_name}/g, store.name).replace(/{year}/g, new Date().getFullYear().toString())}</p>
          ) : (
            <>
              <p>© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
              {store.show_powered_by !== false && (
                <p className="mt-1">
                  Powered by <Link href="https://sellium.store" className="font-medium text-gray-700 hover:underline">Sellium</Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </footer>
  )
}
