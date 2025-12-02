"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface StoreMember {
  id: string
  store_id: string
  user_id: string
  role: "owner" | "agent" | "rider"
  store: {
    id: string
    name: string
    logo_url: string | null
    username: string
    plan: string
  }
}

interface StoreContextType {
  currentStore: StoreMember | null
  stores: StoreMember[]
  loading: boolean
  switchStore: (storeId: string) => Promise<void>
  refreshStores: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentStore, setCurrentStore] = useState<StoreMember | null>(null)
  const [stores, setStores] = useState<StoreMember[]>([])
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const router = useRouter()
  const fetchingRef = useRef(false)
  const hasFetchedRef = useRef(false)

  // Fetch all stores the user is a member of
  const fetchStores = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      return
    }
    
    fetchingRef.current = true
    try {
      const { data: { user } } = await supabaseRef.current.auth.getUser()
      if (!user) {
        setLoading(false)
        fetchingRef.current = false
        return
      }

      // Fetch stores where user is the owner
      // Handle 406 errors gracefully (user might not have stores yet)
      const { data: ownedStores, error: ownedStoresError } = await supabaseRef.current
        .from("stores")
        .select("id, name, logo_url, username, plan")
        .eq("user_id", user.id)

      // If error exists, check if it's a 406 (Not Acceptable) - treat as empty result
      // 406 errors can occur when RLS blocks queries for users with no stores
      if (ownedStoresError) {
        // Check if error is 406 (can be in status, code, or message)
        const is406Error = 
          (ownedStoresError as any).status === 406 ||
          (ownedStoresError as any).code === '406' ||
          String(ownedStoresError.message || '').includes('406')
        
        // Only log non-406 errors (406 means no stores found, which is expected for new users)
        if (!is406Error) {
          console.error("Error fetching owned stores:", ownedStoresError)
        }
      }

      // Get owned store IDs to exclude from member stores
      const ownedStoreIds = new Set((ownedStores || [])?.map((s) => s.id) || [])

      // Fetch stores where user is a member (via store_members)
      // Handle 406 errors gracefully (user might not be a member of any stores)
      const { data: allMemberRecords, error: memberRecordsError } = await supabaseRef.current
        .from("store_members")
        .select("id, store_id, user_id, role")
        .eq("user_id", user.id)

      // If error exists, check if it's a 406 (Not Acceptable) - treat as empty result
      if (memberRecordsError) {
        // Check if error is 406 (can be in status, code, or message)
        const is406Error = 
          (memberRecordsError as any).status === 406 ||
          (memberRecordsError as any).code === '406' ||
          String(memberRecordsError.message || '').includes('406')
        
        // Only log non-406 errors (406 means no member records found, which is expected)
        if (!is406Error) {
          console.error("Error fetching member records:", memberRecordsError)
        }
      }

      // Filter out member records for stores the user already owns
      const memberRecords = (allMemberRecords || []).filter(
        (member) => !ownedStoreIds.has(member.store_id)
      )

      // Fetch store details for members
      let memberStores: any[] = []
      if (memberRecords && memberRecords.length > 0) {
        const storeIds = memberRecords.map((m) => m.store_id)
        const { data: memberStoreDetails, error: memberStoreDetailsError } = await supabaseRef.current
          .from("stores")
          .select("id, name, logo_url, username, plan")
          .in("id", storeIds)

        // If error exists, check if it's a 406 (Not Acceptable) - treat as empty result
        if (memberStoreDetailsError) {
          // Check if error is 406 (can be in status, code, or message)
          const is406Error = 
            (memberStoreDetailsError as any).status === 406 ||
            (memberStoreDetailsError as any).code === '406' ||
            String(memberStoreDetailsError.message || '').includes('406')
          
          // Only log non-406 errors (406 means no stores found, which can happen)
          if (!is406Error) {
            console.error("Error fetching member store details:", memberStoreDetailsError)
          }
        }

        if (memberStoreDetails) {
          memberStores = memberRecords.map((member) => {
            const store = memberStoreDetails.find((s) => s.id === member.store_id)
            return store ? { ...member, store } : null
          }).filter(Boolean)
        }
      }

      const allStores: StoreMember[] = []
      const addedStoreIds = new Set<string>()

      // Add owned stores as owner role (these take priority)
      if (ownedStores) {
        ownedStores.forEach((store) => {
          if (!addedStoreIds.has(store.id)) {
            allStores.push({
              id: `owned-${store.id}`,
              store_id: store.id,
              user_id: user.id,
              role: "owner",
              store: {
                id: store.id,
                name: store.name,
                logo_url: store.logo_url,
                username: store.username,
                plan: store.plan || "free",
              },
            })
            addedStoreIds.add(store.id)
          }
        })
      }

      // Add member stores (avoid duplicates with owned stores)
      if (memberStores && memberStores.length > 0) {
        memberStores.forEach((member: any) => {
          if (member.store && !addedStoreIds.has(member.store.id)) {
            allStores.push({
              id: member.id,
              store_id: member.store_id,
              user_id: member.user_id,
              role: member.role as "owner" | "agent" | "rider",
              store: {
                id: member.store.id,
                name: member.store.name,
                logo_url: member.store.logo_url,
                username: member.store.username,
                plan: member.store.plan || "free",
              },
            })
            addedStoreIds.add(member.store.id)
          }
        })
      }

      // Final deduplication by store_id (keep first occurrence)
      // Use a Map to ensure no duplicates by store_id
      const storeMap = new Map<string, StoreMember>()
      allStores.forEach((store) => {
        if (!storeMap.has(store.store_id)) {
          storeMap.set(store.store_id, store)
        }
      })
      const uniqueStores = Array.from(storeMap.values())

      setStores(uniqueStores)

      // Get or set current store - use user-specific localStorage key
      const userStoreKey = `currentStoreId_${user.id}`
      const storedStoreId = localStorage.getItem(userStoreKey)
      let selectedStore = uniqueStores.find((s) => s.store_id === storedStoreId)

      // If no stored store or stored store not in list, use first store
      if (!selectedStore && uniqueStores.length > 0) {
        selectedStore = uniqueStores[0]
        localStorage.setItem(userStoreKey, selectedStore.store_id)
      } else if (selectedStore) {
        // Ensure the stored store ID is saved (in case it wasn't before)
        localStorage.setItem(userStoreKey, selectedStore.store_id)
      }

      // Only update currentStore if it's different to prevent unnecessary re-renders
      const newStore = selectedStore || null
      setCurrentStore(prev => {
        if (prev?.store_id === newStore?.store_id) {
          return prev // Return same reference if store hasn't changed
        }
        return newStore
      })
    } catch (error) {
      console.error("Error fetching stores:", error)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [])

  const switchStore = useCallback(async (storeId: string) => {
    const store = stores.find((s) => s.store_id === storeId)
    if (store) {
      // Get current user to save store preference per user
      const { data: { user } } = await supabaseRef.current.auth.getUser()
      if (user) {
        const userStoreKey = `currentStoreId_${user.id}`
        localStorage.setItem(userStoreKey, storeId)
      }
      setCurrentStore(store)
      // Refresh the page to update all data
      router.refresh()
    }
  }, [stores, router])

  const refreshStores = useCallback(async () => {
    if (fetchingRef.current) {
      return
    }
    setLoading(true)
    await fetchStores()
  }, [fetchStores])

  useEffect(() => {
    // Only fetch once on mount - use a more robust check
    if (!hasFetchedRef.current && !fetchingRef.current) {
      hasFetchedRef.current = true
      fetchStores()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <StoreContext.Provider
      value={{
        currentStore,
        stores,
        loading,
        switchStore,
        refreshStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider")
  }
  return context
}

