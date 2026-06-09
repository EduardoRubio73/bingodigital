'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useEvent } from '@/hooks/useEvent'

export default function DisplayPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { event, loading } = useEvent(eventId)
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)
  const [animKey, setAnimKey] = useState(0)
  const prevLengthRef = useRef(0)

  // Detecta novo número e dispara animação
  useEffect(() => {
    if (!event?.drawn_numbers?.length) return
    if (event.drawn_numbers.length > prevLengthRef.current) {
      const latest = event.drawn_numbers[event.drawn_numbers.length - 1]
      setCurrentNumber(latest)
      setAnimKey(k => k + 1)
    }
    prevLengthRef.current = event.drawn_numbers.length
  }, [event?.drawn_numbers])

  // Fullscreen ao montar
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  if (loading || !event) {
    return (
      <div className="min-h-screen brand-bg flex items-center justify-center">
        <p className="font-display text-white/40 text-4xl">AGUARDANDO EVENTO...</p>
      </div>
    )
  }

  const last5 = [...event.drawn_numbers].reverse().slice(0, 5)

  return (
    <div className="min-h-screen brand-bg flex flex-col select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎰</span>
          <span className="font-display text-white text-2xl tracking-widest">{event.name}</span>
        </div>
        <div className="text-white/40 font-display text-xl">
          {event.drawn_numbers.length} / 75
        </div>
      </div>

      {/* Corpo principal */}
      <div className="flex-1 flex gap-6 p-8">
        {/* Coluna esquerda: número atual */}
        <div className="flex flex-col items-center justify-center w-80 flex-shrink-0">
          <p className="text-white/40 text-sm uppercase tracking-widest mb-6 font-medium">Número Atual</p>
          {currentNumber ? (
            <div
              key={animKey}
              className="ball ball-yellow w-52 h-52 flex items-center justify-center font-display text-8xl animate-ball-pop"
            >
              {currentNumber}
            </div>
          ) : (
            <div className="ball ball-gray w-52 h-52 flex items-center justify-center font-display text-6xl text-gray-400">
              —
            </div>
          )}

          {/* Últimos 5 */}
          <div className="mt-8 w-full">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-3 text-center">Anteriores</p>
            <div className="flex justify-center gap-2">
              {last5.slice(1).map((n, i) => (
                <div
                  key={n}
                  className="ball ball-purple w-12 h-12 flex items-center justify-center font-display text-xl"
                  style={{ opacity: 1 - i * 0.2 }}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grade 1-75 */}
        <div className="flex-1 flex flex-col">
          <p className="text-white/40 text-sm uppercase tracking-widest mb-4 font-medium">Todos os Números</p>
          <div className="grid grid-cols-[repeat(15,1fr)] gap-1.5 flex-1 content-start">
            {Array.from({ length: 75 }, (_, i) => i + 1).map(n => {
              const isDrawn = event.drawn_numbers.includes(n)
              const isCurrent = n === currentNumber
              return (
                <div
                  key={n}
                  className={`aspect-square flex items-center justify-center rounded-lg font-display text-sm transition-all ${
                    isCurrent
                      ? 'ball ball-yellow text-[#5C1F47] animate-ball-pop'
                      : isDrawn
                      ? 'bg-[#fcd34d]/30 text-[#fcd34d] font-bold'
                      : 'bg-white/5 text-white/20'
                  }`}
                >
                  {n}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-3 border-t border-white/10 flex items-center justify-between">
        <p className="text-white/30 text-xs">Fraternidade Sem Fronteiras</p>
        <p className="text-white/30 text-xs capitalize">
          Condição: {event.win_condition.replace('_', ' ')}
        </p>
        {event.status === 'finished' && (
          <div className="absolute inset-0 brand-bg/95 flex items-center justify-center">
            <p className="font-display text-[#fcd34d] text-8xl animate-celebrate">FIM DE JOGO!</p>
          </div>
        )}
      </div>
    </div>
  )
}
