import { type NextRequest, NextResponse } from "next/server"
import { XMLParser } from "fast-xml-parser"

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username") || "boardgamegeek" // Default test user

  console.log("Testing collection for user:", username)

  try {
    // Test different collection API endpoints
    const endpoints = [
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}`,
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1`,
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&subtype=boardgame`,
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1&subtype=boardgame`,
    ]

    const results = []

    for (const endpoint of endpoints) {
      console.log(`Testing endpoint: ${endpoint}`)

      try {
        const response = await fetch(endpoint, {
          headers: {
            "User-Agent": "BGG-Recommender/1.0",
          },
        })

        console.log(`Status: ${response.status}`)
        const text = await response.text()
        console.log(`Response length: ${text.length}`)
        console.log(`First 500 chars: ${text.substring(0, 500)}`)

        let parsedData = null
        try {
          parsedData = parser.parse(text)
        } catch (parseError) {
          console.log("Parse error:", parseError)
        }

        results.push({
          endpoint,
          status: response.status,
          responseLength: text.length,
          rawResponse: text.substring(0, 1000), // First 1000 chars
          parsedData: parsedData ? JSON.stringify(parsedData, null, 2).substring(0, 2000) : null,
          parseError: parsedData ? null : "Failed to parse XML",
        })

        // If we got a 200 response, break early
        if (response.status === 200 && text.length > 100) {
          break
        }

        // Wait between requests to be nice to BGG
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        results.push({
          endpoint,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      username,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        username,
      },
      { status: 500 },
    )
  }
}
