'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Clock, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'

export default function Sidebar() {
  const pathname = usePathname()
  const { projects, setTrashOpen } = useAppStore()

  const isOnProject = /^\/projects\//.test(pathname)

  const navItems = [
    { href: '/', icon: Home, label: 'Головна' },
    { href: '/analytics', icon: Clock, label: 'Аналітика' },
  ]

  return (
    <aside className="w-60 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col py-4 px-3 shrink-0">
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
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
        <button
          onClick={() => setTrashOpen(true)}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full text-left"
        >
          <Trash2 className="size-4 shrink-0" />
          Кошик
        </button>
      </nav>

      <div className="h-px bg-sidebar-border mb-4" />

      {/* Projects */}
      <div className="flex-1 overflow-y-auto">
        <p className="text-xs font-medium text-muted-foreground px-2.5 mb-2 uppercase tracking-wider">
          Проєкти
        </p>
        <div className="flex flex-col gap-1">
          {projects.map((project) => {
            const initials = project.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
            const isActive = pathname === `/projects/${project.id}`
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: project.color }}
                >
                  {initials}
                </div>
                <span className="truncate">{project.name}</span>
                {project._count && (
                  <span className="ml-auto text-xs text-muted-foreground">{project._count.tasks}</span>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Theme toggle — hidden for now */}
      {/* <div className="mt-auto pt-4 border-t border-sidebar-border">...</div> */}
    </aside>
  )
}
