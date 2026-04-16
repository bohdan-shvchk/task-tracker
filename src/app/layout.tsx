import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import GlobalTimerWidget from '@/components/timer/GlobalTimerWidget'
import { ThemeProvider } from '@/components/ThemeProvider'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'cyrillic'],
})

export const metadata: Metadata = {
  title: 'Task Tracker',
  description: 'Task management application',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="uk" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
          <TooltipProvider>
            {children}
            <GlobalTimerWidget />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
