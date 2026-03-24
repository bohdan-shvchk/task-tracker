'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Project } from '@/lib/types'
import { ColorPalette } from '@/components/ui/color-palette'

interface Props {
  onClose: () => void
  onCreated: (project: Project) => void
}

export default function CreateProjectModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color, url: url.trim() || null }),
      })
      if (res.ok) {
        const project = await res.json()
        onCreated(project)
        onClose()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Новий проєкт</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Назва проєкту</label>
            <Input
              placeholder="Введіть назву..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">URL сайту</label>
            <Input
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="url"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Колір</label>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-sm text-muted-foreground">{color}</span>
            </div>
            <ColorPalette value={color} onChange={setColor} className="p-0" />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Скасувати
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Створення...' : 'Створити'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
