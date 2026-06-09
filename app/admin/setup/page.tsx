'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trophy, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { PrizeCondition, WinConditionType } from '@/lib/supabase/types'

const CONDITION_OPTIONS: { value: WinConditionType; label: string; description: string }[] = [
  { value: 'line', label: 'Linha', description: 'Qualquer linha horizontal completa' },
  { value: 'column', label: 'Coluna', description: 'Qualquer coluna vertical completa' },
  { value: 'diagonal', label: 'Diagonal', description: 'Diagonal principal ou secundária' },
  { value: 'full_card', label: 'Cartela Cheia', description: 'Todos os 25 números — encerra o evento' },
]

interface ConditionState {
  condition: WinConditionType
  selected: boolean
  prize: string
}

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [pricePerCard, setPricePerCard] = useState('')
  const [maxCards, setMaxCards] = useState('100')
  const [conditions, setConditions] = useState<ConditionState[]>(
    CONDITION_OPTIONS.map(o => ({
      condition: o.value,
      selected: o.value === 'full_card',
      prize: '',
    }))
  )

  const toggleCondition = useCallback((value: WinConditionType) => {
    if (value === 'full_card') return
    setConditions(prev =>
      prev.map(c => c.condition === value ? { ...c, selected: !c.selected } : c)
    )
  }, [])

  const updatePrize = useCallback((value: WinConditionType, prize: string) => {
    setConditions(prev =>
      prev.map(c => c.condition === value ? { ...c, prize } : c)
    )
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Informe o nome do evento'); return }

    const selectedConditions = conditions.filter(c => c.selected)
    for (const c of selectedConditions) {
      if (!c.prize.trim()) {
        const opt = CONDITION_OPTIONS.find(o => o.value === c.condition)
        toast.error(`Informe o prêmio para: ${opt?.label}`)
        return
      }
    }

    setLoading(true)
    const supabase = createClient()

    const prizeConditions: PrizeCondition[] = selectedConditions.map(c => ({
      condition: c.condition,
      label: CONDITION_OPTIONS.find(o => o.value === c.condition)?.label ?? c.condition,
      prize: c.prize.trim(),
      won_by_card: null,
      won_by_name: null,
      won_at: null,
    }))

    const { error } = await supabase.from('events').insert({
      name: name.trim(),
      status: 'setup',
      win_condition: 'full_card',
      drawn_numbers: [],
      price_per_card: parseFloat(pricePerCard) || 0,
      max_cards: parseInt(maxCards) || 100,
      cards_sold: 0,
      prize_conditions: prizeConditions,
    })

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Evento criado! Agora registre as vendas.')
    router.push('/admin/vendas')
  }, [name, pricePerCard, maxCards, conditions, router])

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-3xl text-white tracking-widest mb-8">NOVO EVENTO</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white/5 rounded-2xl p-6 space-y-4 border border-white/10">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <Trophy size={20} className="text-yellow-400" />
            Informações do Evento
          </h2>

          <div>
            <label className="text-white/60 text-sm block mb-1">Nome do Evento *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Cesta de Natal, Licores e Queijos..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/60 text-sm block mb-1">Preço por Cartela (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pricePerCard}
                onChange={e => setPricePerCard(e.target.value)}
                placeholder="0,00"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm block mb-1">Qtd. Máxima de Cartelas</label>
              <input
                type="number"
                min="1"
                value={maxCards}
                onChange={e => setMaxCards(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400/50"
              />
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h2 className="text-white font-semibold text-lg mb-1 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-400" />
            Condições de Vitória e Prêmios
          </h2>
          <p className="text-white/40 text-sm mb-5">
            Cartela Cheia é obrigatória e encerra o evento. As demais são prêmios parciais.
          </p>

          <div className="space-y-3">
            {CONDITION_OPTIONS.map(opt => {
              const state = conditions.find(c => c.condition === opt.value)!
              const isFullCard = opt.value === 'full_card'
              return (
                <div
                  key={opt.value}
                  className={`rounded-xl border transition-colors ${
                    state.selected ? 'border-yellow-400/40 bg-yellow-400/5' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleCondition(opt.value)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    disabled={isFullCard}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border ${
                      state.selected ? 'bg-yellow-400 border-yellow-400' : 'border-white/30'
                    }`}>
                      {state.selected && <span className="text-black text-xs font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm flex items-center gap-2">
                        {opt.label}
                        {isFullCard && (
                          <span className="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full">
                            obrigatória
                          </span>
                        )}
                      </div>
                      <div className="text-white/40 text-xs">{opt.description}</div>
                    </div>
                  </button>

                  {state.selected && (
                    <div className="px-4 pb-3">
                      <input
                        type="text"
                        value={state.prize}
                        onChange={e => updatePrize(opt.value, e.target.value)}
                        placeholder="Descrição do prêmio (ex: R$ 100, Cesta com vinhos...)"
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-yellow-400/50"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#fcd34d] hover:bg-yellow-300 disabled:opacity-40 text-[#5C1F47] font-bold py-4 rounded-xl text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {loading ? 'Criando evento...' : <><Plus size={20} /> Criar Evento</>}
        </button>
      </form>
    </div>
  )
}
