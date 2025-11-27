"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
  House,
  Package,
  ShoppingCart,
  Storefront,
  Gear,
  SignOut,
  Users,
  Folders,
  CurrencyDollar,
  Headset,
  Stack,
  User,
  Circle,
  CreditCard,
  Shield,
  Bell,
  Link as LinkIcon,
  Crown,
} from "phosphor-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Logo } from "@/components/logo"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const menuGroups = [
  {
    label: "Overview",
    items: [
      {
        title: "Home",
        url: "/dashboard",
        icon: House,
      },
    ],
  },
  {
    label: "Store & Catalog",
    items: [
      {
        title: "Categories",
        url: "/dashboard/categories",
        icon: Folders,
      },
      {
        title: "Products",
        url: "/dashboard/products",
        icon: Package,
      },
      {
        title: "Variants",
        url: "/dashboard/variants",
        icon: Stack,
      },
    ],
  },
  {
    label: "Sales & Customers",
    items: [
      {
        title: "Orders",
        url: "/dashboard/orders",
        icon: ShoppingCart,
      },
      {
        title: "Customers",
        url: "/dashboard/customers",
        icon: Users,
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        title: "Earnings",
        url: "/dashboard/earnings",
        icon: CurrencyDollar,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Gear,
      },
      {
        title: "Support",
        url: "/dashboard/support",
        icon: Headset,
      },
    ],
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { state } = useSidebar()
  
  const [userProfile, setUserProfile] = useState<{
    name: string | null
    avatar_url: string | null
  } | null>(null)
  const [storeUsername, setStoreUsername] = useState<string | null>(null)
  const [storePlan, setStorePlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  const isCollapsed = state === "collapsed"

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user.id)
        .single()

      if (profile) {
        setUserProfile({
          name: profile.name,
          avatar_url: profile.avatar_url,
        })
      }

      // Fetch store username and plan
      const { data: store } = await supabase
        .from("stores")
        .select("username, plan")
        .eq("user_id", user.id)
        .single()

      if (store) {
        setStoreUsername(store.username)
        setStorePlan(store.plan || "free")
      }

      setLoading(false)
    }

    fetchUserData()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const getInitials = (name: string | null): string => {
    if (!name) return "U"
    const parts = name.trim().split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
  }

  return (
    <Sidebar collapsible="icon" className="!border-r-0">
      <SidebarHeader className="!flex !flex-row h-16 border-b border-border/50 px-4 items-center justify-start group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center">
        <Link href="/dashboard" className="flex items-center group-data-[collapsible=icon]:hidden">
          <Logo className="h-7 w-auto" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" weight={pathname === item.url ? "fill" : "regular"} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-2 space-y-2">
        {/* Upgrade Banner for Free Plan */}
        {storePlan === 'free' && !isCollapsed && (
          <div className="mx-2 mb-2 p-4 rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/20">
            <div className="flex flex-col items-center text-center gap-3">
              {/* Crown Icon Container */}
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Crown className="h-5 w-5 text-orange-600 dark:text-orange-500" weight="fill" />
              </div>
              {/* Text */}
              <p className="text-xs text-orange-900 dark:text-orange-100 leading-relaxed">
                Need Custom domain, More traffic, more product limit?
              </p>
              {/* Upgrade Button */}
              <Link
                href="/dashboard/settings?tab=billing"
                className="block w-full px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-md transition-colors text-center"
              >
                Upgrade
              </Link>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg bg-muted/15 hover:bg-muted transition-colors ${isCollapsed ? "justify-center" : ""}`}>
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.name || "User"} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {userProfile?.name ? getInitials(userProfile.name) : <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-sm truncate">
                      {userProfile?.name || "User"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {storeUsername || "No store"}
                    </div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-0 ml-2 border-0 bg-gray-50 dark:bg-gray-900 shadow-lg">
              {/* User Profile Section */}
              <div className="px-4 py-3 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.name || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {userProfile?.name ? getInitials(userProfile.name) : <User className="h-6 w-6" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">
                        {userProfile?.name || "User"}
                      </h3>
                      {storePlan === "paid" && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded border border-yellow-500/30">
                          Paid
                        </span>
                      )}
                      {storePlan === "pro" && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-600 dark:text-purple-500 rounded border border-purple-500/30">
                          Pro
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {storePlan === "paid" ? "Paid Plan" : storePlan === "pro" ? "Pro Plan" : "Free Plan"} • {storeUsername || "No store"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Site Status Section */}
              <div className="px-4 py-2.5 border-b flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Site Status</span>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" weight="fill" />
                  <span className="text-xs font-medium text-green-600 dark:text-green-500">Online</span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-1.5">
                <DropdownMenuItem asChild className="rounded-md px-2 py-2">
                  <Link href="/dashboard/settings?tab=store" className="cursor-pointer flex items-center">
                    <Storefront className="mr-2.5 h-4 w-4" />
                    <span>Store</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-md px-2 py-2">
                  <Link href="/dashboard/settings?tab=payments" className="cursor-pointer flex items-center">
                    <CreditCard className="mr-2.5 h-4 w-4" />
                    <span>Payments</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-md px-2 py-2">
                  <Link href="/dashboard/settings?tab=domain" className="cursor-pointer flex items-center">
                    <LinkIcon className="mr-2.5 h-4 w-4" />
                    <span>Custom Domain</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-md px-2 py-2">
                  <Link href="/dashboard/settings?tab=profile" className="cursor-pointer flex items-center">
                    <User className="mr-2.5 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-md px-2 py-2">
                  <Link href="/dashboard/settings?tab=security" className="cursor-pointer flex items-center">
                    <Shield className="mr-2.5 h-4 w-4" />
                    <span>Security</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-md px-2 py-2">
                  <Link href="/dashboard/settings?tab=notifications" className="cursor-pointer flex items-center">
                    <Bell className="mr-2.5 h-4 w-4" />
                    <span>Notifications</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleSignOut} 
                  className="cursor-pointer text-destructive focus:text-destructive rounded-md px-2 py-2 mt-1"
                >
                  <SignOut className="mr-2.5 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
