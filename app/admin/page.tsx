'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { BingoEvent, BingoCard, PrizeCondition } from '@/lib/supabase/types'
import { checkWinCondition } from '@/lib/utils'
import Link from 'next/link'

export default function AdminDashboard() {
  const [event, setEvent] = useState<BingoEvent | null>(null)
  const [cards, setCards] = useState<BingoCard[]>([])
  const [claims, setClaims] = useState<BingoCard[]>([])
  const [drawing, setDrawing] = useState(false)
  const [lastDrawn, setLastDrawn] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchActiveEvent = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('events')
      .select('id, name, status, win_condition, drawn_numbers, price_per_card, max_cards, cards_sold, prize_conditions, created_at')
      .in('status', ['active', 'setup'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setEvent(data)
    setLoading(false)
  }, [])

  const fetchCards = useCallback(async (eventId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('cards')
      .select('id, event_id, player_name, numbers, marked_numbers, bingo_claimed_at, alphanumeric_code, sale_id, sequence_number, created_at')
      .eq('event_id', eventId)
    setCards(data ?? [])
  }, [])

  const fetchClaims = useCallback(async (eventId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('cards')
      .select('id, event_id, player_name, numbers, marked_numbers, bingo_claimed_at, alphanumeric_code, sale_id, sequence_number, created_at')
      .eq('event_id', eventId)
      .not('bingo_claimed_at', 'is', null)
      .order('bingo_claimed_at', { ascending: true })
    setClaims(data ?? [])
  }, [])

  useEffect(() => { fetchActiveEvent() }, [fetchActiveEvent])

  useEffect(() => {
    if (!event) return
    fetchCards(event.id)
    fetchClaims(event.id)
    const supabase = createClient()
    const channel = supabase
      .channel(`admin-event-${event.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${event.id}` },
        payload => setEvent(payload.new as BingoEvent))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cards', filter: `event_id=eq.${event.id}` },
        () => { fetchCards(event.id); fetchClaims(event.id) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [event?.id, fetchCards, fetchClaims])

  const checkAndRegisterWins = useCallback(async (
    newDrawnNumbers: number[],
    currentEvent: BingoEvent,
    allCards: BingoCard[]
  ) => {
    const conditions: PrizeCondition[] = currentEvent.prize_conditions ?? []
    const updatedConditions = [...conditions]
    let shouldFinish = false
    const supabase = createClient()

    for (let i = 0; i < updatedConditions.length; i++) {
      const cond = updatedConditions[i]
      if (cond.won_at !== null) continue // já tem vencedor

      for (const card of allCards) {
        if (checkWinCondition(card.numbers, newDrawnNumbers, cond.condition)) {
          const code = card.alphanumeric_code ?? card.id.slice(0, 6)
          updatedConditions[i] = {
            ...cond,
            won_by_card: code,
            won_by_name: card.player_name,
            won_at: new Date().toISOString(),
          }
          toast.success(`🏆 ${cond.label}: ${card.player_name} (${code}) ganhou "${cond.prize}"!`, { duration: 8000 })

          if (cond.condition === 'full_card') shouldFinish = true
          break
        }
      }
    }

    const conditionsChanged = JSON.stringify(updatedConditions) !== JSON.stringify(conditions)
    if (conditionsChanged || shouldFinish) {
      await supabase
        .from('events')
        .update({
          prize_conditions: updatedConditions,
          ...(shouldFinish ? { status: 'finished' } : {}),
        })
        .eq('id', currentEvent.id)

      if (shouldFinish) {
        toast.success('🎉 Cartela Cheia! Evento encerrado.')
        setEvent(null)
      }
    }
  }, [])

  const drawNumber = useCallback(async () => {
    if (!event || drawing) return
    const remaining = Array.from({ length: 75 }, (_, i) => i + 1)
      .filter(n => !event.drawn_numbers.includes(n))
    if (remaining.length === 0) { toast.info('Todos os 75 números foram sorteados!'); return }
    const num = remaining[Math.floor(Math.random() * remaining.length)]
    setDrawing(true)
    const supabase = createClient()
    const newDrawnNumbers = [...event.drawn_numbers, num]
    const { error } = await supabase
      .from('events')
      .update({ drawn_numbers: newDrawnNumbers })
      .eq('id', event.id)
    if (error) { toast.error('Erro ao sortear'); setDrawing(false); return }
    setLastDrawn(num)
    await checkAndRegisterWins(newDrawnNumbers, event, cards)
    setDrawing(false)
  }, [event, drawing, cards, checkAndRegisterWins])

  const activateEvent = useCallback(async () => {
    if (!event) return
    const supabase = createClient()
    await supabase.from('events').update({ status: 'active' }).eq('id', event.id)
    setEvent(prev => prev ? { ...prev, status: 'active' } : prev)
    toast.success('Evento iniciado!')
  }, [event])

  const finishEvent = useCallback(async () => {
    if (!event) return
    const supabase = createClient()
    await supabase.from('events').update({ status: 'finished' }).eq('id', event.id)
    setEvent(null)
    toast.success('Evento finalizado!')
  }, [event])

  if (loading) {
    return <div className="text-white/60 text-center py-20 font-display text-2xl">CARREGANDO...</div>
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🎰</div>
        <h2 className="font-display text-white text-3xl mb-2">NENHUM EVENTO ATIVO</h2>
        <p className="text-white/50 mb-6">Crie um novo evento para começar</p>
        <Link href="/admin/setup" className="inline-block bg-[#fcd34d] text-[#5C1F47] font-bold px-6 py-3 rounded-xl hover:bg-yellow-300 transition-colors">
          Criar Evento
        </Link>
      </div>
    )
  }

  const remaining = 75 - event.drawn_numbers.length
  const prizeConditions: PrizeCondition[] = event.prize_conditions ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-white text-4xl">{event.name}</h1>
          <p className="text-white/50 text-sm mt-1">
            {event.drawn_numbers.length} sorteados · {remaining} restantes · {cards.length} cartelas
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {event.status === 'setup' && (
            <button onClick={activateEvent} className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg text-sm hover:bg-green-500/30 transition-colors">
              ▶ Iniciar Sorteio
            </button>
          )}
          <Link href={`/display/${event.id}`} target="_blank" className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors">
            📺 Telão
          </Link>
          <button onClick={finishEvent} className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors">
            Finalizar
          </button>
        </div>
      </div>

      {/* Prêmios / condições */}
      {prizeConditions.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Prêmios do Evento</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {prizeConditions.map((pc, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  pc.won_at
                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                    : 'bg-white/5 border-white/10 text-white/80'
                }`}
              >
                <span className="text-xl">{pc.won_at ? '🏆' : '🎯'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{pc.label}</div>
                  <div className="text-xs opacity-70 truncate">{pc.prize}</div>
                  {pc.won_at && pc.won_by_name && (
                    <div className="text-xs text-green-400 mt-0.5">
                      {pc.won_by_name} ({pc.won_by_card})
                    </div>
                  )}
                </div>
                {!pc.won_at && (
                  <span className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full flex-shrink-0">
                    aberto
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sortear + últimos */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4">
          <p className="text-white/40 text-sm uppercase tracking-widest font-medium">Último Sorteado</p>
          {lastDrawn ? (
            <div className="ball ball-yellow w-28 h-28 flex items-center justify-center font-display text-5xl animate-ball-pop">
              {lastDrawn}
            </div>
          ) : (
            <div className="ball ball-gray w-28 h-28 flex items-center justify-center font-display text-4xl text-gray-400">—</div>
          )}
          <button
            onClick={drawNumber}
            disabled={drawing || remaining === 0 || event.status === 'setup'}
            className="w-full bg-[#fcd34d] hover:bg-yellow-300 disabled:opacity-40 text-[#5C1F47] font-bold py-4 rounded-xl text-xl transition-all active:scale-95"
          >
            {drawing ? '⏳ Sorteando...' : event.status === 'setup' ? '▶ Inicie o evento primeiro' : '🎲 Sortear Número'}
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <p className="text-white/40 text-sm uppercase tracking-widest font-medium mb-4">Últimos Sorteados</p>
          <div className="flex flex-wrap gap-2">
            {[...event.drawn_numbers].reverse().slice(0, 15).map((n, i) => (
              <div key={n} className={`ball w-10 h-10 flex items-center justify-center font-display text-lg ${i === 0 ? 'ball-yellow animate-pulse-ring' : 'ball-purple'}`}>
                {n}
              </div>
            ))}
            {event.drawn_numbers.length === 0 && (
              <p className="text-white/30 text-sm">Nenhum número sorteado ainda</p>
            )}
          </div>
        </div>
      </div>

      {/* Grade 1-75 */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <p className="text-white/40 text-sm uppercase tracking-widest font-medium mb-4">Todos os Números</p>
        <div className="grid grid-cols-[repeat(15,1fr)] gap-1">
          {Array.from({ length: 75 }, (_, i) => i + 1).map(n => (
            <div
              key={n}
              className={`aspect-square flex items-center justify-center rounded text-xs font-bold transition-all ${
                event.drawn_numbers.includes(n) ? 'bg-[#fcd34d] text-[#5C1F47]' : 'bg-white/5 text-white/30'
              }`}
            >
              {n}
            </div>
          ))}
        </div>
      </div>

      {/* BINGO Claims */}
      {claims.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6">
          <p className="text-green-400 text-sm uppercase tracking-widest font-medium mb-4">🏆 BINGO Reclamados</p>
          <div className="space-y-2">
            {claims.map(c => (
              <div key={c.id} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  {c.alphanumeric_code && (
                    <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
                      {c.alphanumeric_code}
                    </span>
                  )}
                  <span className="text-white font-medium">{c.player_name}</span>
                </div>
                <span className="text-white/40">{new Date(c.bingo_claimed_at!).toLocaleTimeString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
