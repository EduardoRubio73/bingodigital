'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const BALLS = [
  { color: '#e74c3c', number: 7,  size: 64, top: '12%', left: '8%',  delay: '0s',    duration: '7s'  },
  { color: '#3498db', number: 23, size: 52, top: '70%', left: '5%',  delay: '1.5s',  duration: '9s'  },
  { color: '#27ae60', number: 45, size: 72, top: '30%', left: '82%', delay: '0.8s',  duration: '8s'  },
  { color: '#f39c12', number: 61, size: 44, top: '80%', left: '75%', delay: '2.2s',  duration: '6.5s'},
  { color: '#9b59b6', number: 14, size: 56, top: '55%', left: '88%', delay: '3s',    duration: '7.5s'},
  { color: '#e74c3c', number: 38, size: 40, top: '8%',  left: '70%', delay: '1s',    duration: '10s' },
  { color: '#27ae60', number: 52, size: 48, top: '88%', left: '40%', delay: '2.8s',  duration: '8.5s'},
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const router = useRouter()

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
    } else {
      router.push('/admin')
    }
    setLoading(false)
  }, [email, password, router])

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Painel Esquerdo ── */}
      <div className="relative overflow-hidden flex flex-col items-center justify-center brand-bg md:w-3/5 py-16 px-8">
        {/* Bolas flutuantes */}
        {BALLS.map((b, i) => (
          <div
            key={i}
            className="absolute rounded-full flex items-center justify-center font-display text-white select-none pointer-events-none"
            style={{
              width: b.size,
              height: b.size,
              top: b.top,
              left: b.left,
              background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.35) 0%, transparent 60%), ${b.color}`,
              boxShadow: `inset -3px -3px 8px rgba(0,0,0,0.35), 0 4px 20px rgba(0,0,0,0.4)`,
              fontSize: b.size * 0.32,
              animation: `loginFloat ${b.duration} ease-in-out ${b.delay} infinite alternate`,
              opacity: 0.75,
            }}
          >
            {b.number}
          </div>
        ))}

        {/* Glow atrás do logo */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 340,
            height: 340,
            background: 'radial-gradient(circle, rgba(252,211,77,0.18) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Logo */}
        <div className="login-fade-in relative z-10 flex flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="Bingo Sem Fronteiras"
            width={300}
            height={300}
            className="drop-shadow-2xl"
            priority
          />
          <p className="login-fade-in-delayed font-display text-[#fcd34d] tracking-widest text-lg text-center">
            JOGAR · AJUDAR · TRANSFORMAR
          </p>
        </div>
      </div>

      {/* ── Painel Direito ── */}
      <div className="login-slide-in flex flex-col items-center justify-center md:w-2/5 bg-white px-8 py-16">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex justify-center mb-6 md:hidden">
            <Image src="/logo.png" alt="Bingo Sem Fronteiras" width={120} height={120} priority />
          </div>

          <h1 className="font-display text-[#3a1230] text-4xl mb-1">Bem-vindo</h1>
          <p className="text-[#8B2E6F] text-sm font-medium mb-8">Fraternidade Sem Fronteiras</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5C1F47] transition-colors bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#5C1F47] transition-colors bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5C1F47] transition-colors text-lg"
                  tabIndex={-1}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5C1F47] hover:bg-[#8B2E6F] active:bg-[#3a1230] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all text-base tracking-wide mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>

    </div>
  )
}
