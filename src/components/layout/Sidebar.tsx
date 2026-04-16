'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Clock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { ProjectIcon } from '@/components/ui/icon-picker'

export default function Sidebar() {
  const pathname = usePathname()
  const { projects, setTrashOpen } = useAppStore()

  const navItems = [
    { href: '/', icon: Home, label: 'Головна' },
    { href: '/analytics', icon: Clock, label: 'Аналітика' },
  ]

  return (
    <aside className="w-60 h-full overflow-y-auto bg-sidebar flex flex-col py-4 px-3 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">TT</span>
        </div>
        <span className="font-semibold text-sm text-sidebar-foreground">Task Tracker</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 mb-6">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
              pathname === href
                ? 'bg-sidebar-accent font-medium'
                : 'hover:bg-sidebar-accent'
            )}
            style={{ color: pathname === href ? 'var(--aqua-blue)' : 'var(--neutral-500)' }}
          >
            <Icon className="size-4 shrink-0" style={{ color: 'var(--neutral-500)' }} />
            {label}
          </Link>
        ))}
        <Button
          variant="ghost"
          onClick={() => setTrashOpen(true)}
          className="flex items-center gap-2.5 px-2.5 py-2 h-auto rounded-lg text-sm hover:bg-sidebar-accent w-full justify-start"
          style={{ color: 'var(--neutral-500)' }}
        >
          <Trash2 className="size-4 shrink-0" style={{ color: 'var(--neutral-500)' }} />
          Кошик
        </Button>
      </nav>

      {/* Projects */}
      <div className="flex-1 overflow-y-auto">
        <p className="text-xs font-medium px-2.5 mb-2 uppercase tracking-wider" style={{ color: 'var(--neutral-500)' }}>
          Проєкти
        </p>
        <div className="flex flex-col gap-1">
          {projects.map((project) => {
            const isActive = pathname === `/projects/${project.id}`
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                  isActive ? 'bg-sidebar-accent font-medium' : 'hover:bg-sidebar-accent'
                )}
                style={{ color: isActive ? 'var(--aqua-blue)' : 'var(--neutral-500)' }}
              >
                <ProjectIcon icon={project.icon} color={project.color} size="sm" />
                <span className="truncate">{project.name}</span>
                {project._count && (
                  <span className="ml-auto text-xs" style={{ color: 'var(--neutral-500)' }}>{project._count.tasks}</span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
