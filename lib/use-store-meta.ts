import { useEffect, useRef } from 'react'

interface Store {
  id: string
  name: string
  favicon_url: string | null
  meta_title: string | null
  meta_description: string | null
  description: string | null
}

/**
 * Hook to set custom favicon and meta tags for storefront pages
 */
export function useStoreMeta(store: Store | null) {
  const faviconSetRef = useRef<string | null>(null)

  // Set custom favicon when store is loaded
  useEffect(() => {
    if (!store?.favicon_url) return
    if (typeof window === 'undefined' || !document?.head) return
    
    // Don't set the same favicon twice
    if (faviconSetRef.current === store.favicon_url) return

    try {
      // Check if we already added this favicon
      const existingLink = document.querySelector(`link[rel="icon"][data-store-favicon="${store.id}"]`)
      if (existingLink) return

      // Create and append new favicon link (don't remove old ones - browser will use the last one)
      const link = document.createElement('link')
      link.rel = 'icon'
      link.setAttribute('data-store-favicon', store.id) // Mark it so we don't add duplicates
      link.type = store.favicon_url.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon'
      link.href = store.favicon_url
      
      document.head.appendChild(link)
      faviconSetRef.current = store.favicon_url
    } catch (error) {
      // Silently fail - favicon is not critical
      console.warn('Could not set favicon:', error)
    }
  }, [store?.favicon_url, store?.id])

  // Set custom meta title and description when store is loaded
  useEffect(() => {
    if (!store) return
    if (typeof window === 'undefined' || !document) return

    try {
      // Update document title
      if (store.meta_title) {
        document.title = store.meta_title
      } else if (store.name) {
        document.title = `${store.name} - Sellium`
      }

      // Update meta description
      let metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription && document.head) {
        metaDescription = document.createElement('meta')
        metaDescription.setAttribute('name', 'description')
        document.head.appendChild(metaDescription)
      }
      
      if (metaDescription) {
        if (store.meta_description) {
          metaDescription.setAttribute('content', store.meta_description)
        } else {
          metaDescription.setAttribute('content', store.description || `Shop at ${store.name} on Sellium`)
        }
      }
    } catch (error) {
      // Silently fail - meta tags are not critical
      console.warn('Could not set meta tags:', error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.meta_title, store?.meta_description, store?.name, store?.description])
}

