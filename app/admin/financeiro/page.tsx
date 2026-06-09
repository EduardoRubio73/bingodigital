'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BingoEvent, CardSale } from '@/lib/supabase/types'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, Users, Trophy, TrendingUp, Clock, CheckCircle } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'finished' | 'setup'>('all')

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
      const evSales = allSales.filter(s => s.event_id === ev.id && s.payment_status !== 'cancelado')
      const canceledSales = allSales.filter(s => s.event_id === ev.id && s.payment_status === 'cancelado')
      const received = evSales.filter(s => s.payment_status === 'pago').reduce((sum, s) => sum + s.amount_paid, 0)
      const pendingSales = evSales.filter(s => s.payment_status === 'pendente')
      const pending = pendingSales.reduce((sum, s) => sum + s.quantity * ev.price_per_card, 0)
      const expected = ev.cards_sold * ev.price_per_card
      const paymentRate = expected > 0 ? Math.round((received / expected) * 100) : 0

      return {
        ...ev,
        sales: allSales.filter(s => s.event_id === ev.id),
        totalExpected: expected,
        totalReceived: received,
        totalPending: pending,
        totalCanceled: canceledSales.reduce((sum, s) => sum + s.quantity * ev.price_per_card, 0),
        paymentRate,
      }
    })

    setData(financials)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = filter === 'all' ? data : data.filter(d => d.status === filter)

  const globalReceived = data.reduce((sum, d) => sum + d.totalReceived, 0)
  const globalPending = data.reduce((sum, d) => sum + d.totalPending, 0)
  const globalExpected = data.reduce((sum, d) => sum + d.totalExpected, 0)
  const totalCards = data.reduce((sum, d) => sum + d.cards_sold, 0)
  const maxBarsValue = Math.max(...filtered.map(d => d.totalExpected), 1)

  if (loading) return <div className="text-white/60 text-center py-20 font-display text-2xl">CARREGANDO...</div>

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="font-display text-3xl text-white tracking-widest">FINANCEIRO</h1>

      {/* Cards de resumo global */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<Trophy size={18} />} label="Total de Eventos" value={String(data.length)} color="blue" />
        <SummaryCard icon={<Users size={18} />} label="Cartelas Vendidas" value={String(totalCards)} color="purple" />
        <SummaryCard icon={<CheckCircle size={18} />} label="Total Recebido" value={formatCurrency(globalReceived)} color="green" />
        <SummaryCard icon={<Clock size={18} />} label="A Receber" value={formatCurrency(globalPending)} color="yellow" />
      </div>

      {/* Barra de receita geral */}
      {globalExpected > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Receita Global</span>
            <span className="text-white text-sm font-medium">
              {formatCurrency(globalReceived)} / {formatCurrency(globalExpected)}
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.round((globalReceived / globalExpected) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-white/30">
            <span>{Math.round((globalReceived / globalExpected) * 100)}% recebido</span>
            <span className="text-yellow-400">{formatCurrency(globalPending)} pendente</span>
          </div>
        </div>
      )}

      {/* Gráfico de barras por evento */}
      {filtered.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-white/60 text-sm mb-5 flex items-center gap-2">
            <TrendingUp size={16} /> Receita por Evento
          </p>
          <div className="space-y-3">
            {filtered.slice(0, 10).map(ev => (
              <div key={ev.id}>
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span className="truncate max-w-[60%]">{ev.name}</span>
                  <span>{formatCurrency(ev.totalReceived)} / {formatCurrency(ev.totalExpected)}</span>
                </div>
                <div className="h-5 bg-white/10 rounded-full overflow-hidden relative">
                  {/* Barra de esperado */}
                  <div
                    className="absolute inset-y-0 left-0 bg-white/10 rounded-full"
                    style={{ width: `${(ev.totalExpected / maxBarsValue) * 100}%` }}
                  />
                  {/* Barra de recebido */}
                  <div
                    className="absolute inset-y-0 left-0 bg-green-400 rounded-full"
                    style={{ width: `${(ev.totalReceived / maxBarsValue) * 100}%` }}
                  />
                  {/* Barra de pendente sobre a base */}
                  {ev.totalPending > 0 && (
                    <div
                      className="absolute inset-y-0 bg-yellow-400/40 rounded-full"
                      style={{
                        left: `${(ev.totalReceived / maxBarsValue) * 100}%`,
                        width: `${(ev.totalPending / maxBarsValue) * 100}%`,
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 text-xs text-white/40">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Recebido</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400/40 inline-block" /> Pendente</span>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {(['all', 'active', 'setup', 'finished'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === f ? 'bg-yellow-400 text-black font-bold' : 'bg-white/10 text-white/60 hover:text-white'
            }`}
          >
            {{ all: 'Todos', active: 'Ativos', setup: 'Configuração', finished: 'Encerrados' }[f]}
          </button>
        ))}
      </div>

      {/* Tabela de eventos */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <DollarSign size={18} className="text-yellow-400" />
            Detalhamento por Evento ({filtered.length})
          </h2>
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-white/30">Nenhum evento encontrado.</div>
        )}

        <div className="divide-y divide-white/5">
          {filtered.map(ev => {
            const wonConditions = ev.prize_conditions.filter(pc => pc.won_at !== null)
            return (
              <div key={ev.id} className="px-6 py-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{ev.name}</span>
                      <StatusBadge status={ev.status} />
                    </div>
                    <div className="text-white/40 text-xs mt-0.5">
                      {new Date(ev.created_at).toLocaleDateString('pt-BR')} ·{' '}
                      {ev.cards_sold}/{ev.max_cards} cartelas · {formatCurrency(ev.price_per_card)}/un
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-green-400 font-bold">{formatCurrency(ev.totalReceived)}</div>
                    <div className="text-white/30 text-xs">{formatCurrency(ev.totalExpected)} esperado</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="text-green-400">{ev.paymentRate}% pago</span>
                  {ev.totalPending > 0 && <span className="text-yellow-400">{formatCurrency(ev.totalPending)} pendente</span>}
                  {ev.totalCanceled > 0 && <span className="text-red-400">{formatCurrency(ev.totalCanceled)} cancelado</span>}
                  <span className="text-white/30">{ev.sales.length} vendas</span>
                </div>

                {wonConditions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {wonConditions.map((pc, i) => (
                      <span key={i} className="text-xs bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                        🏆 {pc.label}: {pc.won_by_name} — {pc.prize}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'green' | 'yellow' | 'blue' | 'purple'
}) {
  const colors = { green: 'text-green-400', yellow: 'text-yellow-400', blue: 'text-blue-400', purple: 'text-purple-400' }
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className={`flex items-center gap-1.5 mb-2 ${colors[color]}`}>
        {icon}
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <div className="text-white font-bold text-lg">{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    active: 'bg-green-500/20 text-green-300 border-green-500/30',
    setup: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    finished: 'bg-white/10 text-white/40 border-white/10',
  }[status] ?? 'bg-white/10 text-white/40 border-white/10'
  const label = { active: 'Ativo', setup: 'Configuração', finished: 'Encerrado' }[status] ?? status
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg}`}>{label}</span>
  )
}
