"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "@/components/ui/sidebar"
import { Logo } from "@/components/logo"

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

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <Link href="/dashboard" className="flex items-center">
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
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button className="w-full">
                <SignOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
