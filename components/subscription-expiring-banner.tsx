"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Clock } from "phosphor-react"

export function SubscriptionExpiringBanner() {
  const supabase = createClient()
  const [showBanner, setShowBanner] = useState(false)
  const [bannerData, setBannerData] = useState<{
    plan: string
    daysLeft: number
    expiresAt: string
  } | null>(null)

  useEffect(() => {
    async function checkSubscription() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Fetch store with subscription info
      // Handle errors gracefully (user might not have a store yet)
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("plan, subscription_expires_at")
        .eq("user_id", user.id)
        .maybeSingle()

      // If error exists and it's not a 406 (which means no store found), log it
      if (storeError) {
        const is406Error = 
          (storeError as any).status === 406 ||
          (storeError as any).code === '406' ||
          String(storeError.message || '').includes('406')
        
        if (!is406Error) {
          console.error("Error fetching store for subscription banner:", storeError)
        }
      }

      if (!store || !store.subscription_expires_at || store.plan === 'free') {
        setShowBanner(false)
        return
      }

      const expiresAt = new Date(store.subscription_expires_at)
      const now = new Date()
      // Reset time to start of day for accurate day calculation
      const expiresDate = new Date(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate())
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const daysLeft = Math.ceil((expiresDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysLeft <= 7 && daysLeft >= 0) {
        setBannerData({
          plan: store.plan,
          daysLeft,
          expiresAt: store.subscription_expires_at
        })
        setShowBanner(true)
      } else {
        setShowBanner(false)
      }
    }

    checkSubscription()
    
    // Check every hour for updates
    const interval = setInterval(checkSubscription, 60 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [supabase])

  if (!showBanner || !bannerData) return null

  const expiresAt = new Date(bannerData.expiresAt)

  return (
    <div className="mb-6 rounded-xl border border-red-300 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Clock className="h-5 w-5 text-red-600 dark:text-red-400" weight="fill" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
            Your subscription is ending soon
          </h3>
          <p className="text-xs text-red-700 dark:text-red-300">
            Your {bannerData.plan === 'paid' ? 'Paid' : 'Pro'} plan subscription will expire in {bannerData.daysLeft} {bannerData.daysLeft === 1 ? 'day' : 'days'} ({expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}). 
            Renew your subscription to continue enjoying premium features.
          </p>
        </div>
      </div>
    </div>
  )
}

