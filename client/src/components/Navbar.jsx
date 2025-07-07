"use client"

import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Code, BookOpen, Plus, User, Settings, LogOut, Moon, Sun, Menu, Trophy, Target, Sparkles } from "lucide-react"

export function Navbar() {
  const { user, userProfile, signOutUser } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOutUser()
      navigate("/")
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const handleNavigation = (path) => {
    navigate(path)
    setMobileMenuOpen(false)
  }

  const isActive = (path) => location.pathname === path

  const navItems = [
    {
      label: "Discover",
      path: "/quiz-list",
      icon: BookOpen,
      description: "Browse all quizzes",
    },
    {
      label: "Create",
      path: "/create-quiz",
      icon: Plus,
      description: "Build new quiz",
      requiresAuth: true,
    },
    {
      label: "My Quizzes",
      path: "/my-quizzes",
      icon: Target,
      description: "Manage your quizzes",
      requiresAuth: true,
    },
  ]

  // Get display name with fallbacks
  const getDisplayName = () => {
    if (userProfile?.displayName) return userProfile.displayName
    if (user?.displayName) return user.displayName
    if (user?.email) return user.email.split("@")[0]
    return "User"
  }

  // Get profile photo with fallbacks
  const getPhotoURL = () => {
    if (userProfile?.photoURL) return userProfile.photoURL
    if (user?.photoURL) return user.photoURL
    return "/placeholder.svg"
  }

  // Get user initials
  const getUserInitials = () => {
    const name = getDisplayName()
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="p-2 bg-primary rounded-lg">
              <Code className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold">QuizMaster Pro</h1>
              <p className="text-xs text-muted-foreground -mt-1">by Om Selkar</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              if (item.requiresAuth && !user) return null

              return (
                <Button
                  key={item.path}
                  asChild
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className="relative group"
                >
                  <Link to={item.path} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {isActive(item.path) && <Sparkles className="h-3 w-3 ml-1 text-primary-foreground" />}
                  </Link>
                </Button>
              )
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-9 w-9 p-0">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getPhotoURL() || "/placeholder.svg"} alt={getDisplayName()} />
                      <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    {userProfile?.privacy?.showOnlineStatus && (
                      <div className="absolute -bottom-0 -right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      {userProfile?.privacy?.showOnlineStatus && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Online
                        </div>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleNavigation("/profile")}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation("/my-quizzes")}>
                    <Trophy className="h-4 w-4 mr-2" />
                    My Quizzes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation("/settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleNavigation("/login")}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => handleNavigation("/register")}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Started
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden h-9 w-9 p-0">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Menu</h2>
                  </div>

                  <div className="space-y-2 flex-1">
                    {navItems.map((item) => {
                      if (item.requiresAuth && !user) return null

                      return (
                        <Button
                          key={item.path}
                          variant={isActive(item.path) ? "default" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => handleNavigation(item.path)}
                        >
                          <item.icon className="h-4 w-4 mr-2" />
                          <div className="text-left">
                            <div>{item.label}</div>
                            <div className="text-xs text-muted-foreground">{item.description}</div>
                          </div>
                        </Button>
                      )
                    })}
                  </div>

                  {user ? (
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getPhotoURL() || "/placeholder.svg"} alt={getDisplayName()} />
                          <AvatarFallback>{getUserInitials()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{getDisplayName()}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Button onClick={handleSignOut} variant="outline" className="w-full bg-transparent">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <div className="border-t pt-4 mt-4 space-y-2">
                      <Button className="w-full" onClick={() => handleNavigation("/login")}>
                        Sign In
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() => handleNavigation("/register")}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Get Started
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}