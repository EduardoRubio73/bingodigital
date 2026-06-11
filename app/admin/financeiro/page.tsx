'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BingoEvent, CardSale } from '@/lib/supabase/types'
import { formatCurrency } from '@/lib/utils'
import {
  DollarSign, Trophy, TrendingUp, Clock, CheckCircle, XCircle,
  ChevronDown, ChevronUp, CreditCard, Calendar, Award,
} from 'lucide-react'
import {
  listSponsorSales, updateSponsorSaleStatus,
  type SponsorSale, type SponsorPaymentStatus,
} from '@/lib/sponsors'

interface EventFinancials extends BingoEvent {
  sales: CardSale[]
  totalExpected: number
  totalReceived: number
  totalPending: number
  totalCanceled: number
  paymentRate: number
}

export default function FinanceiroPage() {
  const [data, setData] = useState<EventFinancials[]>([])
  const [sponsorSales, setSponsorSales] = useState<SponsorSale[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'finished' | 'setup'>('all')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: events } = await supabase
      .from('events')
      .select('id, name, status, win_condition, drawn_numbers, price_per_card, max_cards, cards_sold, prize_conditions, created_at')
      .order('created_at', { ascending: false })

    if (!events) { setLoading(false); return }

    const { data: sales } = await supabase
      .from('card_sales')
      .select('id, event_id, buyer_name, buyer_contact, quantity, amount_paid, payment_method, payment_status, registered_by, notes, created_at')

    const allSales: CardSale[] = sales ?? []

    const financials: EventFinancials[] = events.map(ev => {
      const evSales = allSales.filter(s => s.event_id === ev.id)
      const received = evSales
        .filter(s => s.payment_status === 'pago')
        .reduce((sum, s) => sum + s.amount_paid, 0)
      const pending = evSales
        .filter(s => s.payment_status === 'pendente')
        .reduce((sum, s) => sum + s.quantity * ev.price_per_card, 0)
      const canceled = evSales
        .filter(s => s.payment_status === 'cancelado')
        .reduce((sum, s) => sum + s.quantity * ev.price_per_card, 0)
      const expected = ev.cards_sold * ev.price_per_card
      const paymentRate = expected > 0 ? Math.round((received / expected) * 100) : 0

      return {
        ...ev,
        sales: evSales,
        totalExpected: expected,
        totalReceived: received,
        totalPending: pending,
        totalCanceled: canceled,
        paymentRate,
      }
    })

    setData(financials)

    try {
      const ss = await listSponsorSales()
      setSponsorSales(ss)
    } catch (_) {
      // migration ainda não aplicada
    }

    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleExpand = useCallback((id: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const filtered = filter === 'all' ? data : data.filter(d => d.status === filter)

  const sponsorRecebido = sponsorSales.filter(s => s.payment_status === 'pago').reduce((sum, s) => sum + s.amount, 0)
  const sponsorPendente = sponsorSales.filter(s => s.payment_status === 'pendente').reduce((sum, s) => sum + s.amount, 0)

  const handleUpdateSponsorStatus = useCallback(async (id: string, status: SponsorPaymentStatus) => {
    try {
      await updateSponsorSaleStatus(id, status)
      setSponsorSales(prev => prev.map(s => s.id === id ? { ...s, payment_status: status } : s))
    } catch (e) {
      console.error('[SponsorStatus]', e)
    }
  }, [])

  const globalReceived = data.reduce((sum, d) => sum + d.totalReceived, 0)
  const globalPending = data.reduce((sum, d) => sum + d.totalPending, 0)
  const globalCanceled = data.reduce((sum, d) => sum + d.totalCanceled, 0)
  const globalExpected = data.reduce((sum, d) => sum + d.totalExpected, 0)
  const totalCards = data.reduce((sum, d) => sum + d.cards_sold, 0)
  const globalRate = globalExpected > 0 ? Math.round((globalReceived / globalExpected) * 100) : 0
  const pendingRate = globalExpected > 0 ? Math.round((globalPending / globalExpected) * 100) : 0

  if (loading) return <div className="text-white/60 text-center py-20 font-display text-2xl">CARREGANDO...</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl text-white tracking-widest">FINANCEIRO</h1>
        <div className="text-white/30 text-xs uppercase tracking-widest">
          {data.length} evento{data.length !== 1 ? 's' : ''} · {totalCards} cartelas
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<CheckCircle size={16} />}
          label="Total Recebido"
          value={formatCurrency(globalReceived)}
          sub={`${globalRate}% do esperado`}
          color="green"
          highlight
        />
        <KpiCard
          icon={<Clock size={16} />}
          label="A Receber"
          value={formatCurrency(globalPending)}
          sub={`${pendingRate}% pendente`}
          color="yellow"
        />
        <KpiCard
          icon={<DollarSign size={16} />}
          label="Receita Total"
          value={formatCurrency(globalExpected)}
          sub="cartelas emitidas"
          color="blue"
        />
        {globalCanceled > 0 ? (
          <KpiCard
            icon={<XCircle size={16} />}
            label="Cancelados"
            value={formatCurrency(globalCanceled)}
            sub="vendas canceladas"
            color="red"
          />
        ) : (
          <KpiCard
            icon={<Trophy size={16} />}
            label="Eventos"
            value={String(data.length)}
            sub={`${data.filter(d => d.status === 'active').length} ativo(s)`}
            color="purple"
          />
        )}
      </div>

      {/* Patrocínios */}
      {sponsorSales.length > 0 && (
        <div className="bg-white/5 border border-yellow-400/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-yellow-400" />
              <span className="text-white font-semibold">Patrocínios ({sponsorSales.length})</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-400 font-semibold">{formatCurrency(sponsorRecebido)} recebido</span>
              <span className="text-yellow-400">{formatCurrency(sponsorPendente)} pendente</span>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {sponsorSales.map(ss => {
              const scfg = {
                pago:      { color: 'text-green-400 bg-green-400/10 border-green-400/20',   icon: <CheckCircle size={11} />, label: 'Pago' },
                pendente:  { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: <Clock size={11} />,        label: 'Pendente' },
                cancelado: { color: 'text-red-400 bg-red-400/10 border-red-400/20',          icon: <XCircle size={11} />,      label: 'Cancelado' },
              }[ss.payment_status]
              const tierLabel: Record<string, string> = { simples: 'Simples', destaque: 'Destaque', personalizado: 'Personalizado' }
              return (
                <div key={ss.id} className="px-5 py-3 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{ss.sponsor_name}</div>
                    <div className="text-white/40 text-xs mt-0.5">
                      {tierLabel[ss.tier] ?? ss.tier} · {ss.payment_method?.toUpperCase()} · {new Date(ss.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-white font-semibold text-sm">{formatCurrency(ss.amount)}</div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${scfg.color}`}>
                    {scfg.icon} {scfg.label}
                  </div>
                  {ss.payment_status === 'pendente' && (
                    <button
                      onClick={() => handleUpdateSponsorStatus(ss.id, 'pago')}
                      className="text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 px-3 py-1 rounded-lg transition-colors"
                    >
                      Marcar Pago
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Barra de progresso global */}
      {globalExpected > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60 text-sm flex items-center gap-1.5">
              <TrendingUp size={14} className="text-yellow-400" />
              Progresso Global de Recebimento
            </span>
            <span className="text-white font-bold text-sm">
              {formatCurrency(globalReceived)}<span className="text-white/30 font-normal"> / {formatCurrency(globalExpected)}</span>
            </span>
          </div>

          {/* Barra segmentada */}
          <div className="h-4 bg-white/10 rounded-full overflow-hidden flex">
            {globalReceived > 0 && (
              <div
                className="h-full bg-green-400 transition-all"
                style={{ width: `${Math.min(100, (globalReceived / globalExpected) * 100)}%` }}
              />
            )}
            {globalPending > 0 && (
              <div
                className="h-full bg-yellow-400/60 transition-all"
                style={{ width: `${Math.min(100 - (globalReceived / globalExpected) * 100, (globalPending / globalExpected) * 100)}%` }}
              />
            )}
          </div>

          <div className="flex items-center gap-5 mt-3 flex-wrap text-xs">
            <span className="flex items-center gap-1.5 text-green-400">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
              Recebido {globalRate}% · {formatCurrency(globalReceived)}
            </span>
            <span className="flex items-center gap-1.5 text-yellow-400">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60 inline-block" />
              Pendente {pendingRate}% · {formatCurrency(globalPending)}
            </span>
            {globalCanceled > 0 && (
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/60 inline-block" />
                Cancelado · {formatCurrency(globalCanceled)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'active', 'setup', 'finished'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === f ? 'bg-yellow-400 text-black font-bold' : 'bg-white/10 text-white/60 hover:text-white'
            }`}
          >
            {{ all: `Todos (${data.length})`, active: `Ativos (${data.filter(d => d.status === 'active').length})`, setup: `Setup (${data.filter(d => d.status === 'setup').length})`, finished: `Encerrados (${data.filter(d => d.status === 'finished').length})` }[f]}
          </button>
        ))}
      </div>

      {/* Cards de evento */}
      {filtered.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-white/30">
          Nenhum evento encontrado.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(ev => {
          const isExpanded = expandedEvents.has(ev.id)
          const wonConditions = ev.prize_conditions?.filter(pc => pc.won_at !== null) ?? []
          const receivedPct = ev.totalExpected > 0 ? (ev.totalReceived / ev.totalExpected) * 100 : 0
          const pendingPct = ev.totalExpected > 0 ? (ev.totalPending / ev.totalExpected) * 100 : 0
          const pagoSales = ev.sales.filter(s => s.payment_status === 'pago')
          const pendenteSales = ev.sales.filter(s => s.payment_status === 'pendente')
          const canceladoSales = ev.sales.filter(s => s.payment_status === 'cancelado')

          return (
            <div key={ev.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Header do card */}
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{ev.name}</span>
                    <StatusBadge status={ev.status} />
                  </div>
                  <div className="flex items-center gap-2 text-white/30 text-xs">
                    <Calendar size={12} />
                    {new Date(ev.created_at).toLocaleDateString('pt-BR')}
                    <span className="mx-1">·</span>
                    <CreditCard size={12} />
                    {ev.cards_sold}/{ev.max_cards} cartelas · {formatCurrency(ev.price_per_card)}/un
                  </div>
                </div>

                {/* Valores principais */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-400/8 border border-green-400/15 rounded-xl px-3 py-2.5">
                    <div className="text-green-400 text-xs mb-0.5 flex items-center gap-1">
                      <CheckCircle size={11} /> Recebido
                    </div>
                    <div className="text-white font-bold text-base">{formatCurrency(ev.totalReceived)}</div>
                    <div className="text-white/30 text-xs">{pagoSales.length} venda{pagoSales.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="bg-yellow-400/8 border border-yellow-400/15 rounded-xl px-3 py-2.5">
                    <div className="text-yellow-400 text-xs mb-0.5 flex items-center gap-1">
                      <Clock size={11} /> Pendente
                    </div>
                    <div className="text-white font-bold text-base">{formatCurrency(ev.totalPending)}</div>
                    <div className="text-white/30 text-xs">{pendenteSales.length} venda{pendenteSales.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div className={`border rounded-xl px-3 py-2.5 ${ev.totalCanceled > 0 ? 'bg-red-400/8 border-red-400/15' : 'bg-white/5 border-white/10'}`}>
                    <div className={`text-xs mb-0.5 flex items-center gap-1 ${ev.totalCanceled > 0 ? 'text-red-400' : 'text-white/30'}`}>
                      <XCircle size={11} /> Cancelado
                    </div>
                    <div className="text-white font-bold text-base">{formatCurrency(ev.totalCanceled)}</div>
                    <div className="text-white/30 text-xs">{canceladoSales.length} venda{canceladoSales.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>

                {/* Barra de progresso do evento */}
                {ev.totalExpected > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-white/40 mb-1.5">
                      <span>{ev.paymentRate}% recebido</span>
                      <span>{formatCurrency(ev.totalReceived)} / {formatCurrency(ev.totalExpected)}</span>
                    </div>
                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden flex">
                      {ev.totalReceived > 0 && (
                        <div className="h-full bg-green-400 transition-all" style={{ width: `${Math.min(100, receivedPct)}%` }} />
                      )}
                      {ev.totalPending > 0 && (
                        <div className="h-full bg-yellow-400/60 transition-all" style={{ width: `${Math.min(100 - receivedPct, pendingPct)}%` }} />
                      )}
                    </div>
                  </div>
                )}

                {/* Prêmios ganhos */}
                {wonConditions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {wonConditions.map((pc, i) => (
                      <span key={i} className="text-xs bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full">
                        🏆 {pc.label}: {pc.won_by_name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Botão expandir */}
                {ev.sales.length > 0 && (
                  <button
                    onClick={() => toggleExpand(ev.id)}
                    className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors w-full pt-1"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? 'Ocultar' : 'Ver'} {ev.sales.length} venda{ev.sales.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>

              {/* Tabela de vendas expandida */}
              {isExpanded && ev.sales.length > 0 && (
                <div className="border-t border-white/10">
                  <div className="px-5 py-2 bg-white/5 grid grid-cols-[1fr_auto_auto_auto] gap-3 text-xs text-white/30 uppercase tracking-wider">
                    <span>Comprador</span>
                    <span className="text-right">Qtd</span>
                    <span className="text-right">Valor</span>
                    <span className="text-right">Status</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {ev.sales.map(sale => {
                      const scfg = {
                        pago: { color: 'text-green-400 bg-green-400/10 border-green-400/20', label: 'Pago', icon: <CheckCircle size={11} /> },
                        pendente: { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', label: 'Pendente', icon: <Clock size={11} /> },
                        cancelado: { color: 'text-red-400 bg-red-400/10 border-red-400/20', label: 'Cancelado', icon: <XCircle size={11} /> },
                      }[sale.payment_status]
                      return (
                        <div key={sale.id} className="px-5 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
                          <div>
                            <div className="text-white text-sm">{sale.buyer_name}</div>
                            {sale.buyer_contact && <div className="text-white/30 text-xs">{sale.buyer_contact}</div>}
                            <div className="text-white/20 text-xs mt-0.5">
                              {new Date(sale.created_at).toLocaleDateString('pt-BR')} · {sale.payment_method ?? '—'}
                            </div>
                          </div>
                          <div className="text-white/60 text-sm text-right">{sale.quantity}×</div>
                          <div className="text-white text-sm font-medium text-right">
                            {formatCurrency(sale.quantity * ev.price_per_card)}
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${scfg.color}`}>
                            {scfg.icon} {scfg.label}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, sub, color, highlight }: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color: 'green' | 'yellow' | 'blue' | 'purple' | 'red'
  highlight?: boolean
}) {
  const colors = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    red: 'text-red-400',
  }
  const borders = {
    green: 'border-green-400/20',
    yellow: 'border-yellow-400/20',
    blue: 'border-blue-400/20',
    purple: 'border-purple-400/20',
    red: 'border-red-400/20',
  }
  return (
    <div className={`bg-white/5 border rounded-xl p-4 ${highlight ? borders[color] : 'border-white/10'}`}>
      <div className={`flex items-center gap-1.5 mb-2 ${colors[color]}`}>
        {icon}
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <div className="text-white font-bold text-lg leading-none mb-1">{value}</div>
      <div className="text-white/30 text-xs">{sub}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    active: 'bg-green-500/20 text-green-300 border-green-500/30',
    setup: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    finished: 'bg-white/10 text-white/40 border-white/10',
  }[status] ?? 'bg-white/10 text-white/40 border-white/10'
  const label = { active: 'Ativo', setup: 'Setup', finished: 'Encerrado' }[status] ?? status
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg}`}>{label}</span>
  )
}

