"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext.jsx"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Mail,
  MapPin,
  Calendar,
  Camera,
  Save,
  X,
  Upload,
  AlertCircle,
  CheckCircle,
  Trophy,
  Target,
  TrendingUp,
  Plus,
  List,
  ZoomIn,
} from "lucide-react"

const DEFAULT_BIO = "Hey there! I'm using Quiz App to challenge myself and learn new things every day. 🧠✨"

export default function Profile() {
  const { user, userProfile, updateUserProfile, loading, makeAuthenticatedRequest } = useAuth()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [imagePreview, setImagePreview] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)
  const [userStats, setUserStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    displayName: "",
    photoURL: "",
    bio: "",
    age: "",
    location: "",
  })

  // Initialize form data when userProfile loads
  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || "",
        photoURL: userProfile.photoURL || "",
        bio: userProfile.bio || DEFAULT_BIO,
        age: userProfile.age || "",
        location: userProfile.location || "",
      })
      setImagePreview(userProfile.photoURL || "")
    }
  }, [userProfile])

  // Load user statistics
  useEffect(() => {
    const loadUserStats = async () => {
      if (!user) return

      try {
        setLoadingStats(true)

        // Mock stats for now
        const mockStats = {
          totalQuizzesTaken: 23,
          bestScore: 95,
          averageScore: 78.5,
          quizzesCreated: 8,
        }

        try {
          const data = await makeAuthenticatedRequest("/api/user/stats")
          if (data.success) {
            setUserStats(data.stats)
          } else {
            setUserStats(mockStats)
          }
        } catch (error) {
          console.warn("Using mock stats:", error.message)
          setUserStats(mockStats)
        }
      } catch (error) {
        console.error("Failed to load user stats:", error)
      } finally {
        setLoadingStats(false)
      }
    }

    loadUserStats()
  }, [user, makeAuthenticatedRequest])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear messages when user starts typing
    if (error) setError("")
    if (success) setSuccess("")
  }

  const handleImageClick = () => {
    if (isEditing) {
      fileInputRef.current?.click()
    } else if (imagePreview && imagePreview !== "/placeholder.svg") {
      window.open(imagePreview, "_blank", "noopener,noreferrer")
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file")
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB")
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === "string") {
        setImagePreview(result)
        setFormData((prev) => ({
          ...prev,
          photoURL: result,
        }))
      }
    }
    reader.readAsDataURL(file)
    setError("")
  }

  const handleRemoveImage = () => {
    setImagePreview("")
    setSelectedFile(null)
    setFormData((prev) => ({
      ...prev,
      photoURL: "",
    }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    if (!formData.displayName.trim()) {
      setError("Display name is required")
      return
    }

    if (formData.age && (isNaN(Number(formData.age)) || Number(formData.age) < 13 || Number(formData.age) > 120)) {
      setError("Age must be between 13 and 120")
      return
    }

    setIsSaving(true)
    setError("")
    setSuccess("")

    try {
      const updateData = {
        displayName: formData.displayName.trim(),
        photoURL: formData.photoURL,
        bio: formData.bio.trim() || DEFAULT_BIO,
        age: formData.age ? Number(formData.age) : undefined,
        location: formData.location.trim(),
      }

      await updateUserProfile(updateData)
      setIsEditing(false)
      setSuccess("Profile updated successfully!")

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      console.error("Profile update error:", error)
      setError(error.message || "Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form data to original values
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || "",
        photoURL: userProfile.photoURL || "",
        bio: userProfile.bio || DEFAULT_BIO,
        age: userProfile.age || "",
        location: userProfile.location || "",
      })
      setImagePreview(userProfile.photoURL || "")
    }
    setSelectedFile(null)
    setIsEditing(false)
    setError("")
    setSuccess("")
  }

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    )
  }

  // Quick action handlers - Updated to use new route format
  const handleCreateQuiz = () => {
    navigate("/create-quiz")
  }

  const handleMyQuizzes = () => {
    if (user?.uid) {
      navigate(`/my-quizzes/${user.uid}`)
    }
  }

  const handleBrowseQuizzes = () => {
    navigate("/quiz-list")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Unable to load profile</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-2">Manage your account information and preferences</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                <p className="text-sm font-medium">{success}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleCancel} variant="outline" size="sm" disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} size="sm" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative group">
                    <Avatar className="h-32 w-32 cursor-pointer" onClick={handleImageClick}>
                      <AvatarImage src={imagePreview || "/placeholder.svg"} alt={formData.displayName} />
                      <AvatarFallback className="text-2xl">{getInitials(formData.displayName)}</AvatarFallback>
                    </Avatar>

                    {isEditing ? (
                      <>
                        <div
                          className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={handleImageClick}
                        >
                          <Camera className="h-8 w-8 text-white" />
                        </div>

                        {imagePreview && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0"
                            onClick={handleRemoveImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    ) : (
                      imagePreview &&
                      imagePreview !== "/placeholder.svg" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={handleImageClick}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      )
                    )}
                  </div>

                  {isEditing && (
                    <div className="text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button onClick={handleImageClick} variant="outline" size="sm" className="mb-2 bg-transparent">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Click on the avatar or use the upload button. Max 5MB.
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Display Name *
                    </Label>
                    {isEditing ? (
                      <Input
                        id="displayName"
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleInputChange}
                        placeholder="Enter your display name"
                        required
                      />
                    ) : (
                      <p className="text-sm py-2 px-3 bg-muted rounded-md">{userProfile.displayName}</p>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <p className="text-sm py-2 px-3 bg-muted rounded-md text-muted-foreground">{userProfile.email}</p>
                  </div>

                  {/* Age */}
                  <div className="space-y-2">
                    <Label htmlFor="age" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Age
                    </Label>
                    {isEditing ? (
                      <Input
                        id="age"
                        name="age"
                        type="number"
                        min="13"
                        max="120"
                        value={formData.age}
                        onChange={handleInputChange}
                        placeholder="Enter your age"
                      />
                    ) : (
                      <p className="text-sm py-2 px-3 bg-muted rounded-md">{userProfile.age || "Not specified"}</p>
                    )}
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </Label>
                    {isEditing ? (
                      <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="Enter your location"
                      />
                    ) : (
                      <p className="text-sm py-2 px-3 bg-muted rounded-md">{userProfile.location || "Not specified"}</p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Bio
                  </Label>
                  {isEditing ? (
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder={DEFAULT_BIO}
                      rows={3}
                      className="resize-none"
                    />
                  ) : (
                    <p className="text-sm py-2 px-3 bg-muted rounded-md">{userProfile.bio || DEFAULT_BIO}</p>
                  )}
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Tell others about yourself! If left empty, we'll use a default bio.
                    </p>
                  )}
                </div>

                {/* Account Info */}
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Provider</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{userProfile.provider === "google.com" ? "Google" : "Email"}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <p className="text-sm py-2 px-3 bg-muted rounded-md">
                      {new Date(userProfile.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quiz Statistics */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Quiz Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingStats ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading stats...</p>
                  </div>
                ) : userStats ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Quizzes Taken</span>
                      </div>
                      <Badge variant="outline">{userStats.totalQuizzesTaken}</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">Best Score</span>
                      </div>
                      <Badge variant="outline">{userStats.bestScore}</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Average Score</span>
                      </div>
                      <Badge variant="outline">{userStats.averageScore.toFixed(1)}</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">Quizzes Created</span>
                      </div>
                      <Badge variant="outline">{userStats.quizzesCreated}</Badge>
                    </div>

                    {userStats.totalQuizzesTaken === 0 && (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">Take your first quiz to see more statistics!</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Unable to load statistics</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={handleCreateQuiz} variant="outline" className="w-full justify-start bg-transparent">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Quiz
                </Button>
                <Button onClick={handleMyQuizzes} variant="outline" className="w-full justify-start bg-transparent">
                  <List className="h-4 w-4 mr-2" />
                  My Quizzes
                </Button>
                <Button onClick={handleBrowseQuizzes} variant="outline" className="w-full justify-start bg-transparent">
                  <Target className="h-4 w-4 mr-2" />
                  Browse Quizzes
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
