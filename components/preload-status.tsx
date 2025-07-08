"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, AlertCircle, Clock, Zap, Filter, ExternalLink, User } from "lucide-react"

interface PreloadStatusProps {
  isPreloading: boolean
  isPreloaded: boolean
  progress: number
  error: string | null
  lastUpdated: Date | null
  cacheAge: number
  onRefresh: () => void
}

export function PreloadStatus({
  isPreloading,
  isPreloaded,
  progress,
  error,
  lastUpdated,
  cacheAge,
  onRefresh,
}: PreloadStatusProps) {
  const formatCacheAge = (ageInMs: number) => {
    const ageInSeconds = Math.floor(ageInMs / 1000)
    if (ageInSeconds < 60) return `${ageInSeconds}s ago`
    if (ageInSeconds < 3600) return `${Math.floor(ageInSeconds / 60)}m ago`
    return `${Math.floor(ageInSeconds / 3600)}h ago`
  }

  if (error) {
    // Check if it's a user-friendly error (username/privacy issues)
    const isUserError =
      error.includes("username") || error.includes("private") || error.includes("collection") || error.includes("owned")

    return (
      <Card className="mb-6 bg-red-900/30 border-red-700">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-200 font-medium mb-2">Unable to load your collection</p>
                <p className="text-red-100 text-sm leading-relaxed">{error}</p>

                {/* Add helpful tips for common issues */}
                {isUserError && (
                  <div className="mt-4 p-3 bg-red-800/30 rounded-lg border border-red-600/50">
                    <p className="text-red-100 text-sm font-medium mb-2">💡 Quick fixes:</p>
                    <ul className="text-red-100 text-sm space-y-1 list-disc list-inside">
                      <li>Double-check your BGG username spelling</li>
                      <li>Make sure your collection is set to public in your BGG account settings</li>
                      <li>Verify you have games marked as "owned" in your collection</li>
                    </ul>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="bg-red-700/50 border-red-500 text-red-100 hover:bg-red-600/50 text-xs"
                      >
                        <a
                          href="https://boardgamegeek.com/collection/user"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          <User className="w-3 h-3" />
                          Check BGG Settings
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={onRefresh}
                size="sm"
                variant="outline"
                className="bg-red-800/50 border-red-600 text-red-200 hover:bg-red-700/50"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isPreloading) {
    return (
      <Card className="mb-6 bg-purple-800/30 border-purple-600">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-300 animate-spin" />
              <span className="text-purple-200">Loading your collection...</span>
              <div className="flex items-center gap-1 text-xs text-purple-300">
                <Filter className="w-3 h-3" />
                <span>Filtering out expansions</span>
              </div>
            </div>
            <Progress value={progress} className="w-full bg-purple-900/50" />
            <p className="text-sm text-purple-300">{Math.round(progress)}% complete</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isPreloaded) {
    return (
      <Card className="mb-6 bg-green-900/30 border-green-700">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-200">Collection loaded</span>
              <div className="flex items-center gap-1 text-xs text-green-300">
                <Filter className="w-3 h-3" />
                <span>Base games only</span>
              </div>
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-purple-200 text-sm">
                <Clock className="w-3 h-3 inline mr-1" />
                {formatCacheAge(cacheAge)}
              </span>
            </div>
            <Button
              onClick={onRefresh}
              size="sm"
              variant="outline"
              className="bg-green-800/50 border-green-600 text-green-200 hover:bg-green-700/50"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
