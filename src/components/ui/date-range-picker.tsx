'use client'

import { useState } from 'react'
import { addDays, addWeeks, endOfWeek, startOfWeek, endOfMonth, startOfMonth, addMonths, format } from 'date-fns'
import { uk } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
import { CalendarIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type { DateRange }

const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: 'Сьогодні',      range: () => { const d = new Date(); return { from: d, to: d } } },
  { label: 'Завтра',        range: () => { const d = addDays(new Date(), 1); return { from: d, to: d } } },
  { label: 'Цей тиждень',   range: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'Наст. тиждень', range: () => { const n = addWeeks(new Date(), 1); return { from: startOfWeek(n, { weekStartsOn: 1 }), to: endOfWeek(n, { weekStartsOn: 1 }) } } },
  { label: 'Цей місяць',    range: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Наст. місяць',  range: () => { const n = addMonths(new Date(), 1); return { from: startOfMonth(n), to: endOfMonth(n) } } },
  { label: 'Custom',        range: () => ({ from: undefined }) },
]

interface Props {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  className?: string
  placeholder?: string
}

export function DateRangePicker({ value, onChange, className, placeholder = 'Не вказано' }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(value)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const handleOpen = (v: boolean) => {
    if (v) { setDraft(value); setActivePreset(null) }
    setOpen(v)
  }

  const handlePreset = (preset: typeof PRESETS[0]) => {
    if (preset.label === 'Custom') {
      setDraft({ from: undefined })
      setActivePreset('Custom')
      return
    }
    setDraft(preset.range())
    setActivePreset(preset.label)
  }

  const handleConfirm = () => {
    onChange(draft?.from || draft?.to ? draft : undefined)
    setOpen(false)
  }

  const handleClear = () => {
    setDraft(undefined)
    onChange(undefined)
    setOpen(false)
  }

  const handleCancel = () => {
    setDraft(value)
    setOpen(false)
  }

  const fmt = (d: Date) => format(d, 'd MMM yyyy', { locale: uk })

  const triggerLabel = value?.from
    ? value.to && value.to.getTime() !== value.from.getTime()
      ? `${fmt(value.from)} → ${fmt(value.to)}`
      : fmt(value.from)
    : value?.to
    ? fmt(value.to)
    : placeholder

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger
        className={cn(
          'flex items-center gap-2 bg-muted rounded-[8px] px-3 py-2 text-sm hover:bg-muted/80 transition-colors',
          className
        )}
      >
        <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span className={value?.from || value?.to ? 'text-foreground' : 'text-muted-foreground'}>
          {triggerLabel}
        </span>
        {(value?.from || value?.to) && (
          <X
            className="size-3 text-muted-foreground hover:text-foreground shrink-0 ml-1"
            onClick={(e) => { e.stopPropagation(); handleClear() }}
          />
        )}
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 shadow-xl" align="start">
        <div className="flex">
          {/* Presets sidebar */}
          <div className="w-36 border-r border-border py-3 flex flex-col shrink-0">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                className={cn(
                  'text-left px-4 py-2 text-sm transition-colors',
                  activePreset === p.label
                    ? 'font-semibold text-foreground bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar area */}
          <div className="flex flex-col">
            {/* Start / End header */}
            <div className="flex gap-3 px-4 pt-3 pb-2 border-b border-border">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Початок</span>
                <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1 text-sm min-w-[120px]">
                  <span className={draft?.from ? 'text-foreground' : 'text-muted-foreground'}>
                    {draft?.from ? fmt(draft.from) : '—'}
                  </span>
                  {draft?.from && (
                    <X
                      className="size-3 text-muted-foreground hover:text-foreground ml-auto cursor-pointer"
                      onClick={() => setDraft((d) => ({ from: undefined, to: d?.to }))}
                    />
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Кінець</span>
                <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1 text-sm min-w-[120px]">
                  <span className={draft?.to ? 'text-foreground' : 'text-muted-foreground'}>
                    {draft?.to ? fmt(draft.to) : '—'}
                  </span>
                  {draft?.to && (
                    <X
                      className="size-3 text-muted-foreground hover:text-foreground ml-auto cursor-pointer"
                      onClick={() => setDraft((d) => ({ from: d?.from, to: undefined }))}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Calendar */}
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={draft}
              onSelect={(r) => { setDraft(r); setActivePreset('Custom') }}
              locale={uk}
              weekStartsOn={1}
              initialFocus
            />

            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <button
                onClick={handleClear}
                className="text-sm text-[var(--aqua-blue)] hover:underline"
              >
                Очистити
              </button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>Скасувати</Button>
                <Button
                  size="sm"
                  className="text-white"
                  style={{ backgroundColor: 'var(--aqua-blue)' }}
                  onClick={handleConfirm}
                >
                  Вибрати
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
