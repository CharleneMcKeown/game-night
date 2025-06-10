"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-gray-700 border-gray-500 text-gray-100 hover:bg-gray-600"
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-gray-400">Select a category...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command className="bg-gray-800 border-gray-600">
          <div className="flex items-center border-b border-gray-600 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search categories..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm text-gray-400">No category found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value=""
                onSelect={() => {
                  onValueChange("")
                  setOpen(false)
                }}
                className="text-gray-200 hover:bg-gray-700"
              >
                <Check className={cn("mr-2 h-4 w-4", value === "" ? "opacity-100" : "opacity-0")} />
                <span className="text-gray-400">Any category</span>
              </CommandItem>
              {CATEGORIES.map((category) => (
                <CommandItem
                  key={category}
                  value={category}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                  className="text-gray-200 hover:bg-gray-700"
                >
                  <Check className={cn("mr-2 h-4 w-4", value === category ? "opacity-100" : "opacity-0")} />
                  {category}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
