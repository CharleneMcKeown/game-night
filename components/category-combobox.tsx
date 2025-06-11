"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const CATEGORIES = [
  "Abstract Strategy",
  "Action / Dexterity",
  "Adventure",
  "Age of Reason",
  "American Civil War",
  "American Indian Wars",
  "American Revolutionary War",
  "American West",
  "Ancient",
  "Animals",
  "Arabian",
  "Aviation / Flight",
  "Bluffing",
  "Book",
  "Card Game",
  "Children's Game",
  "City Building",
  "Civilization",
  "Collectible Components",
  "Comic Book / Strip",
  "Deduction",
  "Dice",
  "Economic",
  "Educational",
  "Electronic",
  "Environmental",
  "Expansion for Base-game",
  "Exploration",
  "Fantasy",
  "Farming",
  "Fighting",
  "Game System",
  "Horror",
  "Humor",
  "Industry / Manufacturing",
  "Mafia",
  "Math",
  "Mature / Adult",
  "Maze",
  "Medical",
  "Medieval",
  "Memory",
  "Miniatures",
  "Modern Warfare",
  "Movies / TV / Radio theme",
  "Murder/Mystery",
  "Music",
  "Mythology",
  "Napoleonic",
  "Nautical",
  "Negotiation",
  "Novel-based",
  "Number",
  "Party Game",
  "Pirates",
  "Political",
  "Post-Napoleonic",
  "Prehistoric",
  "Print & Play",
  "Puzzle",
  "Racing",
  "Real-time",
  "Religious",
  "Renaissance",
  "Science Fiction",
  "Space Exploration",
  "Spies/Secret Agents",
  "Sports",
  "Territory Building",
  "Trains",
  "Transportation",
  "Travel",
  "Trivia",
  "Video Game Theme",
  "Wargame",
  "Word Game",
  "World War I",
  "World War II",
  "Zombies",
]

interface CategoryComboboxProps {
  value: string
  onValueChange: (value: string) => void
}

export function CategoryCombobox({ value, onValueChange }: CategoryComboboxProps) {
  const handleValueChange = (newValue: string) => {
    // Convert "any" back to empty string for the parent component
    onValueChange(newValue === "any" ? "" : newValue)
  }

  // Convert empty string to "any" for the Select component
  const selectValue = value === "" ? "any" : value

  return (
    <Select value={selectValue} onValueChange={handleValueChange}>
      <SelectTrigger className="bg-purple-800/50 border-purple-600 text-white hover:bg-purple-700/50">
        <SelectValue placeholder="Select a category..." className="text-white" />
      </SelectTrigger>
      <SelectContent className="bg-purple-900 border-purple-700 max-h-60">
        <SelectItem value="any" className="text-purple-300 focus:bg-purple-800 focus:text-white">
          Any category
        </SelectItem>
        {CATEGORIES.map((category) => (
          <SelectItem key={category} value={category} className="text-white focus:bg-purple-800 focus:text-white">
            {category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
