"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Search, Users, Cog, Bug, Tag, Zap } from "lucide-react"
import { GameCard } from "@/components/game-card"
import { MechanismCombobox } from "@/components/mechanism-combobox"
import { CategoryCombobox } from "@/components/category-combobox"
import { PreloadStatus } from "@/components/preload-status"
import { useCollectionPreloader } from "@/hooks/use-collection-preloader"

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

const PLAYER_COUNTS = [
  { value: "1", label: "1 Player" },
  { value: "2", label: "2 Players" },
  { value: "3", label: "3 Players" },
  { value: "4", label: "4 Players" },
  { value: "5", label: "5 Players" },
  { value: "6", label: "6+ Players" },
  { value: "any", label: "Any Player Count" },
]

export default function HomePage() {
  const [username, setUsername] = useState("")
  const [mechanism, setMechanism] = useState("")
  const [category, setCategory] = useState("")
  const [playerCount, setPlayerCount] = useState("")
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Use the preloader hook
  const {
    isPreloading,
    isPreloaded,
    progress,
    error: preloadError,
    lastUpdated,
    cacheAge,
    getCachedCollection,
    refreshCollection,
  } = useCollectionPreloader(username)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      setError("Please enter your BGG username")
      return
    }

    setLoading(true)
    setError("")
    setGames([])
    setDebugInfo(null)

    try {
      const params = new URLSearchParams()
      if (username) params.append("username", username)
      if (mechanism) params.append("mechanism", mechanism)
      if (category) params.append("category", category)
      if (playerCount && playerCount !== "any") params.append("playerCount", playerCount)

      // Try to use cached data first
      const cachedGames = getCachedCollection()
      if (cachedGames && cachedGames.length > 0) {
        console.log("Using cached collection data")

        // Apply filters locally for instant results
        let filteredGames = cachedGames

        if (mechanism) {
          filteredGames = filteredGames.filter((game) =>
            game.mechanisms.some((mech) => mech.toLowerCase().includes(mechanism.toLowerCase())),
          )
        }

        if (category) {
          filteredGames = filteredGames.filter((game) =>
            game.categories.some((cat) => cat.toLowerCase().includes(category.toLowerCase())),
          )
        }

        if (playerCount && playerCount !== "any") {
          const count = Number.parseInt(playerCount)
          filteredGames = filteredGames.filter((game) => game.minPlayers <= count && game.maxPlayers >= count)
        }

        // Sort by rating and limit results
        filteredGames = filteredGames
          .filter((game) => game.rating > 0)
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 24)

        setGames(filteredGames)
        setDebugInfo({
          totalInCollection: cachedGames.length,
          afterFiltering: filteredGames.length,
          filters: { mechanism, category, playerCount },
          cached: true,
          responseTime: "< 1ms (cached)",
        })
        setLoading(false)
        return
      }

      // Fall back to API if no cache
      console.log("No cached data, using API")
      const startTime = Date.now()
      const response = await fetch(`/api/recommendations?${params}`)
      const data = await response.json()
      const responseTime = Date.now() - startTime

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch recommendations")
      }

      setGames(data.games || [])
      setDebugInfo({
        ...data.debug,
        responseTime: `${responseTime}ms`,
      })
    } catch (err) {
      console.error("Request failed:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleTestCollection = async () => {
    if (!username.trim()) {
      setError("Please enter your BGG username to test")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/test-collection?username=${encodeURIComponent(username)}`)
      const data = await response.json()

      console.log("Test results:", data)

      const successfulResult = data.results?.find((r: any) => r.status === 200 && r.responseLength > 100)

      if (successfulResult) {
        setError(`✅ Collection found! ${successfulResult.responseLength} characters returned from BGG.`)
      } else {
        setError(
          `❌ Could not fetch collection. Check console for details. Results: ${JSON.stringify(
            data.results?.map((r: any) => ({ endpoint: r.endpoint, status: r.status, error: r.error })),
            null,
            2,
          )}`,
        )
      }
    } catch (err) {
      setError(`Test failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
              <Cog className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-2xl font-bold">BGG Recommender</h1>
            <div className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded">
              <Zap className="w-3 h-3" />
              FAST
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
            Find Games to Play from Your Collection
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Discover games from your BoardGameGeek collection that match your current mood and player count.
            <span className="block text-sm text-blue-400 mt-2">
              ⚡ Now with instant recommendations via smart caching
            </span>
          </p>

          {/* Search Form */}
          <Card className="bg-gray-800 border-gray-600 max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Browse Your Collection
              </CardTitle>
              <CardDescription>Filter your owned games by preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username">BGG Username (Required)</Label>
                  <Input
                    id="username"
                    placeholder="Enter your BoardGameGeek username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-gray-700 border-gray-500 text-gray-100 placeholder:text-gray-400"
                    required
                  />
                </div>

                {/* Preload Status */}
                {username && (
                  <PreloadStatus
                    isPreloading={isPreloading}
                    isPreloaded={isPreloaded}
                    progress={progress}
                    error={preloadError}
                    lastUpdated={lastUpdated}
                    cacheAge={cacheAge}
                    onRefresh={refreshCollection}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Preferred Mechanism</Label>
                    <MechanismCombobox value={mechanism} onValueChange={setMechanism} />
                  </div>

                  <div className="space-y-2">
                    <Label>Category/Theme</Label>
                    <CategoryCombobox value={category} onValueChange={setCategory} />
                  </div>

                  <div className="space-y-2">
                    <Label>Player Count</Label>
                    <Select value={playerCount} onValueChange={setPlayerCount}>
                      <SelectTrigger className="bg-gray-700 border-gray-500 text-gray-100">
                        <SelectValue placeholder="Select player count" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAYER_COUNTS.map((count) => (
                          <SelectItem key={count.value} value={count.value}>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {count.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-white text-black hover:bg-gray-200" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Finding Games...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Get Recommendations
                        {isPreloaded && <Zap className="w-3 h-3 ml-1" />}
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestCollection}
                    disabled={loading}
                    className="bg-gray-700 border-gray-500 text-gray-100 hover:bg-gray-600"
                  >
                    <Bug className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Error Display */}
      {error && (
        <section className="px-4 pb-8">
          <div className="container mx-auto max-w-4xl">
            <Card className="bg-red-900/30 border-red-700">
              <CardContent className="pt-6">
                <p className="text-red-200 whitespace-pre-wrap">{error}</p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Debug Info */}
      {debugInfo && (
        <section className="px-4 pb-8">
          <div className="container mx-auto max-w-4xl">
            <Card className="bg-blue-900/30 border-blue-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-blue-200 text-sm">
                    Debug: Found {debugInfo.totalInCollection} games in collection, showing {debugInfo.afterFiltering}{" "}
                    games
                    {debugInfo.cached && <span className="ml-2 text-green-300">⚡ CACHED</span>}
                  </p>
                  <p className="text-blue-200 text-xs">Response time: {debugInfo.responseTime}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Results */}
      {games.length > 0 && (
        <section className="px-4 pb-20">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8">
              <h3 className="text-3xl font-bold mb-2 text-gray-100">Games from Your Collection</h3>
              <p className="text-gray-300">Found {games.length} games in your collection matching your preferences</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {mechanism && (
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <Cog className="w-3 h-3" />
                    <span className="text-gray-300">{mechanism}</span>
                  </div>
                )}
                {category && (
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <Tag className="w-3 h-3" />
                    <span className="text-gray-300">{category}</span>
                  </div>
                )}
                {playerCount && playerCount !== "any" && (
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <Users className="w-3 h-3" />
                    <span className="text-gray-300">{playerCount} players</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-4">
        <div className="container mx-auto text-center text-gray-400">
          <p>Powered by BoardGameGeek API • Built with Next.js • ⚡ Enhanced with Smart Caching</p>
        </div>
      </footer>
    </div>
  )
}
