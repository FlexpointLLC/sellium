"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function Logo({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show light logo by default during SSR, then switch based on theme
  const logoSrc = mounted && resolvedTheme === "dark" ? "/Logo-dark.svg" : "/Logo.svg"

  return (
    <Image
      src={logoSrc}
      alt="Sellium"
      width={89}
      height={23}
      className={className}
      priority
    />
  )
}
