import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Star, Users, Clock, Calendar, Tag, Cog } from "lucide-react"
import Image from "next/image"

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
  weight: number
  mechanisms: string[]
  categories: string[]
  bestPlayerCounts: number[]
  bggUrl: string
}

interface GameCardProps {
  game: Game
}

export function GameCard({ game }: GameCardProps) {
  const playerRange =
    game.minPlayers === game.maxPlayers ? `${game.minPlayers}` : `${game.minPlayers}-${game.maxPlayers}`

  const formatBestPlayerCounts = (counts: number[]) => {
    if (!counts || counts.length === 0) return null

    // Sort and format the counts
    const sortedCounts = [...counts].sort((a, b) => a - b)

    // Group consecutive numbers
    const groups: string[] = []
    let start = sortedCounts[0]
    let end = sortedCounts[0]

    for (let i = 1; i < sortedCounts.length; i++) {
      if (sortedCounts[i] === end + 1) {
        end = sortedCounts[i]
      } else {
        groups.push(start === end ? `${start}` : `${start}-${end}`)
        start = end = sortedCounts[i]
      }
    }
    groups.push(start === end ? `${start}` : `${start}-${end}`)

    return groups.join(", ")
  }

  const bestPlayerCountsText = formatBestPlayerCounts(game.bestPlayerCounts)

  return (
    <Card className="bg-purple-900/40 border-purple-700 hover:border-purple-500 transition-colors overflow-hidden backdrop-blur-sm">
      <div className="aspect-square relative">
        <Image
          src={game.image || "/placeholder.svg?height=300&width=300&query=board game"}
          alt={game.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {game.rank && game.rank <= 1000 && (
          <Badge className="absolute top-2 left-2 bg-yellow-600 hover:bg-yellow-700 text-white">#{game.rank}</Badge>
        )}
        {bestPlayerCountsText && (
          <Badge className="absolute top-2 right-2 bg-green-600 hover:bg-green-700 text-white flex items-center gap-1">
            <Star className="w-3 h-3" />
            {bestPlayerCountsText}
          </Badge>
        )}
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg leading-tight text-white">{game.name}</CardTitle>
        <CardDescription className="flex items-center gap-4 text-sm text-purple-200">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {game.yearPublished}
          </div>
          {game.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              {game.rating.toFixed(1)}
            </div>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-purple-200">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {playerRange} players
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {game.playingTime}min
          </div>
          {game.weight > 0 && (
            <div className="flex items-center gap-1">
              <Cog className="w-4 h-4" />
              {game.weight.toFixed(1)}
            </div>
          )}
        </div>

        {bestPlayerCountsText && (
          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-purple-200">Best at: {bestPlayerCountsText} players</span>
          </div>
        )}

        {game.description && (
          <p className="text-sm text-purple-100 line-clamp-3">
            {game.description.replace(/<[^>]*>/g, "").substring(0, 150)}...
          </p>
        )}

        {/* Categories */}
        {game.categories && game.categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {game.categories.slice(0, 2).map((category) => (
              <Badge
                key={category}
                variant="outline"
                className="text-xs bg-purple-700/50 border-purple-500 text-purple-100 hover:bg-purple-600/50"
              >
                <Tag className="w-3 h-3 mr-1" />
                {category}
              </Badge>
            ))}
            {game.categories.length > 2 && (
              <Badge
                variant="outline"
                className="text-xs bg-purple-700/50 border-purple-500 text-purple-100 hover:bg-purple-600/50"
              >
                +{game.categories.length - 2} more
              </Badge>
            )}
          </div>
        )}

        {/* Mechanisms */}
        {game.mechanisms && game.mechanisms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {game.mechanisms.slice(0, 2).map((mechanism) => (
              <Badge
                key={mechanism}
                variant="secondary"
                className="text-xs bg-purple-800/50 text-purple-100 hover:bg-purple-700/50 border-purple-600"
              >
                {mechanism}
              </Badge>
            ))}
            {game.mechanisms.length > 2 && (
              <Badge
                variant="secondary"
                className="text-xs bg-purple-800/50 text-purple-100 hover:bg-purple-700/50 border-purple-600"
              >
                +{game.mechanisms.length - 2} more
              </Badge>
            )}
          </div>
        )}

        <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0">
          <a href={game.bggUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            View on BGG
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
