"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, AlertCircle, Clock } from "lucide-react"

interface PreloadStatusProps {
  isPreloading: boolean
  isPreloaded: boolean
  progress: number
  error: string | null
  lastUpdated: number | null
  cacheAge: number | null
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
  const formatAge = (age: number | null) => {
    if (!age) return "Never"
    const minutes = Math.floor(age / (1000 * 60))
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`
    }
    return `${minutes}m ago`
  }

  const getStatusColor = () => {
    if (error) return "text-red-400"
    if (isPreloading) return "text-blue-400"
    if (isPreloaded) return "text-green-400"
    return "text-gray-400"
  }

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="w-4 h-4" />
    if (isPreloading) return <RefreshCw className="w-4 h-4 animate-spin" />
    if (isPreloaded) return <CheckCircle className="w-4 h-4" />
    return <Clock className="w-4 h-4" />
  }

  const getStatusText = () => {
    if (error) return `Error: ${error}`
    if (isPreloading) return `Preloading collection... ${progress}%`
    if (isPreloaded) return "Collection ready"
    return "Collection not loaded"
  }

  return (
    <Card className="bg-gray-800/50 border-gray-600">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={getStatusColor()}>{getStatusIcon()}</span>
            <span className={`text-sm ${getStatusColor()}`}>{getStatusText()}</span>
          </div>

          <div className="flex items-center gap-2">
            {cacheAge !== null && <span className="text-xs text-gray-400">Updated {formatAge(cacheAge)}</span>}
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isPreloading} className="h-8 w-8 p-0">
              <RefreshCw className={`w-3 h-3 ${isPreloading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {isPreloading && (
          <div className="mt-2">
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
