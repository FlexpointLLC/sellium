"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
  House,
  Package,
  ShoppingCart,
  Gear,
  Users,
  Folders,
  CurrencyDollar,
  Headset,
  Stack,
  Crown,
  UserCircle,
  Megaphone,
  ArrowCircleUp,
  Shield,
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
import { Logo } from "@/components/logo"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { UpgradeDialog } from "@/components/upgrade-dialog"
import { UserDropdown } from "@/components/user-dropdown"

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
  {
    label: "Admin",
    items: [
      {
        title: "Super Admin",
        url: "/dashboard/admin",
        icon: Shield,
      },
      {
        title: "Users",
        url: "/dashboard/admin/users",
        icon: UserCircle,
      },
      {
        title: "Notice",
        url: "/dashboard/admin/notice",
        icon: Megaphone,
      },
      {
        title: "Upgrade Request",
        url: "/dashboard/admin/upgrade-requests",
        icon: ArrowCircleUp,
      },
    ],
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { state } = useSidebar()
  
  const [storePlan, setStorePlan] = useState<string | null>(null)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  const isCollapsed = state === "collapsed"

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      // Fetch profile for role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile) {
        setUserRole(profile.role || 'owner')
      }

      // Fetch store plan and id
      const { data: store } = await supabase
        .from("stores")
        .select("id, plan")
        .eq("user_id", user.id)
        .single()

      if (store) {
        setStorePlan(store.plan || "free")
        setStoreId(store.id)
      }

      setLoading(false)
    }

    fetchUserData()
  }, [supabase])

  return (
    <Sidebar collapsible="icon" className="!border-r-0">
      <SidebarHeader className="!flex !flex-row h-16 border-b border-border/50 px-4 items-center justify-start group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center">
        <Link href="/dashboard" className="flex items-center group-data-[collapsible=icon]:hidden">
          <Logo className="h-7 w-auto" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {menuGroups
          .filter((group) => {
            // Filter menu groups based on role
            if (userRole === 'rider') {
              // Rider can only see Home and Orders
              return group.label === 'Overview' || 
                     (group.label === 'Sales & Customers' && group.items.some(item => item.title === 'Orders'))
            }
            if (userRole === 'agent') {
              // Agent cannot see Finance (Earnings) and Admin section
              return group.label !== 'Finance' && group.label !== 'Admin'
            }
            if (userRole === 'owner') {
              // Owner cannot see Admin section
              return group.label !== 'Admin'
            }
            // Admin can see everything including Admin section
            return true
          })
          .map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items
                    .filter((item) => {
                      // For riders, only show Home and Orders
                      if (userRole === 'rider') {
                        return item.title === 'Home' || item.title === 'Orders'
                      }
                      // For agents, hide Earnings
                      if (userRole === 'agent' && item.title === 'Earnings') {
                        return false
                      }
                      return true
                    })
                    .map((item) => (
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
              <Button
                onClick={() => setUpgradeDialogOpen(true)}
                className="w-full px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-md transition-colors"
              >
                Upgrade
              </Button>
            </div>
          </div>
        )}
        <UserDropdown />
      </SidebarFooter>
      
      {/* Upgrade Dialog */}
      {storeId && storePlan && (
        <UpgradeDialog
          open={upgradeDialogOpen}
          onOpenChange={setUpgradeDialogOpen}
          currentPlan={storePlan as 'free' | 'paid' | 'pro'}
          storeId={storeId}
        />
      )}
    </Sidebar>
  )
}
