"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const handleValueChange = (newValue: string) => {
    // Convert "any" back to empty string for the parent component
    onValueChange(newValue === "any" ? "" : newValue)
  }

  // Convert empty string to "any" for the Select component
  const selectValue = value === "" ? "any" : value

  return (
    <Select value={selectValue} onValueChange={handleValueChange}>
      <SelectTrigger className="bg-purple-800/50 border-purple-600 text-white hover:bg-purple-700/50">
        <SelectValue placeholder="Select a mechanism..." className="text-white" />
      </SelectTrigger>
      <SelectContent className="bg-purple-900 border-purple-700 max-h-60">
        <SelectItem value="any" className="text-purple-300 focus:bg-purple-800 focus:text-white">
          Any mechanism
        </SelectItem>
        {MECHANISMS.map((mechanism) => (
          <SelectItem key={mechanism} value={mechanism} className="text-white focus:bg-purple-800 focus:text-white">
            {mechanism}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
