"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CaretDown } from "phosphor-react"

export function UserDropdown() {
  const supabase = createClient()
  const [storeData, setStoreData] = useState<{
    name: string | null
    logo_url: string | null
  } | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
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

      // Fetch store data
      const { data: store } = await supabase
        .from("stores")
        .select("name, logo_url")
        .eq("user_id", user.id)
        .single()

      if (store) {
        setStoreData({
          name: store.name,
          logo_url: store.logo_url,
        })
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  const getRoleLabel = (role: string | null): string => {
    switch (role) {
      case 'admin':
        return 'Admin'
      case 'owner':
        return 'Owner'
      case 'agent':
        return 'Agent'
      case 'rider':
        return 'Rider'
      default:
        return 'Owner'
    }
  }

  if (loading) {
    return (
      <div className="h-9 w-32 bg-muted animate-pulse rounded-lg" />
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg bg-muted/15 hover:bg-muted transition-colors group`}>
          {storeData?.logo_url ? (
            <img 
              src={storeData.logo_url} 
              alt={storeData.name || "Store"} 
              className="h-10 w-10 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {storeData?.name ? storeData.name.charAt(0).toUpperCase() : "S"}
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <div className="font-medium text-sm truncate">
              {storeData?.name || "Store"}
            </div>
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {getRoleLabel(userRole)}
            </div>
          </div>
          <CaretDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-0 ml-2 border-0 bg-gray-50 dark:bg-gray-900 shadow-lg">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            {storeData?.logo_url ? (
              <img 
                src={storeData.logo_url} 
                alt={storeData.name || "Store"} 
                className="h-10 w-10 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {storeData?.name ? storeData.name.charAt(0).toUpperCase() : "S"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {storeData?.name || "Store"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {getRoleLabel(userRole)}
              </div>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

