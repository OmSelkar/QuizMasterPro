"use client"

import { useEffect, useContext } from "react"
import { useAuth } from "../context/AuthContext"
import { AppContext } from "../context/AppContext"
import axios from "axios"

export function useOnlineStatus() {
  const { user } = useAuth()
  const { backendUrl } = useContext(AppContext)

  useEffect(() => {
    if (!user || !backendUrl) return

    let heartbeatInterval
    let isActive = true

    const sendHeartbeat = async () => {
      if (!isActive || !user) return

      try {
        const token = await user.getIdToken()
        await axios.post(
          `${backendUrl}/api/users/heartbeat`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000, // 10 second timeout
          },
        )
        console.log("💓 Heartbeat sent successfully")
      } catch (error) {
        console.error("❌ Heartbeat failed:", error.response?.data?.message || error.message)
      }
    }

    const setOffline = async () => {
      if (!user) return

      try {
        const token = await user.getIdToken()
        await axios.post(
          `${backendUrl}/api/users/offline`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 3000, // 3 second timeout for offline requests
          },
        )
        console.log("📴 User set offline successfully")
      } catch (error) {
        // Silently handle offline errors - they're not critical
        if (error.code !== "ECONNABORTED") {
          console.warn("⚠️ Set offline failed (non-critical)")
        }
      }
    }

    // Send initial heartbeat
    sendHeartbeat()

    // Set up interval for heartbeat (every 2 minutes)
    heartbeatInterval = setInterval(sendHeartbeat, 2 * 60 * 1000)

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isActive = false
        setOffline()
      } else {
        isActive = true
        sendHeartbeat()
      }
    }

    // Handle page unload
    const handleBeforeUnload = () => {
      isActive = false
      // Don't wait for offline request during page unload
      setOffline()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      isActive = false
      clearInterval(heartbeatInterval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      // Don't call setOffline in cleanup as it may cause issues
    }
  }, [user, backendUrl])
}
