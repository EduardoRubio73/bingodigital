'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Users, DollarSign, CreditCard, AlertCircle, ChevronDown, CheckCircle, XCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { generateCardNumbers, generateAlphanumericCode, formatCurrency } from '@/lib/utils'
import type { BingoEvent, CardSale, BingoCard, PaymentMethod, PaymentStatus } from '@/lib/supabase/types'

type SaleWithCards = CardSale & { cards: BingoCard[] }

export default function VendasPage() {
  const [events, setEvents] = useState<BingoEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [sales, setSales] = useState<SaleWithCards[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [buyerName, setBuyerName] = useState('')
  const [buyerContact, setBuyerContact] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pendente')
  const [notes, setNotes] = useState('')

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name, status, price_per_card, max_cards, cards_sold, prize_conditions, win_condition, drawn_numbers, created_at')
      .in('status', ['setup', 'active'])
      .order('created_at', { ascending: false })

    if (eventsData) setEvents(eventsData)
    setLoading(false)
  }, [])

  const fetchSales = useCallback(async (eventId: string) => {
    if (!eventId) return
    const supabase = createClient()
    const { data: salesData } = await supabase
      .from('card_sales')
      .select('id, event_id, buyer_name, buyer_contact, quantity, amount_paid, payment_method, payment_status, registered_by, notes, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (!salesData) return

    const saleIds = salesData.map(s => s.id)
    const { data: cardsData } = await supabase
      .from('cards')
      .select('id, event_id, player_name, numbers, marked_numbers, bingo_claimed_at, alphanumeric_code, sale_id, sequence_number, created_at')
      .in('sale_id', saleIds)

    const salesWithCards: SaleWithCards[] = salesData.map(s => ({
      ...s,
      cards: (cardsData ?? []).filter(c => c.sale_id === s.id),
    }))

    setSales(salesWithCards)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchSales(selectedEventId) }, [selectedEventId, fetchSales])

  const selectedEvent = events.find(e => e.id === selectedEventId)
  const vagas = selectedEvent ? selectedEvent.max_cards - selectedEvent.cards_sold : 0
  const totalArrecadado = sales.filter(s => s.payment_status === 'pago').reduce((sum, s) => sum + s.amount_paid, 0)
  const totalPendente = sales.filter(s => s.payment_status === 'pendente').reduce((sum, s) => sum + (s.quantity * (selectedEvent?.price_per_card ?? 0)), 0)

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedEventId) { toast.error('Selecione um evento'); return }
    if (!buyerName.trim()) { toast.error('Informe o nome do comprador'); return }
    const qty = parseInt(quantity)
    if (isNaN(qty) || qty < 1) { toast.error('Quantidade inválida'); return }
    if (selectedEvent && qty > vagas) {
      toast.error(`Apenas ${vagas} vagas disponíveis neste evento`)
      return
    }

    setSubmitting(true)
    const supabase = createClient()

    // Buscar o maior sequence_number atual do evento para continuar a sequência
    const { data: existingCards } = await supabase
      .from('cards')
      .select('sequence_number')
      .eq('event_id', selectedEventId)
      .order('sequence_number', { ascending: false })
      .limit(1)

    const lastSeq = existingCards?.[0]?.sequence_number ?? 0

    // Criar a venda
    const amountPaid = paymentStatus === 'pago' ? qty * (selectedEvent?.price_per_card ?? 0) : 0

    const { data: saleData, error: saleError } = await supabase
      .from('card_sales')
      .insert({
        event_id: selectedEventId,
        buyer_name: buyerName.trim(),
        buyer_contact: buyerContact.trim() || null,
        quantity: qty,
        amount_paid: amountPaid,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes: notes.trim() || null,
      })
      .select('id')
      .single()

    if (saleError || !saleData) {
      toast.error('Erro ao registrar venda')
      setSubmitting(false)
      return
    }

    // Criar as cartelas
    const cardsToInsert = Array.from({ length: qty }, (_, i) => ({
      event_id: selectedEventId,
      player_name: buyerName.trim(),
      numbers: generateCardNumbers(),
      marked_numbers: [],
      sale_id: saleData.id,
      sequence_number: lastSeq + i + 1,
      alphanumeric_code: generateAlphanumericCode(lastSeq + i + 1),
    }))

    const { error: cardsError } = await supabase.from('cards').insert(cardsToInsert)
    if (cardsError) {
      toast.error('Erro ao gerar cartelas')
      setSubmitting(false)
      return
    }

    // Atualizar cards_sold no evento
    await supabase
      .from('events')
      .update({ cards_sold: (selectedEvent?.cards_sold ?? 0) + qty })
      .eq('id', selectedEventId)

    toast.success(`${qty} cartela(s) registrada(s) para ${buyerName}!`)
    setBuyerName('')
    setBuyerContact('')
    setQuantity('1')
    setNotes('')
    setPaymentStatus('pendente')
    fetchData()
    fetchSales(selectedEventId)
    setSubmitting(false)
  }, [selectedEventId, buyerName, buyerContact, quantity, paymentMethod, paymentStatus, notes, selectedEvent, vagas, fetchData, fetchSales])

  const updatePaymentStatus = useCallback(async (saleId: string, newStatus: PaymentStatus, amountPaid?: number) => {
    const supabase = createClient()
    const updateData: Partial<CardSale> = { payment_status: newStatus }
    if (amountPaid !== undefined) updateData.amount_paid = amountPaid
    const { error } = await supabase.from('card_sales').update(updateData).eq('id', saleId)
    if (error) { toast.error(error.message); return }
    toast.success('Pagamento atualizado!')
    fetchSales(selectedEventId)
  }, [selectedEventId, fetchSales])

  if (loading) {
    return <div className="text-white/50 text-center py-20">Carregando...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="font-display text-3xl text-white tracking-widest">VENDAS DE CARTELAS</h1>

      {/* Seletor de evento */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <label className="text-white/60 text-sm block mb-2">Evento</label>
        <div className="relative">
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400/50 appearance-none pr-10"
          >
            <option value="">— Selecione um evento —</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id} className="bg-[#5C1F47]">
                {ev.name} ({ev.cards_sold}/{ev.max_cards} cartelas · {formatCurrency(ev.price_per_card)} cada)
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={16} />
        </div>

        {events.length === 0 && (
          <p className="text-yellow-400/80 text-sm mt-3 flex items-center gap-2">
            <AlertCircle size={16} />
            Nenhum evento ativo. <a href="/admin/setup" className="underline">Criar novo evento</a>
          </p>
        )}
      </div>

      {selectedEvent && (
        <>
          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<CreditCard size={18} />}
              label="Cartelas Vendidas"
              value={`${selectedEvent.cards_sold}/${selectedEvent.max_cards}`}
              sub={`${vagas} vagas restantes`}
              color={vagas === 0 ? 'red' : vagas < 10 ? 'yellow' : 'green'}
            />
            <StatCard
              icon={<DollarSign size={18} />}
              label="Receita Esperada"
              value={formatCurrency(selectedEvent.cards_sold * selectedEvent.price_per_card)}
              sub="total se todos pagarem"
              color="blue"
            />
            <StatCard
              icon={<CheckCircle size={18} />}
              label="Recebido"
              value={formatCurrency(totalArrecadado)}
              sub={`${sales.filter(s => s.payment_status === 'pago').length} pagamentos`}
              color="green"
            />
            <StatCard
              icon={<Clock size={18} />}
              label="Pendente"
              value={formatCurrency(totalPendente)}
              sub={`${sales.filter(s => s.payment_status === 'pendente').length} pendentes`}
              color="yellow"
            />
          </div>

          {/* Aviso capacidade */}
          {vagas === 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-300">
              <AlertCircle size={20} />
              <span>Este evento atingiu o limite de cartelas. Selecione outro evento ou aumente o limite.</span>
            </div>
          )}

          {/* Formulário de venda */}
          {vagas > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold text-lg mb-5 flex items-center gap-2">
                <Plus size={20} className="text-yellow-400" />
                Registrar Venda Manual
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/60 text-sm block mb-1">Nome do Comprador *</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={e => setBuyerName(e.target.value)}
                      placeholder="Nome completo"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-white/60 text-sm block mb-1">Contato (tel/email)</label>
                    <input
                      type="text"
                      value={buyerContact}
                      onChange={e => setBuyerContact(e.target.value)}
                      placeholder="(11) 99999-9999 ou email"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-white/60 text-sm block mb-1">Qtd. Cartelas *</label>
                    <input
                      type="number"
                      min="1"
                      max={vagas}
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400/50"
                    />
                    <p className="text-white/30 text-xs mt-1">
                      Valor: {formatCurrency(parseInt(quantity || '0') * selectedEvent.price_per_card)}
                    </p>
                  </div>
                  <div>
                    <label className="text-white/60 text-sm block mb-1">Forma de Pagamento</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400/50"
                    >
                      <option value="pix" className="bg-[#5C1F47]">PIX</option>
                      <option value="dinheiro" className="bg-[#5C1F47]">Dinheiro</option>
                      <option value="cartao" className="bg-[#5C1F47]">Cartão</option>
                      <option value="outro" className="bg-[#5C1F47]">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-white/60 text-sm block mb-1">Status do Pagamento</label>
                    <select
                      value={paymentStatus}
                      onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400/50"
                    >
                      <option value="pendente" className="bg-[#5C1F47]">Pendente</option>
                      <option value="pago" className="bg-[#5C1F47]">Pago</option>
                      <option value="cancelado" className="bg-[#5C1F47]">Cancelado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-white/60 text-sm block mb-1">Observações</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Opcional..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#fcd34d] hover:bg-yellow-300 disabled:opacity-40 text-[#5C1F47] font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Registrando...' : <><Plus size={18} /> Registrar Venda e Gerar Cartelas</>}
                </button>
              </form>
            </div>
          )}

          {/* Lista de vendas */}
          {sales.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
                <Users size={18} className="text-yellow-400" />
                <h2 className="text-white font-semibold">Vendas Registradas ({sales.length})</h2>
              </div>
              <div className="divide-y divide-white/5">
                {sales.map(sale => (
                  <SaleRow
                    key={sale.id}
                    sale={sale}
                    pricePerCard={selectedEvent.price_per_card}
                    onUpdateStatus={updatePaymentStatus}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color: 'green' | 'yellow' | 'red' | 'blue'
}) {
  const colors = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
  }
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className={`flex items-center gap-1.5 mb-2 ${colors[color]}`}>
        {icon}
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <div className="text-white font-bold text-lg">{value}</div>
      <div className="text-white/30 text-xs mt-0.5">{sub}</div>
    </div>
  )
}

function SaleRow({ sale, pricePerCard, onUpdateStatus }: {
  sale: SaleWithCards
  pricePerCard: number
  onUpdateStatus: (id: string, status: PaymentStatus, amount?: number) => void
}) {
  const statusConfig = {
    pago: { icon: <CheckCircle size={14} />, color: 'text-green-400 bg-green-400/10 border-green-400/20', label: 'Pago' },
    pendente: { icon: <Clock size={14} />, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', label: 'Pendente' },
    cancelado: { icon: <XCircle size={14} />, color: 'text-red-400 bg-red-400/10 border-red-400/20', label: 'Cancelado' },
  }
  const cfg = statusConfig[sale.payment_status]

  return (
    <div className="px-6 py-4 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium">{sale.buyer_name}</div>
        {sale.buyer_contact && <div className="text-white/40 text-xs">{sale.buyer_contact}</div>}
        <div className="flex flex-wrap gap-1 mt-2">
          {sale.cards.map(card => (
            <span key={card.id} className="text-xs bg-purple-500/20 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded font-mono">
              {card.alphanumeric_code ?? `#${card.sequence_number}`}
            </span>
          ))}
        </div>
        {sale.notes && <div className="text-white/30 text-xs mt-1 italic">{sale.notes}</div>}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <div className="text-white text-sm font-medium">
            {formatCurrency(sale.quantity * pricePerCard)}
          </div>
          <div className="text-white/40 text-xs">{sale.quantity}× {sale.payment_method ?? '—'}</div>
        </div>

        <div className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </div>

        {sale.payment_status === 'pendente' && (
          <button
            onClick={() => onUpdateStatus(sale.id, 'pago', sale.quantity * pricePerCard)}
            className="text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            Marcar Pago
          </button>
        )}
      </div>
    </div>
  )
}
