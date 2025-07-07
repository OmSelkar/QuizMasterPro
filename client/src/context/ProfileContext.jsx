"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "./AuthContext"

const ProfileContext = createContext()

export function ProfileProvider({ children }) {
  const { user, makeAuthenticatedRequest } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchProfile()
    } else {
      setProfile(null)
      setLoading(false)
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await makeAuthenticatedRequest("/api/users/profile")
      if (response.success) {
        setProfile(response.user)
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates) => {
    try {
      const response = await makeAuthenticatedRequest("/api/users/profile", {
        method: "PUT",
        body: JSON.stringify(updates),
      })

      if (response.success) {
        setProfile(response.user)
        return response.user
      } else {
        throw new Error(response.message || "Failed to update profile")
      }
    } catch (error) {
      console.error("Failed to update profile:", error)
      throw error
    }
  }

  const value = {
    profile,
    loading,
    updateProfile,
    refreshProfile: fetchProfile,
  }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider")
  }
  return context
}
