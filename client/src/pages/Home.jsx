"use client"

import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Target,
  Trophy,
  Users,
  BookOpen,
  Clock,
  Star,
  Zap,
  Shield,
  Smartphone,
  ArrowRight,
  CheckCircle,
  Sparkles,
} from "lucide-react"

export default function ImprovedHome() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate("/register")
  }

  const handleSignIn = () => {
    navigate("/login")
  }

  const handleBrowseQuizzes = () => {
    navigate("/quiz-list")
  }

  const handleCreateQuiz = () => {
    navigate("/create-quiz")
  }

  const features = [
    {
      icon: Target,
      title: "Create Custom Quizzes",
      description: "Build engaging quizzes with multiple question types, time limits, and advanced settings.",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      icon: Trophy,
      title: "Track Your Progress",
      description: "Monitor your performance with detailed analytics and see how you improve over time.",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      icon: Users,
      title: "Compete & Share",
      description: "Share quizzes with friends, compete on leaderboards, and build a learning community.",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      icon: Shield,
      title: "Privacy Controls",
      description: "Full control over your privacy with customizable visibility settings for your profile.",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
    {
      icon: Zap,
      title: "Real-time Results",
      description: "Get instant feedback with real-time scoring and detailed answer explanations.",
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    },
    {
      icon: Smartphone,
      title: "Mobile Friendly",
      description: "Take quizzes anywhere with our responsive design that works on all devices.",
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-100 dark:bg-pink-900/20",
    },
  ]

  const stats = [
    { label: "Active Users", value: "10K+", icon: Users, color: "text-blue-600" },
    { label: "Quizzes Created", value: "50K+", icon: BookOpen, color: "text-green-600" },
    { label: "Hours Learned", value: "100K+", icon: Clock, color: "text-purple-600" },
    { label: "Success Rate", value: "95%", icon: Star, color: "text-yellow-600" },
  ]

  const benefits = [
    "Create unlimited quizzes with advanced question types",
    "Real-time leaderboards and performance tracking",
    "Customizable privacy and notification settings",
    "Mobile-responsive design for learning on the go",
    "Detailed analytics and progress reports",
    "Community features and social learning",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/3 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Welcome to QuizMaster Pro
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              Create Amazing{" "}
              <span className="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Quizzes
              </span>{" "}
              <br />
              in Minutes
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Build engaging quizzes, challenge your friends, and track your progress with our intuitive quiz maker
              platform. Join thousands of learners and educators worldwide.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {user ? (
                <>
                  <Button size="lg" onClick={handleCreateQuiz} className="text-lg px-8 py-6 h-auto">
                    <Target className="mr-2 h-5 w-5" />
                    Create Your First Quiz
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleBrowseQuizzes}
                    className="text-lg px-8 py-6 h-auto bg-background/50 backdrop-blur-sm"
                  >
                    <BookOpen className="mr-2 h-5 w-5" />
                    Browse Quizzes
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" onClick={handleGetStarted} className="text-lg px-8 py-6 h-auto">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleBrowseQuizzes}
                    className="text-lg px-8 py-6 h-auto bg-background/50 backdrop-blur-sm"
                  >
                    <BookOpen className="mr-2 h-5 w-5" />
                    Explore Quizzes
                  </Button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
              {stats.map((stat, index) => (
                <Card
                  key={index}
                  className="text-center border-0 bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-all duration-300"
                >
                  <CardContent className="pt-6">
                    <stat.icon className={`h-8 w-8 mx-auto mb-2 ${stat.color}`} />
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div className="max-w-7xl mx-auto mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose QuizMaster Pro?</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Everything you need to create, share, and track engaging quizzes
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="group hover:shadow-xl transition-all duration-300 border-0 bg-background/50 backdrop-blur-sm hover:bg-background/70 hover:scale-105"
                >
                  <CardHeader className="text-center pb-4">
                    <div
                      className={`mx-auto mb-4 p-4 rounded-full ${feature.bgColor} group-hover:scale-110 transition-transform duration-300`}
                    >
                      <feature.icon className={`h-8 w-8 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Benefits Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="border-0 bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm">
              <CardContent className="pt-8 pb-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">Everything You Need</h3>
                  <p className="text-muted-foreground">
                    Powerful features designed for educators, students, and quiz enthusiasts
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          {!user && (
            <div className="text-center">
              <Card className="max-w-2xl mx-auto border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm">
                <CardContent className="pt-8 pb-8">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">Ready to Get Started?</h3>
                  <p className="text-muted-foreground mb-6 text-lg">
                    Join thousands of educators and learners who are already using QuizMaster Pro
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" onClick={handleGetStarted} className="px-8 py-6 h-auto">
                      <Sparkles className="mr-2 h-5 w-5" />
                      Sign Up Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleSignIn}
                      className="px-8 py-6 h-auto bg-background/50"
                    >
                      Sign In
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
