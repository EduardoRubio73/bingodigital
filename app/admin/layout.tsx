'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const checkAuth = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.replace('/login')
    else setChecking(false)
  }, [router])

  useEffect(() => { checkAuth() }, [checkAuth])

  const handleLogout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen brand-bg flex items-center justify-center">
        <div className="text-white text-xl font-display">Carregando...</div>
      </div>
    )
  }

  const links = [
    { href: '/admin', label: 'Sortear' },
    { href: '/admin/setup', label: 'Novo Evento' },
    { href: '/admin/players', label: 'Cartelas' },
  ]

  return (
    <div className="min-h-screen brand-bg">
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎰</span>
          <span className="font-display text-white text-xl tracking-widest">BINGO DIGITAL</span>
        </div>
        <nav className="flex items-center gap-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === l.href
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="ml-2 px-3 py-1.5 rounded-lg text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            Sair
          </button>
        </nav>
      </header>
      <main className="p-4 md:p-8 max-w-5xl mx-auto">{children}</main>
    </div>
  )
}
