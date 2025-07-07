"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react"

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-destructive/10 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">Something went wrong</CardTitle>
              <p className="text-muted-foreground">
                The application encountered an unexpected error. Our team has been notified.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => window.location.reload()} className="flex-1 sm:flex-none">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button onClick={() => (window.location.href = "/")} variant="outline" className="flex-1 sm:flex-none">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Error Details */}
              <details className="group">
                <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <Bug className="h-4 w-4" />
                  Technical Details
                  <span className="ml-auto group-open:rotate-180 transition-transform">▼</span>
                </summary>

                <div className="mt-4 space-y-4">
                  <div>
                    <Badge variant="destructive" className="mb-2">
                      Error Message
                    </Badge>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-32 text-destructive">
                      {this.state.error?.toString() || "Unknown error"}
                    </pre>
                  </div>

                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Component Stack
                      </Badge>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-32 text-muted-foreground">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    <p>
                      <strong>Timestamp:</strong> {new Date().toISOString()}
                    </p>
                    <p>
                      <strong>User Agent:</strong> {navigator.userAgent}
                    </p>
                    <p>
                      <strong>URL:</strong> {window.location.href}
                    </p>
                  </div>
                </div>
              </details>

              {/* Help Text */}
              <div className="text-center text-sm text-muted-foreground">
                <p>If this problem persists, please contact our support team.</p>
                <p className="mt-1">Include the technical details above when reporting this issue.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
