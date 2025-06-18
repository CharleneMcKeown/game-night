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

            const rank = item.statistics?.ratings?.ranks?.rank
              ? Array.isArray(item.statistics.ratings.ranks.rank)
                ? item.statistics.ratings.ranks.rank.find((r: any) => r["@_name"] === "boardgame")?.["@_value"]
                : item.statistics.ratings.ranks.rank["@_value"]
              : null

            const weight = item.statistics?.ratings?.averageweight?.["@_value"]
              ? Number.parseFloat(item.statistics.ratings.averageweight["@_value"])
              : 0

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
              rank: rank && rank !== "Not Ranked" ? Number.parseInt(rank) : 0,
              weight,
              mechanisms,
              categories,
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
