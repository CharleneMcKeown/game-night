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

  console.log(`=== Collection Preload Debug for: ${username} ===`)

  try {
    // Only fetch base games, not expansions
    const collectionEndpoints = [
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1&subtype=boardgame&excludesubtype=boardgameexpansion`,
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1&subtype=boardgame`,
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&subtype=boardgame`,
    ]

    let collectionData = null
    let lastError = null
    let lastResponse = null

    for (const endpoint of collectionEndpoints) {
      console.log(`Trying endpoint: ${endpoint}`)
      try {
        const response = await fetchWithRetry(endpoint, 2)
        const text = await response.text()

        console.log(`Response status: ${response.status}`)
        console.log(`Response length: ${text.length}`)
        console.log(`First 200 chars: ${text.substring(0, 200)}`)

        lastResponse = { status: response.status, text: text.substring(0, 500) }

        // Check for common BGG error messages
        if (text.includes("Invalid username")) {
          lastError = "Invalid username - user does not exist on BGG"
          continue
        }

        if (text.includes("User has not marked any items as owned")) {
          lastError = "User has no owned games in their collection"
          continue
        }

        if (text.includes("User's collection is private")) {
          lastError = "User's collection is set to private"
          continue
        }

        if (text && text.trim() && text.includes("<items")) {
          try {
            collectionData = parser.parse(text)
            console.log(`Successfully parsed collection data`)
            break
          } catch (parseError) {
            console.log(`Parse error: ${parseError}`)
            lastError = `Failed to parse XML: ${parseError}`
            continue
          }
        } else {
          lastError = "Empty or invalid response from BGG"
        }
      } catch (error) {
        console.log(`Endpoint error: ${error}`)
        lastError = error instanceof Error ? error.message : "Unknown error"
        continue
      }
    }

    if (!collectionData) {
      console.log(`=== Final Error for ${username}: ${lastError} ===`)
      return NextResponse.json(
        {
          error: lastError || "Could not fetch collection",
          debug: {
            username,
            lastResponse,
            testedEndpoints: collectionEndpoints.length,
          },
        },
        { status: 404 },
      )
    }

    let items = []
    if (collectionData.items && collectionData.items.item) {
      items = Array.isArray(collectionData.items.item) ? collectionData.items.item : [collectionData.items.item]
    }

    console.log(`Found ${items.length} total items in collection`)

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
      `=== Success for ${username}: ${items.length} total items, ${gameIds.length} base games (filtered out ${items.length - gameIds.length} expansions) ===`,
    )

    return NextResponse.json({
      gameIds,
      totalGames: gameIds.length,
      totalItems: items.length,
      filteredExpansions: items.length - gameIds.length,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error(`=== Collection preload error for ${username}:`, error)
    return NextResponse.json(
      {
        error: "Failed to preload collection",
        debug: {
          username,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          errorStack: error instanceof Error ? error.stack : undefined,
        },
      },
      { status: 500 },
    )
  }
}
