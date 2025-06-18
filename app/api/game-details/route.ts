import { type NextRequest, NextResponse } from "next/server"
import { XMLParser } from "fast-xml-parser"

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
})

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "BGG-Recommender/1.0",
        },
      })

      if (response.status === 202) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        continue
      }

      if (response.status === 200) {
        return response
      }

      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  throw new Error("Max retries exceeded")
}

function isExpansion(item: any): boolean {
  // Check if it's marked as an expansion by type
  if (item["@_type"] === "boardgameexpansion") {
    return true
  }

  // Check categories for expansion indicators
  const categories: string[] = []
  if (item.link) {
    const links = Array.isArray(item.link) ? item.link : [item.link]
    links.forEach((link: any) => {
      if (link["@_type"] === "boardgamecategory") {
        categories.push(link["@_value"])
      }
    })
  }

  // Check for expansion-related categories
  const expansionCategories = ["Expansion for Base-game", "Game System", "Collectible Components"]

  const hasExpansionCategory = categories.some((category) =>
    expansionCategories.some((expCat) => category.toLowerCase().includes(expCat.toLowerCase())),
  )

  if (hasExpansionCategory) {
    return true
  }

  // Check name for expansion keywords
  const name = Array.isArray(item.name)
    ? item.name.find((n: any) => n["@_type"] === "primary")?.["@_value"] || item.name[0]["@_value"]
    : item.name?.["@_value"] || ""

  const expansionKeywords = [
    ": expansion",
    ": extend",
    ": extension",
    "add-on",
    "addon",
    "mini expansion",
    "promo pack",
    "booster",
    "supplement",
  ]

  const nameIndicatesExpansion = expansionKeywords.some((keyword) => name.toLowerCase().includes(keyword.toLowerCase()))

  return nameIndicatesExpansion
}

function parseBestPlayerCounts(item: any): number[] {
  const bestPlayerCounts: number[] = []

  if (!item.poll) return bestPlayerCounts

  const polls = Array.isArray(item.poll) ? item.poll : [item.poll]
  const playerCountPoll = polls.find((poll: any) => poll["@_name"] === "suggested_numplayers")

  if (!playerCountPoll || !playerCountPoll.results) return bestPlayerCounts

  const results = Array.isArray(playerCountPoll.results) ? playerCountPoll.results : [playerCountPoll.results]

  results.forEach((result: any) => {
    const numPlayers = result["@_numplayers"]
    if (!numPlayers || numPlayers === "More than 10") return

    // Handle "8+" case
    if (numPlayers.includes("+")) {
      const baseNum = Number.parseInt(numPlayers.replace("+", ""))
      if (!isNaN(baseNum)) {
        // For 8+, we'll treat it as 8 for filtering purposes
        if (baseNum >= 8) {
          const playerCount = 8
          if (isBestPlayerCount(result)) {
            bestPlayerCounts.push(playerCount)
          }
        }
      }
      return
    }

    const playerCount = Number.parseInt(numPlayers)
    if (isNaN(playerCount)) return

    if (isBestPlayerCount(result)) {
      bestPlayerCounts.push(playerCount)
    }
  })

  return [...new Set(bestPlayerCounts)].sort((a, b) => a - b)
}

function isBestPlayerCount(result: any): boolean {
  if (!result.result) return false

  const resultItems = Array.isArray(result.result) ? result.result : [result.result]

  let bestVotes = 0
  let recommendedVotes = 0
  let notRecommendedVotes = 0

  resultItems.forEach((item: any) => {
    const value = item["@_value"]
    const numVotes = Number.parseInt(item["@_numvotes"] || "0")

    if (value === "Best") bestVotes = numVotes
    else if (value === "Recommended") recommendedVotes = numVotes
    else if (value === "Not Recommended") notRecommendedVotes = numVotes
  })

  // Consider it "best" if:
  // 1. Best votes are the highest, OR
  // 2. Best + Recommended votes significantly outweigh Not Recommended (at least 2:1 ratio)
  const totalPositive = bestVotes + recommendedVotes
  const totalVotes = totalPositive + notRecommendedVotes

  if (totalVotes < 5) return false // Need at least 5 votes to be meaningful

  return bestVotes >= recommendedVotes && bestVotes >= notRecommendedVotes && totalPositive >= notRecommendedVotes * 1.5
}

function parseRank(item: any): number {
  if (!item.statistics?.ratings?.ranks?.rank) {
    console.log(`No rank data for game ${item["@_id"]}`)
    return 0
  }

  const ranks = item.statistics.ratings.ranks.rank

  // Debug logging for specific games
  if (item["@_id"] === "419704" || item["@_id"] === "317985") {
    console.log(`Rank debug for game ${item["@_id"]}:`, JSON.stringify(ranks, null, 2))
  }

  // Handle both single rank and array of ranks
  if (Array.isArray(ranks)) {
    // Look for the overall boardgame rank with multiple strategies
    let boardgameRank = null

    // Strategy 1: Look for name="boardgame"
    boardgameRank = ranks.find((rank: any) => rank["@_name"] === "boardgame")

    // Strategy 2: Look for type="subtype" and name="boardgame"
    if (!boardgameRank) {
      boardgameRank = ranks.find((rank: any) => rank["@_type"] === "subtype" && rank["@_name"] === "boardgame")
    }

    // Strategy 3: Look for id="1" (BGG's boardgame subtype ID)
    if (!boardgameRank) {
      boardgameRank = ranks.find((rank: any) => rank["@_id"] === "1")
    }

    // Strategy 4: Look for the first rank that's not a family rank
    if (!boardgameRank) {
      boardgameRank = ranks.find(
        (rank: any) => rank["@_type"] === "subtype" && rank["@_value"] && rank["@_value"] !== "Not Ranked",
      )
    }

    // Strategy 5: Fallback to any valid rank
    if (!boardgameRank) {
      boardgameRank = ranks.find((rank: any) => rank["@_value"] && rank["@_value"] !== "Not Ranked")
    }

    if (boardgameRank && boardgameRank["@_value"] && boardgameRank["@_value"] !== "Not Ranked") {
      const rankValue = Number.parseInt(boardgameRank["@_value"])
      if (!isNaN(rankValue)) {
        console.log(`Found rank ${rankValue} for game ${item["@_id"]} using strategy`)
        return rankValue
      }
    }
  } else {
    // Single rank object
    if (ranks["@_value"] && ranks["@_value"] !== "Not Ranked") {
      const rankValue = Number.parseInt(ranks["@_value"])
      if (!isNaN(rankValue)) {
        console.log(`Found single rank ${rankValue} for game ${item["@_id"]}`)
        return rankValue
      }
    }
  }

  console.log(`No valid rank found for game ${item["@_id"]}`)
  return 0
}

export async function POST(request: NextRequest) {
  try {
    const { gameIds } = await request.json()

    if (!gameIds || !Array.isArray(gameIds) || gameIds.length === 0) {
      return NextResponse.json({ error: "Game IDs are required" }, { status: 400 })
    }

    const batchSize = 20
    const allGames: any[] = []
    let filteredExpansions = 0

    for (let i = 0; i < gameIds.length; i += batchSize) {
      const batch = gameIds.slice(i, i + batchSize)
      const detailsUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${batch.join(",")}&stats=1`

      try {
        const response = await fetchWithRetry(detailsUrl)
        const text = await response.text()

        if (!text || text.trim() === "") continue

        const data = parser.parse(text)
        if (!data.items || !data.items.item) continue

        const items = Array.isArray(data.items.item) ? data.items.item : [data.items.item]

        const batchGames = items
          .filter((item: any) => {
            // Filter out expansions at the detail level as well
            if (isExpansion(item)) {
              filteredExpansions++
              return false
            }
            return true
          })
          .map((item: any) => {
            const name = Array.isArray(item.name)
              ? item.name.find((n: any) => n["@_type"] === "primary")?.["@_value"] || item.name[0]["@_value"]
              : item.name?.["@_value"] || "Unknown"

            const mechanisms: string[] = []
            const categories: string[] = []
            if (item.link) {
              const links = Array.isArray(item.link) ? item.link : [item.link]
              links.forEach((link: any) => {
                if (link["@_type"] === "boardgamemechanic") {
                  mechanisms.push(link["@_value"])
                } else if (link["@_type"] === "boardgamecategory") {
                  categories.push(link["@_value"])
                }
              })
            }

            const rating = item.statistics?.ratings?.average?.["@_value"]
              ? Number.parseFloat(item.statistics.ratings.average["@_value"])
              : 0

            // Use the improved rank parsing function
            const rank = parseRank(item)

            const weight = item.statistics?.ratings?.averageweight?.["@_value"]
              ? Number.parseFloat(item.statistics.ratings.averageweight["@_value"])
              : 0

            // Parse best player counts from community poll
            const bestPlayerCounts = parseBestPlayerCounts(item)

            // Debug logging for rank parsing
            if (item["@_id"] === "419704" || item["@_id"] === "317985") {
              console.log(`Detailed rank debug for game ${item["@_id"]} (${name}):`, {
                id: item["@_id"],
                name,
                rawRanks: item.statistics?.ratings?.ranks?.rank,
                parsedRank: rank,
              })
            }

            return {
              id: item["@_id"],
              name,
              image: item.image || "",
              thumbnail: item.thumbnail || "",
              description: item.description || "",
              yearPublished: item.yearpublished?.["@_value"] || "",
              minPlayers: Number.parseInt(item.minplayers?.["@_value"] || "1"),
              maxPlayers: Number.parseInt(item.maxplayers?.["@_value"] || "1"),
              playingTime: Number.parseInt(item.playingtime?.["@_value"] || "0"),
              rating,
              rank,
              weight,
              mechanisms,
              categories,
              bestPlayerCounts, // Add the parsed best player counts
              bggUrl: `https://boardgamegeek.com/boardgame/${item["@_id"]}`,
            }
          })

        allGames.push(...batchGames)

        // Rate limiting between batches
        if (i + batchSize < gameIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      } catch (error) {
        console.error(`Error fetching batch ${i / batchSize + 1}:`, error)
        continue
      }
    }

    console.log(`Game details processed: ${allGames.length} base games, filtered out ${filteredExpansions} expansions`)

    return NextResponse.json(allGames)
  } catch (error) {
    console.error("Game details error:", error)
    return NextResponse.json({ error: "Failed to fetch game details" }, { status: 500 })
  }
}
