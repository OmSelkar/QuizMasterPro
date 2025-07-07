"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getAuth, deleteUser, updateProfile } from "firebase/auth"
import { useProfile } from "../context/ProfileContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  SettingsIcon,
  Sun,
  Bell,
  Shield,
  Database,
  Download,
  Trash2,
  Save,
  RefreshCw,
  AlertTriangle,
  User,
  CheckCircle,
} from "lucide-react"
import Loading from "../components/Loading"

export default function Settings() {
  const { profile, loading, updateProfile: updateProfileContext } = useProfile()
  const navigate = useNavigate()
  const auth = getAuth()

  const [settings, setSettings] = useState({
    emailNotifications: true,
    quizReminders: false,
    autoSave: true,
    soundEffects: false,
    animationsEnabled: true,
    compactMode: false,
    showScores: true,
    allowAnalytics: true,
    marketingEmails: false,
    weeklyDigest: true,
  })

  const [privacy, setPrivacy] = useState({
    profileVisibility: true,
    leaderboardVisibility: true,
    showEmail: false,
    showLocation: true,
    showAge: false,
    allowDirectMessages: true,
    showOnlineStatus: true,
    showQuizHistory: false,
    allowProfileSearch: true,
    showAchievements: true,
  })

  const [profileData, setProfileData] = useState({
    name: "",
    bio: "",
    location: "",
    website: "",
    phone: "",
    birthDate: "",
  })

  const [saving, setSaving] = useState(false)
  const [exportingData, setExportingData] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login")
      return
    }
  }, [])

  // Load settings from localStorage and profile on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("quiz-app-settings")
    const savedPrivacy = localStorage.getItem("quiz-app-privacy")

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(parsed)
        applySettings(parsed)
      } catch (e) {
        console.warn("Failed to load settings:", e)
      }
    }

    if (savedPrivacy) {
      try {
        setPrivacy(JSON.parse(savedPrivacy))
      } catch (e) {
        console.warn("Failed to load privacy settings:", e)
      }
    }

    // Load profile data from context
    if (profile) {
      setProfileData({
        name: profile.name || "",
        bio: profile.bio || "",
        location: profile.location || "",
        website: profile.website || "",
        phone: profile.phone || "",
        birthDate: profile.birthDate || "",
      })

      // Load backend settings if they exist
      if (profile.settings) {
        const newSettings = { ...settings, ...profile.settings }
        setSettings(newSettings)
        applySettings(newSettings)
      }

      // Load backend privacy settings if they exist
      if (profile.privacy) {
        setPrivacy((prev) => ({ ...prev, ...profile.privacy }))
      }
    }
  }, [profile])

  const applySettings = (settingsToApply) => {
    // Apply animations setting
    if (settingsToApply.animationsEnabled === false) {
      document.documentElement.style.setProperty("--animation-duration", "0s")
      document.documentElement.classList.add("no-animations")
    } else {
      document.documentElement.style.setProperty("--animation-duration", "0.2s")
      document.documentElement.classList.remove("no-animations")
    }

    // Apply compact mode
    if (settingsToApply.compactMode) {
      document.documentElement.classList.add("compact-mode")
    } else {
      document.documentElement.classList.remove("compact-mode")
    }

    // Add CSS for real-time settings if not already added
    if (!document.getElementById("settings-styles")) {
      const style = document.createElement("style")
      style.id = "settings-styles"
      style.textContent = `
        .no-animations * {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
        
        .compact-mode {
          --spacing-unit: 0.75rem;
        }
        
        .compact-mode .card {
          padding: var(--spacing-unit);
        }
        
        .compact-mode .text-lg {
          font-size: 1rem;
        }
        
        .compact-mode .text-xl {
          font-size: 1.125rem;
        }
      `
      document.head.appendChild(style)
    }
  }

  const showMessage = (message, isError = false) => {
    if (isError) {
      setErrorMessage(message)
      setSuccessMessage("")
    } else {
      setSuccessMessage(message)
      setErrorMessage("")
    }

    // Clear message after 5 seconds
    setTimeout(() => {
      setErrorMessage("")
      setSuccessMessage("")
    }, 5000)
  }

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem("quiz-app-settings", JSON.stringify(newSettings))

    // Apply settings immediately
    applySettings(newSettings)

    // Play test sound when sound effects are enabled
    if (key === "soundEffects" && value) {
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
        )
        audio.volume = 0.1
        audio.play().catch(() => {}) // Ignore errors
      } catch (e) {
        console.log("Sound test failed:", e)
      }
    }

    // Clear messages when user makes changes
    setErrorMessage("")
    setSuccessMessage("")
  }

  const handlePrivacyChange = (key, value) => {
    const newPrivacy = { ...privacy, [key]: value }
    setPrivacy(newPrivacy)
    localStorage.setItem("quiz-app-privacy", JSON.stringify(newPrivacy))

    // Clear messages when user makes changes
    setErrorMessage("")
    setSuccessMessage("")
  }

  const handleProfileChange = (key, value) => {
    setProfileData((prev) => ({ ...prev, [key]: value }))

    // Clear messages when user makes changes
    setErrorMessage("")
    setSuccessMessage("")
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      // Validate required fields
      if (!profileData.name.trim()) {
        throw new Error("Display name is required")
      }

      // Update Firebase profile if needed
      if (auth.currentUser && profileData.name !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: profileData.name,
        })
      }

      // Prepare complete profile update including settings and privacy
      const updateData = {
        ...profileData,
        settings: settings,
        privacy: privacy,
      }

      console.log("Saving complete profile data:", updateData)

      // Save to backend using context (this will sync across components)
      await updateProfileContext(updateData)

      // Update localStorage to ensure consistency
      localStorage.setItem("quiz-app-settings", JSON.stringify(settings))
      localStorage.setItem("quiz-app-privacy", JSON.stringify(privacy))

      showMessage("Settings saved successfully!")
    } catch (error) {
      console.error("Failed to save settings:", error)
      showMessage(error.message || "Failed to save settings. Please try again.", true)
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    setExportingData(true)
    try {
      // Create comprehensive export data
      const exportData = {
        profile: {
          ...profile,
          ...profileData,
        },
        settings: settings,
        privacy: privacy,
        account: {
          email: auth.currentUser?.email,
          createdAt: auth.currentUser?.metadata?.creationTime,
          lastSignIn: auth.currentUser?.metadata?.lastSignInTime,
          provider: auth.currentUser?.providerData?.[0]?.providerId,
        },
        exportDate: new Date().toISOString(),
        version: "1.0",
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(dataBlob)

      const link = document.createElement("a")
      link.href = url
      link.download = `quiz-app-data-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showMessage("Data exported successfully!")
    } catch (error) {
      console.error("Failed to export data:", error)
      showMessage("Failed to export data. Please try again.", true)
    } finally {
      setExportingData(false)
    }
  }

  const handleClearData = () => {
    if (window.confirm("Are you sure you want to clear all local data? This action cannot be undone.")) {
      localStorage.clear()
      sessionStorage.clear()
      showMessage("Local data cleared successfully!")
      setTimeout(() => window.location.reload(), 1000)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE MY ACCOUNT") {
      showMessage("Please type 'DELETE MY ACCOUNT' to confirm", true)
      return
    }

    setDeletingAccount(true)
    try {
      // Delete Firebase account
      await deleteUser(auth.currentUser)

      showMessage("Account deleted successfully. You will be redirected to the home page.")
      setTimeout(() => navigate("/", { replace: true }), 2000)
    } catch (error) {
      console.error("Failed to delete account:", error)
      showMessage("Failed to delete account. Please try again or contact support.", true)
    } finally {
      setDeletingAccount(false)
      setShowDeleteConfirm(false)
      setDeleteConfirmText("")
    }
  }

  if (loading) return <Loading />

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Customize your quiz experience and manage your account</p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-700 dark:text-green-300">{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert className="mb-6 border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-destructive">{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal information and profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    value={profileData.name}
                    onChange={(e) => handleProfileChange("name", e.target.value)}
                    placeholder="Your display name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={auth.currentUser?.email || ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => handleProfileChange("bio", e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profileData.location}
                    onChange={(e) => handleProfileChange("location", e.target.value)}
                    placeholder="Your location"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={profileData.website}
                    onChange={(e) => handleProfileChange("website", e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => handleProfileChange("phone", e.target.value)}
                    placeholder="Your phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Birth Date</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={profileData.birthDate}
                    onChange={(e) => handleProfileChange("birthDate", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize how the app looks and feels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Animations</Label>
                  <p className="text-sm text-muted-foreground">Enable smooth transitions and animations</p>
                </div>
                <Switch
                  checked={settings.animationsEnabled}
                  onCheckedChange={(checked) => handleSettingChange("animationsEnabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">Use a more compact layout</p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(checked) => handleSettingChange("compactMode", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Sound Effects</Label>
                  <p className="text-sm text-muted-foreground">Play sounds for interactions</p>
                </div>
                <Switch
                  checked={settings.soundEffects}
                  onCheckedChange={(checked) => handleSettingChange("soundEffects", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive important updates via email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Quiz Reminders</Label>
                  <p className="text-sm text-muted-foreground">Get reminded about incomplete quizzes</p>
                </div>
                <Switch
                  checked={settings.quizReminders}
                  onCheckedChange={(checked) => handleSettingChange("quizReminders", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">Receive weekly summary of your activity</p>
                </div>
                <Switch
                  checked={settings.weeklyDigest}
                  onCheckedChange={(checked) => handleSettingChange("weeklyDigest", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">Receive promotional content and updates</p>
                </div>
                <Switch
                  checked={settings.marketingEmails}
                  onCheckedChange={(checked) => handleSettingChange("marketingEmails", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy & Visibility Settings */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Visibility
              </CardTitle>
              <CardDescription>Control what information is visible to others</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">Show your profile in search results</p>
                </div>
                <Switch
                  checked={privacy.profileVisibility}
                  onCheckedChange={(checked) => handlePrivacyChange("profileVisibility", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Leaderboard Visibility</Label>
                  <p className="text-sm text-muted-foreground">Show your scores on leaderboards</p>
                </div>
                <Switch
                  checked={privacy.leaderboardVisibility}
                  onCheckedChange={(checked) => handlePrivacyChange("leaderboardVisibility", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Show Email</Label>
                  <p className="text-sm text-muted-foreground">Display email in public profile</p>
                </div>
                <Switch
                  checked={privacy.showEmail}
                  onCheckedChange={(checked) => handlePrivacyChange("showEmail", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Show Location</Label>
                  <p className="text-sm text-muted-foreground">Display location in profile</p>
                </div>
                <Switch
                  checked={privacy.showLocation}
                  onCheckedChange={(checked) => handlePrivacyChange("showLocation", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Show Online Status</Label>
                  <p className="text-sm text-muted-foreground">Display when you're online</p>
                </div>
                <Switch
                  checked={privacy.showOnlineStatus}
                  onCheckedChange={(checked) => handlePrivacyChange("showOnlineStatus", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Allow Direct Messages</Label>
                  <p className="text-sm text-muted-foreground">Let other users send you messages</p>
                </div>
                <Switch
                  checked={privacy.allowDirectMessages}
                  onCheckedChange={(checked) => handlePrivacyChange("allowDirectMessages", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>Manage your data and account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleExportData}
                  disabled={exportingData}
                  variant="outline"
                  className="flex-1 bg-transparent"
                >
                  {exportingData ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export Data
                </Button>

                <Button onClick={handleClearData} variant="outline" className="flex-1 bg-transparent">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Local Data
                </Button>
              </div>

              <Separator />

              <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <h4 className="font-semibold text-destructive mb-2">Delete Account</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>

                {!showDeleteConfirm ? (
                  <Button onClick={() => setShowDeleteConfirm(true)} variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Type "DELETE MY ACCOUNT" to confirm:</Label>
                      <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="DELETE MY ACCOUNT"
                        className="border-destructive focus:ring-destructive"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleDeleteAccount}
                        disabled={deletingAccount || deleteConfirmText !== "DELETE MY ACCOUNT"}
                        variant="destructive"
                        size="sm"
                      >
                        {deletingAccount ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Confirm Delete
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmText("")
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving} className="min-w-[120px]">
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
