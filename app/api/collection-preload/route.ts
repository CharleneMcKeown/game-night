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

  console.log(`=== Collection Preload for: ${username} ===`)

  try {
    // Only fetch base games, not expansions
    const collectionEndpoints = [
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1&subtype=boardgame&excludesubtype=boardgameexpansion`,
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1&subtype=boardgame`,
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&subtype=boardgame`,
    ]

    let collectionData = null
    let lastError = null

    for (const endpoint of collectionEndpoints) {
      console.log(`Trying endpoint: ${endpoint}`)
      try {
        const response = await fetchWithRetry(endpoint, 2)
        const text = await response.text()

        console.log(`Response status: ${response.status}, length: ${text.length}`)

        // Check for specific BGG error messages
        if (text.includes("Invalid username")) {
          lastError = "This username doesn't exist on BoardGameGeek. Please check the spelling and try again."
          continue
        }

        if (text.includes("User has not marked any items as owned")) {
          lastError =
            "This user hasn't marked any games as owned in their collection. Make sure you've added games to your BGG collection and marked them as 'owned'."
          continue
        }

        // Check for private collection indicators
        if (
          text.includes("private") ||
          text.includes("Private") ||
          text.includes("not public") ||
          text.includes("access denied") ||
          (response.status === 200 && text.trim().length < 50)
        ) {
          lastError =
            "This user's collection appears to be private. Please make sure your BGG collection is set to public in your account settings."
          continue
        }

        // Check for valid XML response with items
        if (text && text.trim() && text.includes("<items")) {
          try {
            collectionData = parser.parse(text)
            console.log(`Successfully parsed collection data`)
            break
          } catch (parseError) {
            console.log(`Parse error: ${parseError}`)
            lastError = "Unable to read collection data from BoardGameGeek. Please try again later."
            continue
          }
        } else if (text.trim().length === 0) {
          lastError =
            "Received empty response from BoardGameGeek. The user may not exist or their collection may be private."
        } else {
          lastError =
            "Unable to access collection data. Please check that the username is correct and the collection is public."
        }
      } catch (error) {
        console.log(`Endpoint error: ${error}`)
        lastError = error instanceof Error ? error.message : "Network error while fetching collection"
        continue
      }
    }

    if (!collectionData) {
      console.log(`=== Final Error for ${username}: ${lastError} ===`)
      return NextResponse.json(
        {
          error: lastError || "Could not fetch collection from BoardGameGeek",
          userFriendly: true,
        },
        { status: 404 },
      )
    }

    let items = []
    if (collectionData.items && collectionData.items.item) {
      items = Array.isArray(collectionData.items.item) ? collectionData.items.item : [collectionData.items.item]
    }

    // Check if collection is empty after parsing
    if (items.length === 0) {
      return NextResponse.json(
        {
          error:
            "This user's collection appears to be empty or contains no board games marked as 'owned'. Please make sure you have games in your BGG collection marked as owned.",
          userFriendly: true,
        },
        { status: 404 },
      )
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

    // Check if we have any base games after filtering
    if (gameIds.length === 0) {
      return NextResponse.json(
        {
          error: "No base games found in this collection. The collection may only contain expansions or accessories.",
          userFriendly: true,
        },
        { status: 404 },
      )
    }

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
        error: "Unable to connect to BoardGameGeek. Please check your internet connection and try again.",
        userFriendly: true,
      },
      { status: 500 },
    )
  }
}
