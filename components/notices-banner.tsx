"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Megaphone, X } from "phosphor-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Notice {
  id: string
  title: string
  description: string
  color: string
  closeable: boolean
}

export function NoticesBanner() {
  const supabase = createClient()
  const [notices, setNotices] = useState<Notice[]>([])
  const [dismissedNotices, setDismissedNotices] = useState<Set<string>>(new Set())
  const [storeId, setStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load dismissed notices from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("dismissedNotices")
    if (stored) {
      try {
        setDismissedNotices(new Set(JSON.parse(stored)))
      } catch (e) {
        console.error("Error loading dismissed notices:", e)
      }
    }
  }, [])

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      // Get user's store
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (store) {
        setStoreId(store.id)
      }

      // Fetch active notices (global and store-specific)
      const { data: noticesData, error } = await supabase
        .from("notices")
        .select("id, title, description, color, closeable")
        .eq("status", "active")
        .or(store ? `store_id.is.null,store_id.eq.${store.id}` : "store_id.is.null")

      if (error) {
        console.error("Error fetching notices:", error)
        setLoading(false)
        return
      }

      setNotices(noticesData || [])
      setLoading(false)
    }

    fetchData()
  }, [supabase])

  const handleDismiss = (noticeId: string) => {
    const newDismissed = new Set(dismissedNotices)
    newDismissed.add(noticeId)
    setDismissedNotices(newDismissed)
    localStorage.setItem("dismissedNotices", JSON.stringify(Array.from(newDismissed)))
  }

  // Filter out dismissed notices
  const visibleNotices = notices.filter((notice) => !dismissedNotices.has(notice.id))

  if (loading || visibleNotices.length === 0) {
    return null
  }

  const getColorStyles = (color: string) => {
    const styles: Record<string, { bg: string; border: string; text: string }> = {
      red: {
        bg: "bg-red-50 dark:bg-red-950/30",
        border: "border-red-200 dark:border-red-800",
        text: "text-red-900 dark:text-red-100",
      },
      green: {
        bg: "bg-green-50 dark:bg-green-950/30",
        border: "border-green-200 dark:border-green-800",
        text: "text-green-900 dark:text-green-100",
      },
      blue: {
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200 dark:border-blue-800",
        text: "text-blue-900 dark:text-blue-100",
      },
      yellow: {
        bg: "bg-yellow-50 dark:bg-yellow-950/30",
        border: "border-yellow-200 dark:border-yellow-800",
        text: "text-yellow-900 dark:text-yellow-100",
      },
      grey: {
        bg: "bg-gray-50 dark:bg-gray-950/30",
        border: "border-gray-200 dark:border-gray-800",
        text: "text-gray-900 dark:text-gray-100",
      },
    }
    return styles[color] || styles.grey
  }

  return (
    <div className="mx-auto max-w-6xl space-y-2 mb-6">
      {visibleNotices.map((notice) => {
        const colors = getColorStyles(notice.color)
        return (
          <div
            key={notice.id}
            className={cn(
              "rounded-lg border p-4 flex items-start gap-3 relative",
              colors.bg,
              colors.border,
              colors.text
            )}
          >
            <Megaphone className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium mb-1">{notice.title}</h3>
              <p className="text-sm opacity-90">{notice.description}</p>
            </div>
            {notice.closeable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(notice.id)}
                className={cn(
                  "h-6 w-6 p-0 shrink-0 hover:bg-black/10 dark:hover:bg-white/10",
                  colors.text
                )}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

