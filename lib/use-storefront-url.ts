"use client"

import { useEffect, useState } from 'react'

// Known Sellium domains that use /username paths
const selliumDomains = [
  'sellium.store',
  'my.sellium.store',
  'admin.sellium.store',
  'localhost',
  '127.0.0.1',
  'vercel.app'
]

function isCustomDomain(hostname: string): boolean {
  const host = hostname.split(':')[0]
  return !selliumDomains.some(domain => 
    host === domain || host.endsWith(`.${domain}`)
  )
}

export function useStorefrontUrl(username: string) {
  const [isCustom, setIsCustom] = useState(false)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsCustom(isCustomDomain(window.location.hostname))
    }
  }, [])
  
  // Generate URL based on whether we're on a custom domain
  const getUrl = (path: string = '') => {
    if (isCustom) {
      // On custom domain, don't include username
      return path || '/'
    }
    // On Sellium domain, include username
    return `/${username}${path}`
  }
  
  return { isCustomDomain: isCustom, getUrl }
}

// Server-side version that checks headers
export function getStorefrontBasePath(hostname: string, username: string): string {
  if (isCustomDomain(hostname)) {
    return ''
  }
  return `/${username}`
}

