import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface SettingsSelectOption {
  value: string
  label: string
}

interface SettingsSelectProps {
  id: string
  value: string
  options: SettingsSelectOption[]
  onValueChange: (value: string) => void
  className?: string
}

export function SettingsSelect({ id, value, options, onValueChange, className }: SettingsSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={cn('w-full sm:w-44', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
