import { type NextRequest, NextResponse } from "next/server"

interface BGGGame {
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
  weight: number
  mechanisms: string[]
  categories: string[]
  bggUrl: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")
  const mechanism = searchParams.get("mechanism")
  const category = searchParams.get("category")
  const playerCount = searchParams.get("playerCount")
  const useCache = searchParams.get("useCache") !== "false"
  const complexity = searchParams.get("complexity")
  const gameLength = searchParams.get("gameLength")

  console.log("=== Fast Recommendations Request ===")
  console.log("Params:", { username, mechanism, category, playerCount, useCache, complexity, gameLength })

  if (!username) {
    return NextResponse.json({ error: "BGG username is required" }, { status: 400 })
  }

  try {
    let games: BGGGame[] = []

    if (useCache) {
      // Try to get from preloaded cache first
      const cacheResponse = await fetch(
        `${request.nextUrl.origin}/api/cache-lookup?username=${encodeURIComponent(username)}`,
      )

      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json()
        games = cacheData.games || []
        console.log(`Using cached data: ${games.length} games`)
      }
    }

    // If no cached data, fall back to regular API
    if (games.length === 0) {
      console.log("No cached data, falling back to regular fetch")
      const fallbackResponse = await fetch(
        `${request.nextUrl.origin}/api/recommendations-fallback?${searchParams.toString()}`,
      )

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        games = fallbackData.games || []
      } else {
        throw new Error("Failed to fetch recommendations")
      }
    }

    // Apply filters to cached/fetched games
    let filteredGames = games

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

    return NextResponse.json({
      games: filteredGames,
      cached: useCache && games.length > 0,
      debug: {
        totalInCollection: games.length,
        afterFiltering: filteredGames.length,
        filters: { mechanism, category, playerCount, complexity, gameLength },
        cached: useCache && games.length > 0,
      },
    })
  } catch (error) {
    console.error("=== Fast Recommendations Error ===", error)
    return NextResponse.json(
      {
        error: "Failed to fetch recommendations",
        debug: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
