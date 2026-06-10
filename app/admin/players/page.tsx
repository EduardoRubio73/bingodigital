'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, Send, Copy, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import type { BingoCard, PaymentStatus } from '@/lib/supabase/types'

interface SaleGroup {
  saleId: string
  eventId: string
  eventName: string
  eventStatus: string
  paymentStatus: PaymentStatus
  cards: BingoCard[]
}

interface PlayerGroup {
  name: string
  contact: string
  sales: SaleGroup[]
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerGroup[]>([])
  const [historyPlayers, setHistoryPlayers] = useState<PlayerGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => { setBaseUrl(window.location.origin) }, [])

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const { data: sales } = await supabase
      .from('card_sales')
      .select('id, buyer_name, buyer_contact, event_id, payment_status')
      .order('created_at', { ascending: false })

    if (!sales || sales.length === 0) { setLoading(false); return }

    const eventIds = Array.from(new Set(sales.map(s => s.event_id)))
    const { data: events } = await supabase
      .from('events')
      .select('id, name, status')
      .in('id', eventIds)

    const saleIds = sales.map(s => s.id)
    const { data: allCards } = await supabase
      .from('cards')
      .select('id, event_id, player_name, numbers, marked_numbers, bingo_claimed_at, alphanumeric_code, sale_id, sequence_number, created_at')
      .in('sale_id', saleIds)

    const eventMap = new Map((events ?? []).map(e => [e.id, e]))
    const cardsBySale = new Map<string, BingoCard[]>()
    for (const card of allCards ?? []) {
      if (!card.sale_id) continue
      const arr = cardsBySale.get(card.sale_id) ?? []
      arr.push(card)
      cardsBySale.set(card.sale_id, arr)
    }

    // Agrupa por contato (WhatsApp)
    const playerMap = new Map<string, PlayerGroup>()
    for (const sale of sales) {
      const key = sale.buyer_contact ?? sale.buyer_name
      const event = eventMap.get(sale.event_id)
      if (!event) continue

      const saleGroup: SaleGroup = {
        saleId: sale.id,
        eventId: sale.event_id,
        eventName: event.name,
        eventStatus: event.status,
        paymentStatus: (sale as { payment_status: PaymentStatus }).payment_status ?? 'pendente',
        cards: cardsBySale.get(sale.id) ?? [],
      }

      if (playerMap.has(key)) {
        playerMap.get(key)!.sales.push(saleGroup)
      } else {
        playerMap.set(key, {
          name: sale.buyer_name,
          contact: sale.buyer_contact ?? '',
          sales: [saleGroup],
        })
      }
    }

    const allPlayers = Array.from(playerMap.values())
    setPlayers(allPlayers.filter(p => p.sales.some(s => s.eventStatus !== 'finished')))
    setHistoryPlayers(allPlayers.filter(p => p.sales.every(s => s.eventStatus === 'finished')))
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleExpand = useCallback((key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const copyLink = useCallback(async (url: string, key: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const sendWhatsApp = useCallback((contact: string, playerName: string, saleGroup: SaleGroup) => {
    const raw = contact.replace(/\D/g, '')
    const phone = raw.startsWith('55') ? raw : `55${raw}`
    const url = `${baseUrl}/play/${saleGroup.saleId}`
    const msg = encodeURIComponent(
      `Olá ${playerName}! 🎱\nSuas cartelas de Bingo para o evento "${saleGroup.eventName}":\n${url}\n\nToque nos números sorteados para marcar! Boa sorte! 🍀`
    )
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
  }, [baseUrl])

  if (loading) {
    return <div className="text-white/60 text-center py-20 font-display text-2xl">CARREGANDO...</div>
  }

  if (players.length === 0 && historyPlayers.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="font-display text-white text-3xl mb-4">NENHUM JOGADOR</h2>
        <Link href="/admin/vendas" className="inline-block bg-[#fcd34d] text-[#5C1F47] font-bold px-6 py-3 rounded-xl">
          Registrar Vendas
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-white text-4xl">JOGADORES</h1>
        <p className="text-white/50 mt-1">{players.length} jogador(es) com eventos ativos</p>
      </div>

      {/* Jogadores com eventos ativos */}
      <div className="space-y-3">
        {players.map(player => {
          const playerKey = player.contact || player.name
          const isOpen = expanded.has(playerKey)
          const totalCards = player.sales.reduce((s, g) => s + g.cards.length, 0)
          const activeSales = player.sales.filter(s => s.eventStatus !== 'finished')

          return (
            <div key={playerKey} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Header do jogador */}
              <button
                onClick={() => toggleExpand(playerKey)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-[#fcd34d]/20 border border-[#fcd34d]/40 flex items-center justify-center font-display text-[#fcd34d] text-lg flex-shrink-0">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{player.name}</p>
                    {player.contact && <p className="text-white/40 text-xs">{player.contact}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-full">
                    {totalCards} cartela{totalCards !== 1 ? 's' : ''}
                  </span>
                  {isOpen ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                </div>
              </button>

              {/* Conteúdo expandido */}
              {isOpen && (
                <div className="border-t border-white/10 divide-y divide-white/5">
                  {activeSales.map(sg => {
                    const playUrl = `${baseUrl}/play/${sg.saleId}`
                    const copyKey = sg.saleId

                    return (
                      <div key={sg.saleId} className="px-5 py-4 space-y-3">
                        {/* Nome do evento */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium text-sm">{sg.eventName}</p>
                            <p className="text-white/40 text-xs">{sg.cards.length} cartela{sg.cards.length !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${
                              sg.paymentStatus === 'pago'
                                ? 'text-green-400 bg-green-400/10 border-green-400/20'
                                : sg.paymentStatus === 'cancelado'
                                  ? 'text-red-400 bg-red-400/10 border-red-400/20'
                                  : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                            }`}>
                              {sg.paymentStatus === 'pago' ? '✓ Pago' : sg.paymentStatus === 'cancelado' ? '✗ Cancelado' : '⏳ Pendente'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${
                              sg.eventStatus === 'active'
                                ? 'text-green-400 bg-green-400/10 border-green-400/20'
                                : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                            }`}>
                              {sg.eventStatus === 'active' ? 'Ativo' : 'Setup'}
                            </span>
                          </div>
                        </div>

                        {/* Carrossel de preview das cartelas */}
                        {sg.cards.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                            {sg.cards.map(card => (
                              <div
                                key={card.id}
                                className="flex-shrink-0 w-14 h-14 rounded-xl bg-[#5C1F47] border border-[#fcd34d]/30 flex items-center justify-center"
                              >
                                <span className="text-[#fcd34d] font-bold text-xs text-center leading-tight">
                                  {card.alphanumeric_code ?? `#${card.sequence_number}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Botão Enviar Link + copiar */}
                        <div className="space-y-2">
                          {player.contact ? (
                            <button
                              onClick={() => sendWhatsApp(player.contact, player.name, sg)}
                              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                            >
                              <Send size={15} />
                              Enviar via WhatsApp
                            </button>
                          ) : (
                            <p className="text-yellow-400/70 text-xs text-center">Sem WhatsApp cadastrado — copie o link abaixo</p>
                          )}

                          <div className="flex gap-2">
                            <input
                              readOnly
                              value={playUrl}
                              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/50 text-xs font-mono truncate focus:outline-none"
                            />
                            <button
                              onClick={() => copyLink(playUrl, copyKey)}
                              className="flex-shrink-0 flex items-center gap-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs transition-colors"
                            >
                              {copied === copyKey ? <CheckCheck size={13} className="text-green-400" /> : <Copy size={13} />}
                              {copied === copyKey ? 'Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Histórico — eventos finalizados */}
      {historyPlayers.length > 0 && (
        <div>
          <button
            onClick={() => toggleExpand('__history__')}
            className="flex items-center gap-2 text-white/40 hover:text-white/60 text-sm transition-colors mb-3"
          >
            {expanded.has('__history__') ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Histórico ({historyPlayers.length} jogador{historyPlayers.length !== 1 ? 'es' : ''} em eventos encerrados)
          </button>

          {expanded.has('__history__') && (
            <div className="space-y-2 opacity-60">
              {historyPlayers.map(player => {
                const playerKey = `hist-${player.contact || player.name}`
                const isOpen = expanded.has(playerKey)
                const totalCards = player.sales.reduce((s, g) => s + g.cards.length, 0)

                return (
                  <div key={playerKey} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleExpand(playerKey)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
                    >
                      <div className="text-left">
                        <p className="text-white/70 font-medium text-sm">{player.name}</p>
                        {player.contact && <p className="text-white/30 text-xs">{player.contact}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/30">{totalCards} cartela{totalCards !== 1 ? 's' : ''}</span>
                        {isOpen ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-white/10 divide-y divide-white/5">
                        {player.sales.map(sg => (
                          <div key={sg.saleId} className="px-5 py-3">
                            <p className="text-white/50 text-sm font-medium">{sg.eventName}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {sg.cards.map(card => (
                                <span key={card.id} className="text-xs bg-white/5 text-white/30 px-2 py-0.5 rounded font-mono border border-white/10">
                                  {card.alphanumeric_code ?? `#${card.sequence_number}`}
                                  {card.bingo_claimed_at && ' 🏆'}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
