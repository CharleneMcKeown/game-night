"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Star } from "lucide-react"

const BEST_PLAYER_COUNTS = [
  { value: "1", label: "1 Player" },
  { value: "2", label: "2 Players" },
  { value: "3", label: "3 Players" },
  { value: "4", label: "4 Players" },
  { value: "5", label: "5 Players" },
  { value: "6", label: "6 Players" },
  { value: "7", label: "7 Players" },
  { value: "8", label: "8+ Players" },
  { value: "any", label: "Any Player Count" },
]

interface BestPlayerCountComboboxProps {
  value: string
  onValueChange: (value: string) => void
}

export function BestPlayerCountCombobox({ value, onValueChange }: BestPlayerCountComboboxProps) {
  const handleValueChange = (newValue: string) => {
    // Convert "any" back to empty string for the parent component
    onValueChange(newValue === "any" ? "" : newValue)
  }

  // Convert empty string to "any" for the Select component
  const selectValue = value === "" ? "any" : value

  return (
    <Select value={selectValue} onValueChange={handleValueChange}>
      <SelectTrigger className="bg-purple-800/50 border-purple-600 text-white hover:bg-purple-700/50">
        <SelectValue placeholder="Best player count..." className="text-white" />
      </SelectTrigger>
      <SelectContent className="bg-purple-900 border-purple-700 max-h-60">
        <SelectItem value="any" className="text-purple-300 focus:bg-purple-800 focus:text-white">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Any Player Count
          </div>
        </SelectItem>
        {BEST_PLAYER_COUNTS.filter((count) => count.value !== "any").map((count) => (
          <SelectItem key={count.value} value={count.value} className="text-white focus:bg-purple-800 focus:text-white">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              {count.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
