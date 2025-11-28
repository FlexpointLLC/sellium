"use client"

import { useStore } from "@/lib/store-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CaretDown, Check } from "phosphor-react"

export function UserDropdown() {
  const { currentStore, stores, loading, switchStore } = useStore()

  const getRoleLabel = (role: string): string => {
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

  const getInitials = (name: string | null): string => {
    if (!name) return "S"
    const parts = name.trim().split(" ").filter(part => part.length > 0)
    if (parts.length >= 2) {
      // First letter of first word and first letter of last word
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    // If only one word, show first two letters if available, otherwise just first letter
    if (parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase()
    }
    return parts[0][0].toUpperCase()
  }

  if (loading || !currentStore) {
    return (
      <div className="h-9 w-full bg-muted animate-pulse rounded-lg" />
    )
  }

  const handleStoreSwitch = async (storeId: string) => {
    if (storeId !== currentStore.store_id) {
      await switchStore(storeId)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg bg-muted/15 hover:bg-muted transition-colors group`}>
          {currentStore.store.logo_url ? (
            <img 
              src={currentStore.store.logo_url} 
              alt={currentStore.store.name || "Store"} 
              className="h-10 w-10 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {getInitials(currentStore.store.name || null)}
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <div className="font-medium text-sm truncate">
              {currentStore.store.name || "Store"}
            </div>
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {getRoleLabel(currentStore.role)}
            </div>
          </div>
          <CaretDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0 ml-2 border-0 bg-gray-50 dark:bg-gray-900 shadow-lg">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Switch Organization
          </div>
          <div className="flex items-center gap-3">
            {currentStore.store.logo_url ? (
              <img 
                src={currentStore.store.logo_url} 
                alt={currentStore.store.name || "Store"} 
                className="h-10 w-10 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {getInitials(currentStore.store.name || null)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {currentStore.store.name || "Store"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {getRoleLabel(currentStore.role)}
              </div>
            </div>
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {stores.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              No organizations found
            </div>
          ) : (
            // Deduplicate by store_id and filter out current store (it's already shown in header)
            Array.from(
              new Map(stores.map((store) => [store.store_id, store])).values()
            )
            .filter((store) => store.store_id !== currentStore.store_id)
            .map((store) => (
              <DropdownMenuItem
                key={store.store_id}
                onClick={() => handleStoreSwitch(store.store_id)}
                className="px-4 py-3 cursor-pointer hover:bg-muted/50 focus:bg-muted/50"
              >
                <div className="flex items-center gap-3 w-full">
                  {store.store.logo_url ? (
                    <img 
                      src={store.store.logo_url} 
                      alt={store.store.name || "Store"} 
                      className="h-8 w-8 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {getInitials(store.store.name || null)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {store.store.name || "Store"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {getRoleLabel(store.role)}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

