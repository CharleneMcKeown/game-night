"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const MECHANISMS = [
  "Action Point Allowance System",
  "Area Control / Area Influence",
  "Auction/Bidding",
  "Betting and Bluffing",
  "Campaign / Battle Card Driven",
  "Card Drafting",
  "Co-operative Play",
  "Deck / Pool Building",
  "Dice Rolling",
  "Grid Movement",
  "Hand Management",
  "Hex-and-Counter",
  "Memory",
  "Modular Board",
  "Paper-and-Pencil",
  "Pattern Building",
  "Pick-up and Deliver",
  "Point to Point Movement",
  "Press Your Luck",
  "Role Playing",
  "Roll / Spin and Move",
  "Route/Network Building",
  "Secret Unit Deployment",
  "Set Collection",
  "Simulation",
  "Simultaneous Action Selection",
  "Stock Holding",
  "Storytelling",
  "Take That",
  "Tile Placement",
  "Trading",
  "Trick-taking",
  "Variable Phase Order",
  "Variable Player Powers",
  "Voting",
  "Worker Placement",
]

interface MechanismComboboxProps {
  value: string
  onValueChange: (value: string) => void
}

export function MechanismCombobox({ value, onValueChange }: MechanismComboboxProps) {
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
            <span className="text-gray-400">Select a mechanism...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command className="bg-gray-800 border-gray-600">
          <div className="flex items-center border-b border-gray-600 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search mechanisms..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm text-gray-400">No mechanism found.</CommandEmpty>
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
                <span className="text-gray-400">Any mechanism</span>
              </CommandItem>
              {MECHANISMS.map((mechanism) => (
                <CommandItem
                  key={mechanism}
                  value={mechanism}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                  className="text-gray-200 hover:bg-gray-700"
                >
                  <Check className={cn("mr-2 h-4 w-4", value === mechanism ? "opacity-100" : "opacity-0")} />
                  {mechanism}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
