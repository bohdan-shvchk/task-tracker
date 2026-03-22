'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  '#6648F0', '#E93D82', '#3E63DD', '#AB4ABA', '#0491FF', '#A18072',
  '#12A693', '#8D8D8D', '#30A56C', '#FFC63D', '#F7680A', '#E5484D',
]

interface Props {
  value: string
  /** fires for every preset click AND custom color change (for live preview) */
  onChange: (color: string) => void
  /** fires only when a preset is clicked (use this to close a popover) */
  onSelect?: (color: string) => void
  className?: string
}

export function ColorPalette({ value, onChange, onSelect, className }: Props) {
  return (
    <div className={cn('flex flex-wrap gap-1.5 p-1', className)}>
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-transform hover:scale-110 focus:outline-none"
          style={{
            backgroundColor: color,
            boxShadow: value === color ? `0 0 0 2px white, 0 0 0 3.5px ${color}` : undefined,
          }}
          onClick={() => {
            onChange(color)
            onSelect?.(color)
          }}
        >
          {value === color && <Check className="size-3 text-white drop-shadow" />}
        </button>
      ))}

      {/* Custom color */}
      <label
        className="w-6 h-6 rounded-full shrink-0 border-2 border-dashed border-muted-foreground/40 flex items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors overflow-hidden relative"
        title="Власний колір"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="color"
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="text-[10px] text-muted-foreground font-bold pointer-events-none">+</span>
      </label>
    </div>
  )
}
