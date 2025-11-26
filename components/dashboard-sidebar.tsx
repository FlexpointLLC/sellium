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
  DropdownMenuSeparator,
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

      // Fetch store username
      const { data: store } = await supabase
        .from("stores")
        .select("username")
        .eq("user_id", user.id)
        .single()

      if (store) {
        setStoreUsername(store.username)
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="!flex !flex-row h-16 border-b px-4 items-center justify-start group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center">
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
      <SidebarFooter className="border-t p-2">
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
              <button className={`w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted transition-colors ${isCollapsed ? "justify-center" : ""}`}>
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
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <div className="font-medium text-sm">
                  {userProfile?.name || "User"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {storeUsername || "No store"}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <Gear className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                <SignOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
