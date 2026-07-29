"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { logPageView } from "@/app/actions/traffic"

function getOrCreateSessionId(): string {
  const key = "tmk_session_id"
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export function PageTracker() {
  const pathname = usePathname()
  const lastPath = useRef("")

  useEffect(() => {
    if (pathname === lastPath.current) return
    lastPath.current = pathname

    const sessionId = getOrCreateSessionId()
    const device = navigator.userAgent || "unknown"

    logPageView(sessionId, pathname, device)
  }, [pathname])

  return null
}
