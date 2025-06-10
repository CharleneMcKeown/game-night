import { type NextRequest, NextResponse } from "next/server"

// This would typically connect to a server-side cache like Redis
// For this example, we'll simulate cache lookup
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  // In a real implementation, this would check Redis or another cache
  // For now, return empty to indicate no server-side cache
  return NextResponse.json({ games: [], cached: false })
}
