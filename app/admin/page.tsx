'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { BingoEvent, BingoCard } from '@/lib/supabase/types'
import Link from 'next/link'

export default function AdminDashboard() {
  const [event, setEvent] = useState<BingoEvent | null>(null)
  const [claims, setClaims] = useState<BingoCard[]>([])
  const [drawing, setDrawing] = useState(false)
  const [lastDrawn, setLastDrawn] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchActiveEvent = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('events')
      .select('id, name, status, win_condition, drawn_numbers, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setEvent(data)
    setLoading(false)
  }, [])

  const fetchClaims = useCallback(async (eventId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('cards')
      .select('id, event_id, player_name, numbers, marked_numbers, bingo_claimed_at, created_at')
      .eq('event_id', eventId)
      .not('bingo_claimed_at', 'is', null)
      .order('bingo_claimed_at', { ascending: true })
    setClaims(data ?? [])
  }, [])

  useEffect(() => {
    fetchActiveEvent()
  }, [fetchActiveEvent])

  useEffect(() => {
    if (!event) return
    fetchClaims(event.id)
    const supabase = createClient()
    const channel = supabase
      .channel(`admin-event-${event.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${event.id}` },
        payload => setEvent(payload.new as BingoEvent))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cards', filter: `event_id=eq.${event.id}` },
        () => fetchClaims(event.id))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [event?.id, fetchClaims])

  const drawNumber = useCallback(async () => {
    if (!event || drawing) return
    const remaining = Array.from({ length: 75 }, (_, i) => i + 1)
      .filter(n => !event.drawn_numbers.includes(n))
    if (remaining.length === 0) { toast.info('Todos os 75 números foram sorteados!'); return }
    const num = remaining[Math.floor(Math.random() * remaining.length)]
    setDrawing(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('events')
      .update({ drawn_numbers: [...event.drawn_numbers, num] })
      .eq('id', event.id)
    if (error) { toast.error('Erro ao sortear'); setDrawing(false); return }
    setLastDrawn(num)
    setDrawing(false)
  }, [event, drawing])

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
        <Link
          href="/admin/setup"
          className="inline-block bg-[#fcd34d] text-[#5C1F47] font-bold px-6 py-3 rounded-xl hover:bg-yellow-300 transition-colors"
        >
          Criar Evento
        </Link>
      </div>
    )
  }

  const remaining = 75 - event.drawn_numbers.length

  return (
    <div className="space-y-6">
      {/* Header do evento */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-white text-4xl">{event.name}</h1>
          <p className="text-white/50 text-sm mt-1">
            {event.drawn_numbers.length} sorteados · {remaining} restantes ·{' '}
            <span className="capitalize">{event.win_condition.replace('_', ' ')}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/display/${event.id}`}
            target="_blank"
            className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors"
          >
            📺 Telão
          </Link>
          <button
            onClick={finishEvent}
            className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
          >
            Finalizar
          </button>
        </div>
      </div>

      {/* Número atual + botão sortear */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4">
          <p className="text-white/40 text-sm uppercase tracking-widest font-medium">Último Sorteado</p>
          {lastDrawn ? (
            <div className="ball ball-yellow w-28 h-28 flex items-center justify-center font-display text-5xl animate-ball-pop">
              {lastDrawn}
            </div>
          ) : (
            <div className="ball ball-gray w-28 h-28 flex items-center justify-center font-display text-4xl text-gray-400">
              —
            </div>
          )}
          <button
            onClick={drawNumber}
            disabled={drawing || remaining === 0}
            className="w-full bg-[#fcd34d] hover:bg-yellow-300 disabled:opacity-40 text-[#5C1F47] font-bold py-4 rounded-xl text-xl transition-all active:scale-95"
          >
            {drawing ? '⏳ Sorteando...' : '🎲 Sortear Número'}
          </button>
        </div>

        {/* Últimos sorteados */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <p className="text-white/40 text-sm uppercase tracking-widest font-medium mb-4">Últimos Sorteados</p>
          <div className="flex flex-wrap gap-2">
            {[...event.drawn_numbers].reverse().slice(0, 15).map((n, i) => (
              <div
                key={n}
                className={`ball w-10 h-10 flex items-center justify-center font-display text-lg ${i === 0 ? 'ball-yellow animate-pulse-ring' : 'ball-purple'}`}
              >
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
                event.drawn_numbers.includes(n)
                  ? 'bg-[#fcd34d] text-[#5C1F47]'
                  : 'bg-white/5 text-white/30'
              }`}
            >
              {n}
            </div>
          ))}
        </div>
      </div>

      {/* Claims de BINGO */}
      {claims.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6">
          <p className="text-green-400 text-sm uppercase tracking-widest font-medium mb-4">🏆 BINGO Reclamados</p>
          <div className="space-y-2">
            {claims.map(c => (
              <div key={c.id} className="flex justify-between items-center text-sm">
                <span className="text-white font-medium">{c.player_name}</span>
                <span className="text-white/40">
                  {new Date(c.bingo_claimed_at!).toLocaleTimeString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
