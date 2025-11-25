"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ShoppingBag, InstagramLogo, FacebookLogo, TwitterLogo } from "phosphor-react"

interface Store {
  id: string
  name: string
  username: string
  description: string | null
  logo_url: string | null
  banner_url: string | null
  theme_color: string | null
}

interface Product {
  id: string
  name: string
  price: number
  image_url: string | null
  description: string | null
}

export default function StorefrontPage({ params }: { params: { username: string } }) {
  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchStore() {
      const supabase = createClient()
      
      // Fetch store from Supabase
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("username", params.username)
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
        banner_url: storeData.banner_url || null,
        theme_color: storeData.theme_color || "#22c55e"
      })

      // Fetch products for this store
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeData.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8)

      if (productsData && productsData.length > 0) {
        setProducts(productsData.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image_url: p.image_url || null,
          description: p.description || null
        })))
      } else {
        // No products yet - show empty state
        setProducts([])
      }

      setLoading(false)
    }

    fetchStore()
  }, [params.username])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading store...</div>
      </div>
    )
  }

  if (error || !store) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="h-8 w-8 rounded-full" />
              ) : (
                <div 
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                  style={{ backgroundColor: store.theme_color || '#22c55e' }}
                >
                  {store.name.charAt(0)}
                </div>
              )}
              <span className="font-semibold text-lg">{store.name}</span>
            </div>
            <nav className="flex items-center gap-6">
              <Link href={`/${params.username}`} className="text-sm font-medium hover:text-primary transition-colors">
                Home
              </Link>
              <Link href={`/${params.username}/products`} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Products
              </Link>
              <Link href={`/${params.username}/about`} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                About
              </Link>
              <Link href={`/${params.username}/contact`} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Contact
              </Link>
              <button className="relative p-2 hover:bg-muted rounded-full transition-colors">
                <ShoppingBag className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  0
                </span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="relative py-20 px-4"
        style={{ backgroundColor: store.theme_color ? `${store.theme_color}10` : '#22c55e10' }}
      >
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{store.name}</h1>
          {store.description && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {store.description}
            </p>
          )}
          <div className="mt-8">
            <Link 
              href={`/${params.username}/products`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-white transition-colors"
              style={{ backgroundColor: store.theme_color || '#22c55e' }}
            >
              Shop Now
              <ShoppingBag className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold mb-8">Featured Products</h2>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link 
                  key={product.id} 
                  href={`/${params.username}/products/${product.id}`}
                  className="group"
                >
                  <div className="bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium group-hover:text-primary transition-colors">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                      )}
                      <p className="mt-2 font-semibold" style={{ color: store.theme_color || '#22c55e' }}>
                        ${product.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-xl">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No products available yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="h-8 w-8 rounded-full" />
              ) : (
                <div 
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                  style={{ backgroundColor: store.theme_color || '#22c55e' }}
                >
                  {store.name.charAt(0)}
                </div>
              )}
              <span className="font-semibold">{store.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 hover:bg-muted rounded-full transition-colors">
                <InstagramLogo className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 hover:bg-muted rounded-full transition-colors">
                <FacebookLogo className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 hover:bg-muted rounded-full transition-colors">
                <TwitterLogo className="h-5 w-5" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Powered by <span className="font-medium text-foreground">Sellium</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

