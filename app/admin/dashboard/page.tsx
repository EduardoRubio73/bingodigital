'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, CheckCircle, TrendingUp, CreditCard, DollarSign, CalendarDays } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts'

interface EventStats {
  id: string
  name: string
  status: string
  maxCards: number
  cardsSold: number
  pricePerCard: number
  arrecadado: number
  pendente: number
}

export default function DashboardPage() {
  const [events, setEvents] = useState<EventStats[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name, status, max_cards, cards_sold, price_per_card')
      .order('created_at', { ascending: false })

    if (!eventsData || eventsData.length === 0) { setLoading(false); return }

    const eventIds = eventsData.map(e => e.id)
    const { data: sales } = await supabase
      .from('card_sales')
      .select('event_id, amount_paid, payment_status, quantity')
      .in('event_id', eventIds)

    const statsMap = new Map<string, { arrecadado: number; pendente: number; pricePerCard: number }>()
    for (const ev of eventsData) {
      statsMap.set(ev.id, { arrecadado: 0, pendente: 0, pricePerCard: ev.price_per_card })
    }
    for (const sale of sales ?? []) {
      const s = statsMap.get(sale.event_id)
      if (!s) continue
      if (sale.payment_status === 'pago') {
        s.arrecadado += sale.amount_paid
      } else if (sale.payment_status === 'pendente') {
        s.pendente += sale.quantity * s.pricePerCard
      }
    }

    setEvents(eventsData.map(ev => {
      const s = statsMap.get(ev.id)!
      return {
        id: ev.id,
        name: ev.name,
        status: ev.status,
        maxCards: ev.max_cards,
        cardsSold: ev.cards_sold,
        pricePerCard: ev.price_per_card,
        arrecadado: s.arrecadado,
        pendente: s.pendente,
      }
    }))
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return <div className="text-white/50 text-center py-20">Carregando...</div>
  }

  const totalEventos = events.length
  const totalCartelas = events.reduce((s, e) => s + e.cardsSold, 0)
  const totalArrecadado = events.reduce((s, e) => s + e.arrecadado, 0)
  const totalPendente = events.reduce((s, e) => s + e.pendente, 0)
  const totalEsperado = events.reduce((s, e) => s + e.maxCards * e.pricePerCard, 0)

  const activeEvents = events.filter(e => e.status !== 'finished')
  const finishedEvents = events.filter(e => e.status === 'finished')

  const chartData = events.map(e => ({
    name: e.name.length > 12 ? e.name.slice(0, 12) + '…' : e.name,
    Vendidas: e.cardsSold,
    Restantes: e.maxCards - e.cardsSold,
  }))

  const statusLabel: Record<string, string> = {
    setup: 'Setup',
    active: 'Ativo',
    finished: 'Encerrado',
  }
  const statusColor: Record<string, string> = {
    setup: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    active: 'text-green-400 bg-green-400/10 border-green-400/20',
    finished: 'text-white/30 bg-white/5 border-white/10',
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <h1 className="font-display text-3xl text-white tracking-widest">DASHBOARD</h1>

      {/* Alertas de falta de cartelas — destaque principal */}
      {activeEvents.length > 0 && (
        <div className="space-y-3">
          {activeEvents.map(ev => {
            const vagas = ev.maxCards - ev.cardsSold
            if (vagas === 0) {
              return (
                <div key={ev.id} className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 text-green-300">
                  <CheckCircle size={22} className="flex-shrink-0" />
                  <span>
                    <strong>{ev.name}</strong> — ✅ Todas as cartelas foram vendidas!
                  </span>
                </div>
              )
            }
            const isUrgent = vagas <= 10
            return (
              <div key={ev.id} className={`border rounded-xl p-4 flex items-start gap-3 ${
                isUrgent
                  ? 'bg-red-500/10 border-red-500/40 text-red-300'
                  : 'bg-yellow-400/10 border-yellow-400/30 text-yellow-300'
              }`}>
                <AlertTriangle size={22} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    Faltam <span className="text-2xl font-bold">{vagas}</span> cartela{vagas !== 1 ? 's' : ''} para completar o evento &ldquo;{ev.name}&rdquo;
                  </p>
                  <p className="text-sm opacity-70 mt-0.5">
                    {ev.cardsSold}/{ev.maxCards} vendidas · Receita potencial faltante: {formatCurrency(vagas * ev.pricePerCard)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Cards de resumo geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<CalendarDays size={18} />} label="Total de Eventos" value={String(totalEventos)} color="blue" />
        <SummaryCard icon={<CreditCard size={18} />} label="Cartelas Geradas" value={String(totalCartelas)} color="purple" />
        <SummaryCard icon={<DollarSign size={18} />} label="Total Arrecadado" value={formatCurrency(totalArrecadado)} color="green" />
        <SummaryCard icon={<TrendingUp size={18} />} label="Receita Total Esperada" value={formatCurrency(totalEsperado)} color="yellow" />
      </div>

      {/* Gráfico de vendas por evento */}
      {events.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Cartelas por Evento</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#3a1230', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
              <Bar dataKey="Vendidas" stackId="a" fill="#fcd34d" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Restantes" stackId="a" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela de eventos */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold">Detalhes por Evento</h2>
        </div>
        <div className="divide-y divide-white/5">
          {events.map(ev => {
            const vagas = ev.maxCards - ev.cardsSold
            const pct = ev.maxCards > 0 ? Math.round((ev.cardsSold / ev.maxCards) * 100) : 0
            const esperado = ev.maxCards * ev.pricePerCard

            return (
              <div key={ev.id} className="px-6 py-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-white font-medium">{ev.name}</p>
                    <p className="text-white/40 text-xs">{formatCurrency(ev.pricePerCard)}/cartela</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[ev.status]}`}>
                    {statusLabel[ev.status] ?? ev.status}
                  </span>
                </div>

                {/* Barra de progresso */}
                <div>
                  <div className="flex justify-between text-xs text-white/40 mb-1">
                    <span>{ev.cardsSold}/{ev.maxCards} cartelas ({pct}%)</span>
                    <span>{vagas} restantes</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? '#27ae60' : pct >= 70 ? '#fcd34d' : '#8B2E6F',
                      }}
                    />
                  </div>
                </div>

                {/* Financeiro */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-white/40 text-xs">Esperado</p>
                    <p className="text-white text-sm font-semibold">{formatCurrency(esperado)}</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-2">
                    <p className="text-green-400/60 text-xs">Arrecadado</p>
                    <p className="text-green-400 text-sm font-semibold">{formatCurrency(ev.arrecadado)}</p>
                  </div>
                  <div className="bg-yellow-400/10 rounded-lg p-2">
                    <p className="text-yellow-400/60 text-xs">Pendente</p>
                    <p className="text-yellow-400 text-sm font-semibold">{formatCurrency(ev.pendente)}</p>
                  </div>
                </div>
              </div>
            )
          })}

          {events.length === 0 && (
            <div className="px-6 py-10 text-center text-white/30">
              Nenhum evento criado ainda.
            </div>
          )}
        </div>
      </div>

      {/* Totais gerais */}
      {events.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Totais Gerais</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-white/40 text-xs mb-1">Eventos ativos</p>
              <p className="text-white font-bold text-xl">{activeEvents.length}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs mb-1">Eventos encerrados</p>
              <p className="text-white font-bold text-xl">{finishedEvents.length}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs mb-1">Receita total pendente</p>
              <p className="text-yellow-400 font-bold text-xl">{formatCurrency(totalPendente)}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs mb-1">Receita total arrecadada</p>
              <p className="text-green-400 font-bold text-xl">{formatCurrency(totalArrecadado)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'green' | 'yellow' | 'blue' | 'purple'
}) {
  const colors = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  }
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className={`flex items-center gap-1.5 mb-2 ${colors[color]}`}>
        {icon}
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <div className="text-white font-bold text-lg leading-tight">{value}</div>
    </div>
  )
}
