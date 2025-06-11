"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, AlertCircle, Clock, Zap } from "lucide-react"

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
    return (
      <Card className="mb-6 bg-red-900/30 border-red-700">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">Failed to preload collection: {error}</span>
            <Button
              onClick={onRefresh}
              size="sm"
              variant="outline"
              className="ml-auto bg-red-800/50 border-red-600 text-red-200 hover:bg-red-700/50"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
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
              <span className="text-purple-200">Preloading your collection...</span>
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
              <span className="text-green-200">Collection cached</span>
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
