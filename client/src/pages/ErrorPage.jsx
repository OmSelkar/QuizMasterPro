"use client"

import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Home, ArrowLeft, RefreshCw, AlertTriangle, Bug } from "lucide-react"

export default function ErrorPage({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  statusCode = "Error",
  showDetails = false,
  error = null,
}) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Main Error Card */}
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 p-4 bg-destructive/10 rounded-full w-fit">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <div className="space-y-2">
              <Badge variant="destructive" className="text-lg px-4 py-1">
                {statusCode}
              </Badge>
              <CardTitle className="text-3xl">{title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-lg text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">
                Current path: <code className="bg-muted px-2 py-1 rounded text-xs">{location.pathname}</code>
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
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

        {/* Error Details */}
        {showDetails && error && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bug className="h-4 w-4" />
                Technical Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Show Error Information
                  <span className="ml-2 group-open:rotate-180 transition-transform inline-block">▼</span>
                </summary>
                <div className="mt-4 space-y-2">
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-32 text-destructive">
                    {error.toString()}
                  </pre>
                  <div className="text-xs text-muted-foreground">
                    <p>
                      <strong>Timestamp:</strong> {new Date().toISOString()}
                    </p>
                    <p>
                      <strong>User Agent:</strong> {navigator.userAgent}
                    </p>
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              If this problem persists, please contact our support team with the details above.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
