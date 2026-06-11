'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { BingoEvent, BingoCard, PrizeCondition } from '@/lib/supabase/types'
import { checkWinCondition } from '@/lib/utils'
import Link from 'next/link'
import { ChevronDown, RotateCcw } from 'lucide-react'

export default function AdminDashboard() {
  const [events, setEvents] = useState<BingoEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [event, setEvent] = useState<BingoEvent | null>(null)
  const [cards, setCards] = useState<BingoCard[]>([])
  const [claims, setClaims] = useState<BingoCard[]>([])
  const [drawing, setDrawing] = useState(false)
  const [lastDrawn, setLastDrawn] = useState<number | null>(null)
  const [repeating, setRepeating] = useState(false)
  const [loading, setLoading] = useState(true)
  const broadcastRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const fetchEvents = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('events')
      .select('id, name, status, win_condition, drawn_numbers, price_per_card, max_cards, cards_sold, prize_conditions, created_at')
      .order('created_at', { ascending: false })
    setEvents(data ?? [])
    const active = data?.find(e => e.status === 'active' || e.status === 'setup')
    if (active && !selectedEventId) {
      setSelectedEventId(active.id)
      setEvent(active)
    }
    setLoading(false)
  }, [selectedEventId])

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

  useEffect(() => { fetchEvents() }, [fetchEvents])

  useEffect(() => {
    if (!selectedEventId) return
    const ev = events.find(e => e.id === selectedEventId) ?? null
    setEvent(ev)
    if (ev) {
      fetchCards(ev.id)
      fetchClaims(ev.id)
    }
  }, [selectedEventId, events, fetchCards, fetchClaims])

  useEffect(() => {
    if (!event) return
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
      if (cond.won_at !== null) continue

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
        setSelectedEventId('')
        fetchEvents()
      }
    }
  }, [fetchEvents])

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

  // Broadcast repeat signal to the display page via Supabase realtime
  const handleRepeat = useCallback(async () => {
    if (!lastDrawn || repeating || !event) return
    setRepeating(true)
    try {
      const supabase = createClient()
      if (!broadcastRef.current) {
        broadcastRef.current = supabase.channel(`bingo-ctrl-${event.id}`)
        await broadcastRef.current.subscribe()
      }
      await broadcastRef.current.send({
        type: 'broadcast',
        event: 'repeat_tts',
        payload: { number: lastDrawn },
      })
      toast.success(`🔊 Repetindo número ${lastDrawn}`)
    } catch (e) {
      console.error('[Repeat]', e)
      toast.error('Erro ao enviar sinal de repetição')
    } finally {
      setRepeating(false)
    }
  }, [lastDrawn, repeating, event])

  if (loading) {
    return <div className="text-white/60 text-center py-20 font-display text-2xl">CARREGANDO...</div>
  }

  const activeEvents = events.filter(e => e.status !== 'finished')
  const finishedEvents = events.filter(e => e.status === 'finished')
  const isFinished = event?.status === 'finished'

  if (events.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🎰</div>
        <h2 className="font-display text-white text-3xl mb-2">NENHUM EVENTO CADASTRADO</h2>
        <p className="text-white/50 mb-6">Crie um novo evento para começar</p>
        <Link href="/admin/setup" className="inline-block bg-[#fcd34d] text-[#5C1F47] font-bold px-6 py-3 rounded-xl hover:bg-yellow-300 transition-colors">
          Criar Evento
        </Link>
      </div>
    )
  }

  const remaining = event ? 75 - event.drawn_numbers.length : 0
  const prizeConditions: PrizeCondition[] = event?.prize_conditions ?? []

  return (
    <div className="space-y-6">
      {/* Seletor de evento */}
      <div className={`border rounded-2xl p-4 ${isFinished ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
        <label className="text-white/50 text-xs uppercase tracking-widest block mb-2">Evento para Sortear</label>
        <div className="relative">
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className={`w-full border rounded-xl px-4 py-3 text-white focus:outline-none appearance-none pr-10 ${
              isFinished
                ? 'bg-red-500/10 border-red-500/30 focus:border-red-400/50'
                : 'bg-white/10 border-white/20 focus:border-yellow-400/50'
            }`}
          >
            <option value="" className="bg-[#5C1F47]">— Selecione um evento —</option>
            {activeEvents.length > 0 && (
              <optgroup label="▶ Eventos ativos" style={{ background: '#3a1230' }}>
                {activeEvents.map(ev => (
                  <option key={ev.id} value={ev.id} className="bg-[#5C1F47]">
                    {ev.name} · {ev.status === 'setup' ? '⏸ Aguardando início' : '▶ Ativo'} · {ev.drawn_numbers.length} sorteados
                  </option>
                ))}
              </optgroup>
            )}
            {finishedEvents.length > 0 && (
              <optgroup label="🔴 Encerrados" style={{ background: '#3a1230' }}>
                {finishedEvents.map(ev => {
                  const lastWon = ev.prize_conditions?.filter((p: PrizeCondition) => p.won_at).map((p: PrizeCondition) => p.won_at!).sort().at(-1)
                  const dateStr = lastWon ? new Date(lastWon).toLocaleDateString('pt-BR') : new Date(ev.created_at).toLocaleDateString('pt-BR')
                  return (
                    <option key={ev.id} value={ev.id} className="bg-[#2a0a20]">
                      🔴 {ev.name} · Encerrado · {ev.drawn_numbers.length} sorteados · {dateStr}
                    </option>
                  )
                })}
              </optgroup>
            )}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={16} />
        </div>
        {isFinished && (
          <p className="text-red-400/70 text-xs mt-2 flex items-center gap-1">
            🔴 Evento encerrado — somente visualização
          </p>
        )}
      </div>

      {event && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className={`font-display text-4xl ${isFinished ? 'text-red-300' : 'text-white'}`}>{event.name}</h1>
              <p className="text-white/50 text-sm mt-1">
                {event.drawn_numbers.length} sorteados · {isFinished ? 'encerrado' : `${remaining} restantes`} · {cards.length} cartelas
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {!isFinished && event.status === 'setup' && (
                <button onClick={activateEvent} className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg text-sm hover:bg-green-500/30 transition-colors">
                  ▶ Iniciar Sorteio
                </button>
              )}
              <Link href={`/display/${event.id}`} target="_blank" className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors">
                📺 Telão
              </Link>
            </div>
          </div>

          {/* Painel de resultado — apenas para eventos encerrados */}
          {isFinished && (() => {
            const winners = prizeConditions.filter(p => p.won_at)
            const allWonAts = prizeConditions.filter(p => p.won_at).map(p => p.won_at!).sort()
            const finishedAt = allWonAts.at(-1)
            const startedAt = event.created_at
            const winnerCards = cards.filter(c => prizeConditions.some(p => p.won_by_card === (c.alphanumeric_code ?? c.id.slice(0, 6))))
            return (
              <div className="bg-red-500/5 border border-red-500/25 rounded-2xl overflow-hidden">
                {/* Faixa de encerramento */}
                <div className="bg-red-500/15 border-b border-red-500/20 px-6 py-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 text-lg">🔴</span>
                    <span className="text-red-300 font-bold text-sm uppercase tracking-widest">Evento Encerrado</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span>📅 Criado: {new Date(startedAt).toLocaleDateString('pt-BR')} às {new Date(startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    {finishedAt && (
                      <span>🏁 Encerrado: {new Date(finishedAt).toLocaleDateString('pt-BR')} às {new Date(finishedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Ganhadores */}
                  {winners.length > 0 && (
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-widest mb-3">🏆 Ganhadores</p>
                      <div className="space-y-3">
                        {winners.map((pc, i) => {
                          const card = cards.find(c => (c.alphanumeric_code ?? c.id.slice(0, 6)) === pc.won_by_card)
                          return (
                            <div key={i} className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-5 py-4">
                              <div className="flex items-start justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">🏆</span>
                                  <div>
                                    <div className="text-yellow-300 font-bold text-base">{pc.won_by_name}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {pc.won_by_card && (
                                        <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
                                          Cartela {pc.won_by_card}
                                        </span>
                                      )}
                                      <span className="text-xs text-white/50">{pc.label} — {pc.prize}</span>
                                    </div>
                                  </div>
                                </div>
                                {pc.won_at && (
                                  <div className="text-xs text-white/35 text-right">
                                    <div>{new Date(pc.won_at).toLocaleDateString('pt-BR')}</div>
                                    <div className="text-white/50 font-mono">{new Date(pc.won_at).toLocaleTimeString('pt-BR')}</div>
                                  </div>
                                )}
                              </div>
                              {/* Cartela do ganhador */}
                              {card && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                  <p className="text-white/30 text-xs mb-2">Cartela sorteada:</p>
                                  <div className="grid grid-cols-5 gap-1 max-w-xs">
                                    {card.numbers.map((n, idx) => (
                                      <div
                                        key={idx}
                                        className={`aspect-square flex items-center justify-center rounded text-xs font-bold font-display ${
                                          event.drawn_numbers.includes(n)
                                            ? 'bg-yellow-400 text-[#3a1230]'
                                            : 'bg-white/10 text-white/40'
                                        }`}
                                      >
                                        {n}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Resumo */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: 'Números sorteados', value: event.drawn_numbers.length },
                      { label: 'Cartelas participantes', value: cards.length },
                      { label: 'Prêmios entregues', value: winners.length },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white/5 border border-white/10 rounded-xl py-3 px-2">
                        <div className="text-white font-bold text-2xl font-display">{value}</div>
                        <div className="text-white/35 text-xs mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Prêmios / condições — apenas para eventos ativos */}
          {!isFinished && prizeConditions.length > 0 && (
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

          {/* Sortear + últimos — oculto para eventos encerrados */}
          {!isFinished && <div className="grid md:grid-cols-2 gap-6">
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
              {lastDrawn && (
                <button
                  onClick={handleRepeat}
                  disabled={repeating}
                  className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm transition-all active:scale-95"
                >
                  <RotateCcw size={15} className={repeating ? 'animate-spin' : ''} />
                  {repeating ? 'Enviando...' : `Repetir número ${lastDrawn} no telão`}
                </button>
              )}
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
          </div>}

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
        </>
      )}
    </div>
  )
}
