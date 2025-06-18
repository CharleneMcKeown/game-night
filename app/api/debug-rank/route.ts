import { type NextRequest, NextResponse } from "next/server"
import { XMLParser } from "fast-xml-parser"

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get("gameId") || "419704" // Default to Phoenix New Horizon

  try {
    const detailsUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`

    const response = await fetch(detailsUrl, {
      headers: {
        "User-Agent": "BGG-Recommender/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const text = await response.text()
    const data = parser.parse(text)

    if (!data.items || !data.items.item) {
      return NextResponse.json({ error: "No game data found" }, { status: 404 })
    }

    const item = Array.isArray(data.items.item) ? data.items.item[0] : data.items.item

    const name = Array.isArray(item.name)
      ? item.name.find((n: any) => n["@_type"] === "primary")?.["@_value"] || item.name[0]["@_value"]
      : item.name?.["@_value"] || "Unknown"

    // Extract rank information
    const rankData = item.statistics?.ratings?.ranks?.rank

    return NextResponse.json({
      gameId: item["@_id"],
      name,
      rawRankData: rankData,
      rawXML: text.substring(0, 2000), // First 2000 chars of XML for inspection
      parsedStructure: {
        statistics: item.statistics,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        gameId,
      },
      { status: 500 },
    )
  }
}
