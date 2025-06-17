"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { cacheManager } from "@/lib/cache-manager"

interface Game {
  id: string
  name: string
  image: string
  thumbnail: string
  description: string
  yearPublished: string
  minPlayers: number
  maxPlayers: number
  playingTime: number
  rating: number
  rank: number
  mechanisms: string[]
  categories: string[]
  bggUrl: string
}

interface PreloadStatus {
  isPreloading: boolean
  isPreloaded: boolean
  progress: number
  error: string | null
  lastUpdated: Date | null
  cacheAge: number
}

export function useCollectionPreloader(username: string) {
  const [status, setStatus] = useState<PreloadStatus>({
    isPreloading: false,
    isPreloaded: false,
    progress: 0,
    error: null,
    lastUpdated: null,
    cacheAge: 0,
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastUsernameRef = useRef<string>("")
  const cacheCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Stable cache status check that only updates when cache actually changes
  const checkCacheStatus = useCallback(() => {
    if (!username) return

    const cached = cacheManager.get<Game[]>(`collection:${username}`)
    const rawAge = cacheManager.getCollectionAge(username)

    setStatus((prev) => {
      const newIsPreloaded = !!cached
      const newLastUpdated = rawAge ? new Date(Date.now() - rawAge) : null
      const newCacheAge = rawAge || 0

      // Only update if cache status actually changed
      if (
        prev.isPreloaded !== newIsPreloaded ||
        (prev.lastUpdated?.getTime() || 0) !== (newLastUpdated?.getTime() || 0)
      ) {
        return {
          ...prev,
          isPreloaded: newIsPreloaded,
          lastUpdated: newLastUpdated,
          cacheAge: newCacheAge,
          error: null,
        }
      }
      return prev
    })
  }, [username])

  // Update cache age periodically but only when needed
  useEffect(() => {
    if (!username || !status.isPreloaded) return

    // Update cache age every 10 seconds, but only if the component is still mounted
    const updateCacheAge = () => {
      const rawAge = cacheManager.getCollectionAge(username)
      if (rawAge !== null) {
        setStatus((prev) => ({
          ...prev,
          cacheAge: rawAge,
        }))
      }
    }

    cacheCheckIntervalRef.current = setInterval(updateCacheAge, 10000)

    return () => {
      if (cacheCheckIntervalRef.current) {
        clearInterval(cacheCheckIntervalRef.current)
      }
    }
  }, [username, status.isPreloaded])

  // Stable preload function
  const preloadCollection = useCallback(
    async (force = false) => {
      if (!username) return

      // Check if already cached and not stale
      if (!force && !cacheManager.isCollectionStale(username)) {
        checkCacheStatus()
        return
      }

      // Cancel any existing preload
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      setStatus((prev) => ({
        ...prev,
        isPreloading: true,
        progress: 0,
        error: null,
      }))

      try {
        // Step 1: Fetch collection list (20% progress)
        setStatus((prev) => ({ ...prev, progress: 20 }))

        const collectionResponse = await fetch(`/api/collection-preload?username=${encodeURIComponent(username)}`, {
          signal,
        })

        if (!collectionResponse.ok) {
          throw new Error("Failed to fetch collection")
        }

        const collectionData = await collectionResponse.json()

        if (signal.aborted) return

        // Step 2: Fetch detailed game information (80% progress)
        setStatus((prev) => ({ ...prev, progress: 50 }))

        const detailsResponse = await fetch("/api/game-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameIds: collectionData.gameIds }),
          signal,
        })

        if (!detailsResponse.ok) {
          throw new Error("Failed to fetch game details")
        }

        const games = await detailsResponse.json()

        if (signal.aborted) return

        // Step 3: Cache the results
        setStatus((prev) => ({ ...prev, progress: 90 }))

        cacheManager.set(`collection:${username}`, games, 60 * 60 * 1000) // 1 hour TTL

        const now = new Date()
        setStatus({
          isPreloading: false,
          isPreloaded: true,
          progress: 100,
          error: null,
          lastUpdated: now,
          cacheAge: 0,
        })
      } catch (error) {
        if (signal.aborted) return

        console.error("Preload failed:", error)
        setStatus((prev) => ({
          ...prev,
          isPreloading: false,
          error: error instanceof Error ? error.message : "Failed to preload collection",
          progress: 0,
        }))
      }
    },
    [username, checkCacheStatus],
  )

  // Only trigger when username actually changes
  useEffect(() => {
    if (username && username !== lastUsernameRef.current) {
      lastUsernameRef.current = username
      checkCacheStatus()

      // Debounce preloading
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current)
      }

      preloadTimeoutRef.current = setTimeout(() => {
        preloadCollection()
      }, 500)
    }

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current)
      }
    }
  }, [username, preloadCollection, checkCacheStatus])

  // Background refresh every 30 minutes
  useEffect(() => {
    if (!username) return

    const interval = setInterval(
      () => {
        if (cacheManager.isCollectionStale(username, 30 * 60 * 1000)) {
          preloadCollection()
        }
      },
      30 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [username, preloadCollection])

  // Get cached collection without triggering re-renders
  const getCachedCollection = useCallback((): Game[] | null => {
    if (!username) return null
    return cacheManager.get<Game[]>(`collection:${username}`)
  }, [username])

  // Force refresh
  const refreshCollection = useCallback(() => {
    preloadCollection(true)
  }, [preloadCollection])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current)
      }
      if (cacheCheckIntervalRef.current) {
        clearInterval(cacheCheckIntervalRef.current)
      }
    }
  }, [])

  const { isPreloading, isPreloaded, progress, error, lastUpdated, cacheAge } = status

  return {
    isPreloading,
    isPreloaded,
    progress,
    error,
    lastUpdated,
    cacheAge,
    getCachedCollection,
    refreshCollection,
  }
}
