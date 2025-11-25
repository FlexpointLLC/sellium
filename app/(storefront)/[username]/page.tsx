"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { 
  MagnifyingGlass, 
  Phone, 
  InstagramLogo, 
  FacebookLogo, 
  WhatsappLogo,
  ShoppingBag,
  CaretLeft,
  CaretRight,
  Eye,
  MapPin,
  Clock,
  Envelope,
  User
} from "phosphor-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Store {
  id: string
  name: string
  username: string
  description: string | null
  logo_url: string | null
  banner_url: string | null
  theme_color: string | null
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
  product_count?: number
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  image_url: string | null
  description: string | null
  category_id: string | null
  category?: Category | null
}

interface BannerSlide {
  id: number
  image_url: string
  title: string
  subtitle: string
  link: string
}

export default function StorefrontPage({ params }: { params: { username: string } }) {
  const [store, setStore] = useState<Store | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productsByCategory, setProductsByCategory] = useState<Record<string, Product[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentSlide, setCurrentSlide] = useState(0)
  const [cartCount, setCartCount] = useState(0)

  // Demo banner slides (will be replaced with dynamic data later)
  const bannerSlides: BannerSlide[] = [
    {
      id: 1,
      image_url: "/placeholder-banner-1.jpg",
      title: "New Collection",
      subtitle: "Shop the latest arrivals",
      link: `/${params.username}/products`
    },
    {
      id: 2,
      image_url: "/placeholder-banner-2.jpg",
      title: "Special Offers",
      subtitle: "Up to 50% off",
      link: `/${params.username}/products`
    }
  ]

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
        theme_color: storeData.theme_color || "#000000",
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
        // Get product count for each category
        const categoriesWithCount = await Promise.all(
          categoriesData.map(async (cat) => {
            const { count } = await supabase
              .from("products")
              .select("*", { count: "exact", head: true })
              .eq("category_id", cat.id)
              .eq("status", "active")
            
            return {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              image_url: cat.image_url || null,
              product_count: count || 0
            }
          })
        )
        setCategories(categoriesWithCount)
      }

      // Fetch all active products for this store
      const { data: productsData } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(id, name, slug)
        `)
        .eq("store_id", storeData.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (productsData && productsData.length > 0) {
        const formattedProducts = productsData.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          compare_at_price: p.compare_at_price,
          image_url: p.image_url || null,
          description: p.description || null,
          category_id: p.category_id,
          category: p.category
        }))
        setProducts(formattedProducts)

        // Group products by category
        const grouped: Record<string, Product[]> = {}
        formattedProducts.forEach((product: Product) => {
          if (product.category) {
            const catName = product.category.name
            if (!grouped[catName]) {
              grouped[catName] = []
            }
            grouped[catName].push(product)
          }
        })
        setProductsByCategory(grouped)
      }

      setLoading(false)
    }

    fetchStore()
  }, [params.username])

  // Auto-slide for banner
  useEffect(() => {
    if (bannerSlides.length <= 1) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [bannerSlides.length])

  function nextSlide() {
    setCurrentSlide((prev) => (prev + 1) % bannerSlides.length)
  }

  function prevSlide() {
    setCurrentSlide((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length)
  }

  function calculateDiscount(price: number, compareAt: number): number {
    return Math.round(((compareAt - price) / compareAt) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-gray-500">Loading store...</div>
      </div>
    )
  }

  if (error || !store) {
    notFound()
  }

  const themeColor = store.theme_color || "#000000"

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Top Header - Search | Logo | Icons */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products..."
                className="pl-9 h-9 bg-gray-50 border-gray-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Logo */}
            <Link href={`/${params.username}`} className="flex items-center gap-2">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="h-10 w-auto" />
              ) : (
                <div className="flex items-center gap-2">
                  <div 
                    className="h-8 w-8 rounded flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: themeColor }}
                  >
                    {store.name.charAt(0)}
                  </div>
                  <span className="font-bold text-xl tracking-tight">{store.name}</span>
                </div>
              )}
            </Link>

            {/* Icons */}
            <div className="flex items-center gap-2">
              {store.social_links?.phone && (
                <a 
                  href={`tel:${store.social_links.phone}`} 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Call us"
                >
                  <Phone className="h-5 w-5" />
                </a>
              )}
              {store.social_links?.instagram && (
                <a 
                  href={store.social_links.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Instagram"
                >
                  <InstagramLogo className="h-5 w-5" />
                </a>
              )}
              {store.social_links?.facebook && (
                <a 
                  href={store.social_links.facebook} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Facebook"
                >
                  <FacebookLogo className="h-5 w-5" />
                </a>
              )}
              <a 
                href="#" 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Account"
              >
                <User className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Categories Navigation */}
      {categories.length > 0 && (
        <nav className="bg-white border-b border-black/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-8 h-12 overflow-x-auto">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/${params.username}/category/${category.slug}`}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap transition-colors"
                >
                  {category.name.toUpperCase()}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Image Slider / Banner */}
      <section className="relative bg-gray-100">
        <div className="relative h-[300px] sm:h-[400px] md:h-[450px] overflow-hidden">
          {/* If store has a banner, show it. Otherwise show a placeholder */}
          {store.banner_url ? (
            <img 
              src={store.banner_url} 
              alt={store.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${themeColor}20 0%, ${themeColor}40 100%)` }}
            >
              <div className="text-center px-4">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">{store.name}</h1>
                {store.description && (
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
                    {store.description}
                  </p>
                )}
                <Link
                  href={`/${params.username}/products`}
                  className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-md transition-colors"
                  style={{ backgroundColor: themeColor }}
                >
                  Shop Now
                  <CaretRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Slider Navigation Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {[0, 1, 2].map((dot) => (
              <button
                key={dot}
                className={`w-2 h-2 rounded-full transition-colors ${
                  currentSlide === dot ? "bg-gray-800" : "bg-gray-400"
                }`}
                onClick={() => setCurrentSlide(dot)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Browse Categories */}
      {categories.length > 0 && (
        <section className="py-10 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-lg font-bold tracking-wide">BROWSE CATEGORIES</h2>
              <div className="flex-1 h-px bg-black/10" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/${params.username}/category/${category.slug}`}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100"
                >
                  {category.image_url ? (
                    <img 
                      src={category.image_url} 
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: `${themeColor}10` }}
                    >
                      <span className="text-2xl font-bold" style={{ color: themeColor }}>
                        {category.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-white font-medium text-sm">{category.name}</h3>
                    {category.product_count !== undefined && (
                      <p className="text-white/70 text-xs">{category.product_count} products</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products by Category */}
      {Object.entries(productsByCategory).map(([categoryName, categoryProducts]) => (
        <section key={categoryName} className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold tracking-wide">{categoryName.toUpperCase()}</h2>
                <div className="flex-1 h-px bg-black/10 hidden sm:block" style={{ width: '200px' }} />
              </div>
              <Link 
                href={`/${params.username}/products?category=${categoryName}`}
                className="text-sm font-medium hover:underline"
                style={{ color: themeColor }}
              >
                SEE ALL
              </Link>
            </div>

            {/* Product Carousel */}
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {categoryProducts.slice(0, 8).map((product) => (
                  <div key={product.id} className="flex-shrink-0 w-[220px]">
                    <ProductCard 
                      product={product} 
                      username={params.username}
                      themeColor={themeColor}
                    />
                  </div>
                ))}
              </div>
              
              {/* Carousel Navigation */}
              {categoryProducts.length > 4 && (
                <>
                  <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors hidden md:flex">
                    <CaretLeft className="h-5 w-5" />
                  </button>
                  <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors hidden md:flex">
                    <CaretRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      ))}

      {/* All Products (if no categories) */}
      {Object.keys(productsByCategory).length === 0 && products.length > 0 && (
        <section className="py-10 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-lg font-bold tracking-wide">ALL PRODUCTS</h2>
              <div className="flex-1 h-px bg-black/10" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard 
                  key={product.id}
                  product={product} 
                  username={params.username}
                  themeColor={themeColor}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-600 mb-2">No products yet</h2>
            <p className="text-gray-400">Check back soon for new arrivals!</p>
          </div>
        </section>
      )}

      {/* Footer */}
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
                <li><Link href={`/${params.username}/about`} className="hover:text-gray-900">About Us</Link></li>
                <li><Link href={`/${params.username}/privacy`} className="hover:text-gray-900">Privacy Policy</Link></li>
                <li><Link href={`/${params.username}/shipping`} className="hover:text-gray-900">Shipping Information</Link></li>
                <li><Link href={`/${params.username}/returns`} className="hover:text-gray-900">Returns & Refunds</Link></li>
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
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>SAT - FRI, 10AM - 11PM</span>
                </li>
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
              <p className="text-sm text-gray-600 mb-4">
                Follow us on social media for updates and offers.
              </p>
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
            <p>© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
            <p className="mt-1">
              Powered by <Link href="https://sellium.store" className="font-medium text-gray-700 hover:underline">Sellium</Link>
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Cart Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          className="flex items-center gap-2 px-4 py-3 text-white rounded-full shadow-lg transition-transform hover:scale-105"
          style={{ backgroundColor: themeColor }}
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="text-sm font-medium">{cartCount} item</span>
        </button>
      </div>

      {/* WhatsApp Button */}
      {store.social_links?.whatsapp && (
        <a
          href={`https://wa.me/${store.social_links.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors"
        >
          <WhatsappLogo className="h-7 w-7" weight="fill" />
        </a>
      )}
    </div>
  )
}

// Product Card Component
function ProductCard({ 
  product, 
  username, 
  themeColor 
}: { 
  product: Product
  username: string
  themeColor: string
}) {
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
  const discountPercent = hasDiscount 
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0

  return (
    <div className="group bg-white border border-black/10 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/${username}/products/${product.slug || product.id}`}>
        <div className="relative aspect-square bg-gray-100">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-gray-300" />
            </div>
          )}
          
          {/* Discount Badge */}
          {hasDiscount && (
            <div 
              className="absolute top-2 left-2 px-2 py-1 text-xs font-bold text-white rounded"
              style={{ backgroundColor: themeColor }}
            >
              {discountPercent} BDT OFF
            </div>
          )}

          {/* Store Logo Watermark */}
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-white/90 rounded text-xs font-medium">
            {username.toUpperCase()}
          </div>
        </div>
      </Link>

      <div className="p-3">
        <Link href={`/${username}/products/${product.slug || product.id}`}>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-gray-600 transition-colors">
            {product.name.toUpperCase()}
          </h3>
        </Link>
        
        <div className="mt-2 flex items-center gap-2">
          <span className="font-bold" style={{ color: themeColor }}>
            TK. {product.price.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              TK. {product.compare_at_price!.toFixed(2)}
            </span>
          )}
        </div>

        <button className="mt-3 w-full py-2 text-sm font-medium border border-black/10 rounded hover:bg-gray-50 transition-colors">
          Quick View
        </button>
      </div>
    </div>
  )
}
