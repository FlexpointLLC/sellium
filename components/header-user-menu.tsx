"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  User, 
  Storefront, 
  CreditCard, 
  Link as LinkIcon, 
  Shield, 
  Bell, 
  SignOut,
  Circle
} from "phosphor-react"

export function HeaderUserMenu() {
  const router = useRouter()
  const supabase = createClient()
  const [userProfile, setUserProfile] = useState<{
    name: string | null
    email: string | null
    avatar_url: string | null
  } | null>(null)
  const [storeUsername, setStoreUsername] = useState<string | null>(null)
  const [storePlan, setStorePlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email, avatar_url")
        .eq("id", user.id)
        .single()

      // Get email from profile or auth
      let userEmail = profile?.email || null
      if (!userEmail) {
        userEmail = user.email || null
      }

      if (profile) {
        setUserProfile({
          name: profile.name,
          email: userEmail,
          avatar_url: profile.avatar_url,
        })
      } else {
        setUserProfile({
          name: null,
          email: userEmail,
          avatar_url: null,
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

  if (loading) {
    return (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 pl-2 pr-4 h-9 rounded-[100px] border border-border/50 hover:border-border transition-colors">
          <Avatar className="h-6 w-6 flex-shrink-0">
            {userProfile?.avatar_url && userProfile.avatar_url.trim() !== '' ? (
              <AvatarImage 
                src={userProfile.avatar_url} 
                alt={userProfile?.name || "User"}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
              {userProfile?.name ? getInitials(userProfile.name) : <User className="h-3 w-3" />}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate max-w-[120px]">
            {userProfile?.name || "User"}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-0 ml-2 border-0 bg-gray-50 dark:bg-gray-900 shadow-lg">
        {/* User Profile Section */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 flex-shrink-0">
              {userProfile?.avatar_url && userProfile.avatar_url.trim() !== '' ? (
                <AvatarImage 
                  src={userProfile.avatar_url} 
                  alt={userProfile?.name || "User"}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : null}
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
  )
}

