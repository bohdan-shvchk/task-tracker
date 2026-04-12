'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Невірний пароль')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-muted/20 flex items-center justify-center">
      <div className="bg-background border border-border rounded-2xl shadow-lg p-8 w-full max-w-sm mx-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">TT</span>
          </div>
          <span className="font-semibold text-sm">Task Tracker</span>
        </div>

        <h1 className="text-xl font-bold mb-6">Вхід</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full px-4 py-2.5 pr-11 rounded-lg border border-border bg-muted/30 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShow((v) => !v)}
              className="absolute right-1 top-1/2 -translate-y-1/2"
              tabIndex={-1}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || !password}
            className="w-full"
          >
            {loading ? 'Вхід...' : 'Увійти'}
          </Button>
        </form>
      </div>
    </div>
  )
}
