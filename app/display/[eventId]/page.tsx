'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useEvent } from '@/hooks/useEvent'
import { speakNumber, type TensionLevel } from '@/lib/tts'
import { loadConfig } from '@/lib/config'
import { createClient } from '@/lib/supabase/client'

// Bingo card has 25 squares (5x5 flat array). Index 12 = free space.
const FREE_IDX = 12

// All 12 lines in a 5×5 bingo card (5 rows + 5 cols + 2 diagonals)
const BINGO_LINES = [
  [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24],
  [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24],
  [0,6,12,18,24], [4,8,12,16,20],
] as const

function calcMinNeeded(numbers: number[], drawn: Set<number>, winCondition: string): number {
  if (winCondition === 'full_card') {
    let needed = 0
    for (let i = 0; i < 25; i++) {
      if (i === FREE_IDX) continue
      if (!drawn.has(numbers[i])) needed++
    }
    return needed
  }
  // Any line (default)
  let minNeeded = 5
  for (const line of BINGO_LINES) {
    let needed = 0
    for (const idx of line) {
      if (idx === FREE_IDX) continue
      if (!drawn.has(numbers[idx])) needed++
    }
    if (needed < minNeeded) minNeeded = needed
    if (minNeeded === 0) break
  }
  return minNeeded
}

async function getProximity(
  eventId: string,
  drawnNumbers: number[],
  winCondition: string
): Promise<TensionLevel> {
  const supabase = createClient()
  const { data: cards } = await supabase
    .from('cards')
    .select('numbers')
    .eq('event_id', eventId)

  if (!cards?.length) return 'normal'

  const drawn = new Set(drawnNumbers)
  let minNeeded = 99

  for (const card of cards) {
    const nums: number[] = card.numbers
    if (!Array.isArray(nums) || nums.length < 25) continue
    const needed = calcMinNeeded(nums, drawn, winCondition)
    if (needed < minNeeded) minNeeded = needed
    if (minNeeded <= 1) break
  }

  if (minNeeded <= 1) return 'climax'
  if (minNeeded <= 2) return 'dramatic'
  if (minNeeded <= 3) return 'alert'
  return 'normal'
}

export default function DisplayPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { event, loading } = useEvent(eventId)
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)
  const [animKey, setAnimKey] = useState(0)
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'speaking' | 'error'>('idle')
  const [tensionLevel, setTensionLevel] = useState<TensionLevel>('normal')
  const prevLengthRef = useRef(0)
  const speakingRef = useRef(false)

  const triggerSpeak = useCallback(async (num: number, tension: TensionLevel) => {
    const cfg = loadConfig()
    if (!cfg.ttsEnabled || !cfg.geminiApiKey) return
    if (speakingRef.current) return
    speakingRef.current = true
    setTtsStatus('speaking')
    try {
      await speakNumber(num, cfg.geminiApiKey, cfg.voiceName, cfg.ttsPrefix, tension)
      setTtsStatus('idle')
    } catch (err) {
      console.error('[TTS]', err)
      setTtsStatus('error')
      setTimeout(() => setTtsStatus('idle'), 3000)
    } finally {
      speakingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!event?.drawn_numbers?.length) return
    if (event.drawn_numbers.length <= prevLengthRef.current) return

    const latest = event.drawn_numbers[event.drawn_numbers.length - 1]
    setCurrentNumber(latest)
    setAnimKey(k => k + 1)
    prevLengthRef.current = event.drawn_numbers.length

    // Check proximity to determine drama level, then speak
    getProximity(eventId, event.drawn_numbers, event.win_condition ?? 'line')
      .then(tension => {
        setTensionLevel(tension)
        triggerSpeak(latest, tension)
      })
      .catch(() => triggerSpeak(latest, 'normal'))
  }, [event?.drawn_numbers, eventId, event?.win_condition, triggerSpeak])

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  const cfg = loadConfig()

  if (loading || !event) {
    return (
      <div className="min-h-screen brand-bg flex items-center justify-center">
        <p className="font-display text-white/40 text-4xl">AGUARDANDO EVENTO...</p>
      </div>
    )
  }

  const last5 = [...event.drawn_numbers].reverse().slice(0, 5)

  const tensionColors: Record<TensionLevel, string> = {
    normal:   'text-white/30 bg-white/5 border-white/10',
    alert:    'text-yellow-300 bg-yellow-400/10 border-yellow-400/30',
    dramatic: 'text-orange-300 bg-orange-400/10 border-orange-400/30 animate-pulse',
    climax:   'text-red-300 bg-red-400/10 border-red-400/30 animate-pulse',
  }

  const tensionIcons: Record<TensionLevel, string> = {
    normal:   ttsStatus === 'speaking' ? '🔊' : ttsStatus === 'error' ? '⚠️' : '🔈',
    alert:    '⚡',
    dramatic: '🥁',
    climax:   '🚨',
  }

  const tensionLabels: Record<TensionLevel, string> = {
    normal:   ttsStatus === 'speaking' ? 'Anunciando...' : ttsStatus === 'error' ? 'Erro de voz' : 'Voz ativa',
    alert:    'Alguém chegando perto!',
    dramatic: 'Suspense! 2 para o bingo!',
    climax:   '🚨 1 número para o BINGO!',
  }

  return (
    <div className="min-h-screen brand-bg flex flex-col select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎰</span>
          <span className="font-display text-white text-2xl tracking-widest">{event.name}</span>
        </div>
        <div className="flex items-center gap-4">
          {cfg.ttsEnabled && (
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all ${
              tensionLevel !== 'normal'
                ? tensionColors[tensionLevel]
                : ttsStatus === 'speaking'
                  ? 'text-yellow-300 bg-yellow-400/10 border-yellow-400/30 animate-pulse'
                  : ttsStatus === 'error'
                  ? 'text-red-400 bg-red-400/10 border-red-400/30'
                  : tensionColors.normal
            }`}>
              <span>{tensionIcons[tensionLevel]}</span>
              <span>{tensionLabels[tensionLevel]}</span>
            </div>
          )}
          <div className="text-white/40 font-display text-xl">
            {event.drawn_numbers.length} / 75
          </div>
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
              className={`ball w-52 h-52 flex items-center justify-center font-display text-8xl animate-ball-pop ${
                tensionLevel === 'climax'   ? 'ball-red'    :
                tensionLevel === 'dramatic' ? 'ball-orange' :
                tensionLevel === 'alert'    ? 'ball-purple' :
                'ball-yellow'
              }`}
            >
              {currentNumber}
            </div>
          ) : (
            <div className="ball ball-gray w-52 h-52 flex items-center justify-center font-display text-6xl text-gray-400">
              —
            </div>
          )}

          {/* Últimos 4 */}
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
                      ? `ball font-bold animate-ball-pop ${
                          tensionLevel === 'climax'   ? 'ball-red text-white'    :
                          tensionLevel === 'dramatic' ? 'ball-orange text-white' :
                          'ball-yellow text-[#5C1F47]'
                        }`
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
        <p className="text-white/30 text-xs">{cfg.orgName1}</p>
        <p className="text-white/30 text-xs capitalize">
          {event.prize_conditions?.length
            ? `${event.prize_conditions.filter((p: { won_at: string | null }) => p.won_at).length}/${event.prize_conditions.length} prêmios entregues`
            : `Condição: ${event.win_condition?.replace('_', ' ')}`}
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
