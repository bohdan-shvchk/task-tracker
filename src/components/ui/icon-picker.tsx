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
  value?: string | null
  onChange: (icon: string) => void
  onSelect?: () => void
  color?: string
}

export default function IconPicker({ value, onChange, onSelect }: IconPickerProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 2rem)', gap: '4px', padding: '8px', width: 'max-content' }}>
      {Object.entries(PROJECT_ICONS).map(([name, Icon]) => (
        <button
          key={name}
          onClick={() => { onChange(name); onSelect?.() }}
          title={name}
          style={{
            width: '2rem',
            height: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            border: value === name ? '2px solid #2a6ff3' : '2px solid transparent',
            background: value === name ? '#2a6ff310' : 'transparent',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { if (value !== name) (e.currentTarget as HTMLButtonElement).style.background = '#f4f5f7' }}
          onMouseLeave={(e) => { if (value !== name) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  )
}

export function ProjectIcon({ icon, color, size = 'md' }: { icon?: string | null; color: string; size?: 'sm' | 'md' }) {
  const Icon = icon ? PROJECT_ICONS[icon] : null
  const px = size === 'sm' ? 24 : 28
  const iconSize = size === 'sm' ? 14 : 16

  return (
    <div
      className={cn('flex items-center justify-center shrink-0', size === 'sm' ? 'rounded-md' : 'rounded-lg')}
      style={{ width: px, height: px, backgroundColor: `${color}20`, border: `1.5px solid ${color}40` }}
    >
      {Icon && <Icon size={iconSize} style={{ color }} />}
    </div>
  )
}
