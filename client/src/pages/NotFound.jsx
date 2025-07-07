"use client"

import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Home, ArrowLeft, Search, FileQuestion, AlertTriangle } from "lucide-react"

export default function NotFound() {
  const navigate = useNavigate()
  const location = useLocation()

  const suggestions = [
    {
      title: "Browse Quizzes",
      description: "Discover quizzes created by the community",
      action: () => navigate("/quiz-list"),
      icon: Search,
    },
    {
      title: "My Quizzes",
      description: "View and manage your created quizzes",
      action: () => navigate("/my-quizzes"),
      icon: FileQuestion,
    },
    {
      title: "Create Quiz",
      description: "Start building a new quiz",
      action: () => navigate("/create-quiz"),
      icon: FileQuestion,
    },
  ]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Main Error Card */}
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 p-4 bg-muted rounded-full w-fit">
              <AlertTriangle className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Badge variant="destructive" className="text-lg px-4 py-1">
                404
              </Badge>
              <CardTitle className="text-3xl">Page Not Found</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-lg text-muted-foreground">Oops! The page you're looking for doesn't exist.</p>
              <p className="text-sm text-muted-foreground">
                The URL <code className="bg-muted px-2 py-1 rounded text-xs">{location.pathname}</code> could not be
                found on our server.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => navigate("/")}>
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">What would you like to do instead?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={suggestion.action}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                >
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <suggestion.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium group-hover:text-primary transition-colors">{suggestion.title}</h3>
                    <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please check the URL or contact our support team.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
