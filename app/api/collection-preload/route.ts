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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  try {
    // Only fetch base games, not expansions
    const collectionEndpoints = [
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1&subtype=boardgame&excludesubtype=boardgameexpansion`,
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1&subtype=boardgame`,
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&subtype=boardgame`,
    ]

    let collectionData = null

    for (const endpoint of collectionEndpoints) {
      try {
        const response = await fetchWithRetry(endpoint, 2)
        const text = await response.text()

        if (text && text.trim() && !text.includes("Invalid username")) {
          collectionData = parser.parse(text)
          break
        }
      } catch (error) {
        continue
      }
    }

    if (!collectionData) {
      return NextResponse.json({ error: "Could not fetch collection" }, { status: 404 })
    }

    let items = []
    if (collectionData.items && collectionData.items.item) {
      items = Array.isArray(collectionData.items.item) ? collectionData.items.item : [collectionData.items.item]
    }

    // Filter out expansions at the collection level
    const baseGameItems = items.filter((item: any) => {
      // Check if subtype is boardgameexpansion
      if (item["@_subtype"] === "boardgameexpansion") {
        return false
      }

      // Additional check for expansion indicators in the name
      const rawName = item.name?.["#text"] || item.name || ""
      const name = typeof rawName === "string" ? rawName : String(rawName || "")

      const expansionKeywords = [
        "expansion",
        "extend",
        "extension",
        "add-on",
        "addon",
        "supplement",
        "booster",
        "promo",
        "mini expansion",
      ]

      const nameContainsExpansion = expansionKeywords.some((keyword) =>
        name.toLowerCase().includes(keyword.toLowerCase()),
      )

      return !nameContainsExpansion
    })

    const gameIds = baseGameItems.map((item: any) => item["@_objectid"]).filter(Boolean)

    console.log(
      `Filtered collection: ${items.length} total items, ${gameIds.length} base games (filtered out ${items.length - gameIds.length} expansions)`,
    )

    return NextResponse.json({
      gameIds,
      totalGames: gameIds.length,
      totalItems: items.length,
      filteredExpansions: items.length - gameIds.length,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Collection preload error:", error)
    return NextResponse.json({ error: "Failed to preload collection" }, { status: 500 })
  }
}
