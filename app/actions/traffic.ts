"use server"

import { createClient } from "@/utils/supabase/server"

export async function logPageView(sessionId: string, path: string, device: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from("traffic_log").insert({
    session_id: sessionId,
    user_id: user?.id || null,
    user_name: user?.email || "Anonymous Guest",
    path,
    device: device.slice(0, 100),
  })

  if (error) console.error("Failed to log page view:", error.message)
}
