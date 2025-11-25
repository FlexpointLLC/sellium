"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, CurrencyDollar, Users, CheckCircle, ArrowSquareOut } from "phosphor-react"
import Link from "next/link"

export default function DashboardPage() {
  // Mock store data - replace with actual data from API
  const store = {
    name: "Bangla Honey Store",
    status: "LIVE",
    plan: "Pro Plan",
    domain: "banglahoney.sellium.store",
    trafficLimit: "1.5k",
    productCount: 25,
    productLimit: 250,
    thumbnail: "/store-preview.png", // Replace with actual store screenshot
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-normal">Dashboard</h1>
          <p className="text-sm font-normal text-muted-foreground">
            Welcome back! Here&apos;s an overview of your store.
          </p>
        </div>
        <Link
          href={`https://${store.domain}`}
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Visit Site
          <ArrowSquareOut className="h-4 w-4" />
        </Link>
      </div>

      {/* Store Overview Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Store Preview Thumbnail */}
            <div className="w-full md:w-48 h-32 md:h-auto rounded-lg overflow-hidden border bg-muted flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center text-muted-foreground text-xs">
                Store Preview
              </div>
            </div>

            {/* Store Info */}
            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">{store.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Site Status:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
                    <CheckCircle className="h-3 w-3" weight="fill" />
                    {store.status}
                  </span>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="flex flex-wrap items-center gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Current Plan:</span>
                  <span className="font-medium text-primary">{store.plan}</span>
                </div>
                <div className="w-px h-4 bg-border mx-4" />
                <div className="flex items-center gap-2">
                  <Link 
                    href={`https://${store.domain}`} 
                    target="_blank"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    https://{store.domain}
                  </Link>
                  <ArrowSquareOut className="h-3.5 w-3.5 text-muted-foreground" />
                  <Link href="/dashboard/settings/domain" className="text-primary hover:underline">
                    Manage Domain
                  </Link>
                </div>
                <div className="w-px h-4 bg-border mx-4" />
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Traffic Limit:</span>
                  <span className="font-medium">{store.trafficLimit}</span>
                </div>
                <div className="w-px h-4 bg-border mx-4" />
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Product</span>
                  <span className="font-medium">{store.productCount}/{store.productLimit}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CurrencyDollar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">
              +0% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              +0% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              0 active products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              +0 new this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              You have no orders yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No orders to display
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>
              Your best selling products.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No products yet
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

