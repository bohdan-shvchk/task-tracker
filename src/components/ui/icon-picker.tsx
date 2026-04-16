'use client'

import {
  Briefcase, Code2, Globe, Star, Zap, Target, Rocket, Database,
  Shield, BookOpen, Layers, Monitor, Cloud, Lock, Search, Bell,
  Mail, Users, TrendingUp, ShoppingBag, Palette, Music, Camera, Flame,
  Leaf, Gem, Box, Cpu, FlaskConical, Scissors, LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const PROJECT_ICONS: Record<string, LucideIcon> = {
  Briefcase, Code2, Globe, Star, Zap, Target, Rocket, Database,
  Shield, BookOpen, Layers, Monitor, Cloud, Lock, Search, Bell,
  Mail, Users, TrendingUp, ShoppingBag, Palette, Music, Camera, Flame,
  Leaf, Gem, Box, Cpu, FlaskConical, Scissors,
}

interface IconPickerProps {
  value?: string
  onChange: (icon: string) => void
  onSelect?: () => void
  color?: string
}

export default function IconPicker({ value, onChange, onSelect, color }: IconPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-1 p-1">
      {Object.entries(PROJECT_ICONS).map(([name, Icon]) => (
        <button
          key={name}
          onClick={() => { onChange(name); onSelect?.() }}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-muted',
            value === name ? 'ring-2 ring-offset-1 ring-primary' : ''
          )}
          title={name}
        >
          <Icon className="size-4" style={{ color: value === name ? color : undefined }} />
        </button>
      ))}
    </div>
  )
}

export function ProjectIcon({ icon, color, size = 'md' }: { icon?: string | null; color: string; size?: 'sm' | 'md' }) {
  const Icon = icon ? PROJECT_ICONS[icon] : null
  const sizeClass = size === 'sm' ? 'size-3.5' : 'size-4'
  const containerClass = size === 'sm' ? 'w-6 h-6 rounded-md' : 'w-7 h-7 rounded-lg'

  return (
    <div
      className={cn('flex items-center justify-center shrink-0', containerClass)}
      style={{ backgroundColor: `${color}20`, border: `1.5px solid ${color}40` }}
    >
      {Icon ? (
        <Icon className={sizeClass} style={{ color }} />
      ) : (
        <span className="text-[10px] font-bold" style={{ color }}>
          {/* fallback: empty, color dot */}
        </span>
      )}
    </div>
  )
}
