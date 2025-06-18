"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Search, Users, Cog, Tag, Zap, Clock, Star, Dices } from "lucide-react"
import { GameCard } from "@/components/game-card"
import { MechanismCombobox } from "@/components/mechanism-combobox"
import { CategoryCombobox } from "@/components/category-combobox"
import { BestPlayerCountCombobox } from "@/components/best-player-count-combobox"
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
  bestPlayerCounts: number[]
  bggUrl: string
  weight?: number
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

const COMPLEXITY_RANGES = [
  { value: "1-2", label: "Light (1.0-2.0)" },
  { value: "2-3", label: "Medium Light (2.0-3.0)" },
  { value: "3-4", label: "Medium Heavy (3.0-4.0)" },
  { value: "4-5", label: "Heavy (4.0-5.0)" },
  { value: "any", label: "Any Complexity" },
]

const GAME_LENGTH_RANGES = [
  { value: "0-30", label: "Quick (≤30 min)" },
  { value: "30-60", label: "Short (30-60 min)" },
  { value: "60-120", label: "Medium (1-2 hours)" },
  { value: "120-180", label: "Long (2-3 hours)" },
  { value: "180-999", label: "Epic (3+ hours)" },
  { value: "any", label: "Any Length" },
]

export default function HomePage() {
  const [username, setUsername] = useState("")
  const [mechanism, setMechanism] = useState("")
  const [category, setCategory] = useState("")
  const [playerCount, setPlayerCount] = useState("")
  const [bestPlayerCount, setBestPlayerCount] = useState("")
  const [complexity, setComplexity] = useState("")
  const [gameLength, setGameLength] = useState("")
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
      if (bestPlayerCount && bestPlayerCount !== "any") params.append("bestPlayerCount", bestPlayerCount)
      if (complexity && complexity !== "any") params.append("complexity", complexity)
      if (gameLength && gameLength !== "any") params.append("gameLength", gameLength)

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

        if (bestPlayerCount && bestPlayerCount !== "any") {
          const count = Number.parseInt(bestPlayerCount)
          filteredGames = filteredGames.filter((game) => {
            if (!game.bestPlayerCounts || game.bestPlayerCounts.length === 0) return false
            // For 8+ players, check if the game's best player counts include 8 or higher
            if (count === 8) {
              return game.bestPlayerCounts.some((pc) => pc >= 8)
            }
            return game.bestPlayerCounts.includes(count)
          })
        }

        if (complexity && complexity !== "any") {
          const [min, max] = complexity.split("-").map(Number)
          filteredGames = filteredGames.filter((game) => {
            const weight = game.weight || 0
            return weight >= min && weight <= max
          })
        }

        if (gameLength && gameLength !== "any") {
          const [min, max] = gameLength.split("-").map(Number)
          filteredGames = filteredGames.filter((game) => {
            const playTime = game.playingTime || 0
            return playTime >= min && playTime <= max
          })
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
          filters: { mechanism, category, playerCount, bestPlayerCount, complexity, gameLength },
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

  return (
    <div className="min-h-screen bg-purple-950 text-white">
      {/* Header */}
      <header className="border-b border-purple-800 bg-gradient-to-r from-purple-900 to-purple-800 shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg transform rotate-12">
              <Dices className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-black text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text">
                Off the Shelf
              </h1>
              <p className="text-sm text-purple-200 font-medium tracking-wide">BOARD GAME PICKER</p>
            </div>
            <div className="flex items-center gap-1 text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 rounded-full font-bold shadow-lg">
              <Zap className="w-4 h-4" />
              INSTANT
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 text-center">
            <span className="block text-white mb-2">No more</span>
            <span className="block bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              decision fatigue
            </span>
            <span className="block text-purple-200 text-2xl md:text-3xl lg:text-4xl font-bold mt-4">
              we'll pick the game, you bring the snacks
            </span>
          </h2>
          <p className="text-lg md:text-xl text-purple-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Smart suggestions from your BoardGameGeek collection - tailored to your
            <span className="text-yellow-400 font-semibold"> mood</span>,
            <span className="text-orange-400 font-semibold"> group</span>,
            <span className="text-red-400 font-semibold"> time</span>,
            <span className="text-pink-400 font-semibold"> complexity</span>, and
            <span className="text-purple-300 font-semibold"> mechanics</span>.
            <span className="block text-base text-green-300 mt-3 font-medium">
              ⚡ Now with instant recommendations via smart caching
            </span>
          </p>

          {/* Search Form */}
          <Card className="bg-purple-900/30 border-purple-700 max-w-4xl mx-auto backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Search className="w-5 h-5" />
                Browse Your Collection
              </CardTitle>
              <CardDescription className="text-purple-200">Filter your owned games by preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white">
                    BGG Username (Required)
                  </Label>
                  <Input
                    id="username"
                    placeholder="Enter your BoardGameGeek username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-purple-800/50 border-purple-600 text-white placeholder:text-purple-300 focus:border-purple-400"
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Mechanism</Label>
                    <MechanismCombobox value={mechanism} onValueChange={setMechanism} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Category</Label>
                    <CategoryCombobox value={category} onValueChange={setCategory} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Players</Label>
                    <Select value={playerCount} onValueChange={setPlayerCount}>
                      <SelectTrigger className="bg-purple-800/50 border-purple-600 text-white">
                        <SelectValue placeholder="Player count" />
                      </SelectTrigger>
                      <SelectContent className="bg-purple-900 border-purple-700">
                        {PLAYER_COUNTS.map((count) => (
                          <SelectItem key={count.value} value={count.value} className="text-white focus:bg-purple-800">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {count.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Best At</Label>
                    <BestPlayerCountCombobox value={bestPlayerCount} onValueChange={setBestPlayerCount} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Complexity</Label>
                    <Select value={complexity} onValueChange={setComplexity}>
                      <SelectTrigger className="bg-purple-800/50 border-purple-600 text-white">
                        <SelectValue placeholder="Complexity" />
                      </SelectTrigger>
                      <SelectContent className="bg-purple-900 border-purple-700">
                        {COMPLEXITY_RANGES.map((range) => (
                          <SelectItem key={range.value} value={range.value} className="text-white focus:bg-purple-800">
                            <div className="flex items-center gap-2">
                              <Cog className="w-4 h-4" />
                              {range.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Game Length</Label>
                    <Select value={gameLength} onValueChange={setGameLength}>
                      <SelectTrigger className="bg-purple-800/50 border-purple-600 text-white">
                        <SelectValue placeholder="Game length" />
                      </SelectTrigger>
                      <SelectContent className="bg-purple-900 border-purple-700">
                        {GAME_LENGTH_RANGES.map((range) => (
                          <SelectItem key={range.value} value={range.value} className="text-white focus:bg-purple-800">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {range.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white font-bold text-lg py-4 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Finding Your Perfect Game...
                    </>
                  ) : (
                    <>
                      <Dices className="w-5 h-5 mr-2" />
                      Pick My Game!
                      {isPreloaded && <Zap className="w-4 h-4 ml-2" />}
                    </>
                  )}
                </Button>
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
            <Card className="bg-purple-800/30 border-purple-600">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-purple-200 text-sm">
                    Debug: Found {debugInfo.totalInCollection} games in collection, showing {debugInfo.afterFiltering}{" "}
                    games
                    {debugInfo.cached && <span className="ml-2 text-green-300">⚡ CACHED</span>}
                  </p>
                  <p className="text-purple-200 text-xs">Response time: {debugInfo.responseTime}</p>
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
              <h3 className="text-3xl font-bold mb-2 text-white">Games from Your Collection</h3>
              <p className="text-purple-200">Found {games.length} games in your collection matching your preferences</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {mechanism && (
                  <div className="flex items-center gap-1 text-purple-300 text-sm">
                    <Cog className="w-3 h-3" />
                    <span className="text-purple-200">{mechanism}</span>
                  </div>
                )}
                {category && (
                  <div className="flex items-center gap-1 text-purple-300 text-sm">
                    <Tag className="w-3 h-3" />
                    <span className="text-purple-200">{category}</span>
                  </div>
                )}
                {playerCount && playerCount !== "any" && (
                  <div className="flex items-center gap-1 text-purple-300 text-sm">
                    <Users className="w-3 h-3" />
                    <span className="text-purple-200">{playerCount} players</span>
                  </div>
                )}
                {bestPlayerCount && bestPlayerCount !== "any" && (
                  <div className="flex items-center gap-1 text-purple-300 text-sm">
                    <Star className="w-3 h-3 text-yellow-400" />
                    <span className="text-purple-200">
                      Best at {bestPlayerCount === "8" ? "8+" : bestPlayerCount} players
                    </span>
                  </div>
                )}
                {complexity && complexity !== "any" && (
                  <div className="flex items-center gap-1 text-purple-300 text-sm">
                    <Cog className="w-3 h-3" />
                    <span className="text-purple-200">
                      {COMPLEXITY_RANGES.find((r) => r.value === complexity)?.label || complexity}
                    </span>
                  </div>
                )}
                {gameLength && gameLength !== "any" && (
                  <div className="flex items-center gap-1 text-purple-300 text-sm">
                    <Clock className="w-3 h-3" />
                    <span className="text-purple-200">
                      {GAME_LENGTH_RANGES.find((r) => r.value === gameLength)?.label || gameLength}
                    </span>
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
      <footer className="border-t border-purple-800 py-8 px-4 bg-purple-900/30">
        <div className="container mx-auto text-center text-purple-300">
          <p>Powered by BoardGameGeek API • Built with Next.js • ⚡ Enhanced with Smart Caching</p>
        </div>
      </footer>
    </div>
  )
}
