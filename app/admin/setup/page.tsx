'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateCardNumbers } from '@/lib/utils'
import { toast } from 'sonner'
import type { WinCondition } from '@/lib/supabase/types'

const WIN_OPTIONS: { value: WinCondition; label: string; desc: string }[] = [
  { value: 'line',      label: 'Linha',       desc: 'Qualquer linha horizontal completa' },
  { value: 'column',    label: 'Coluna',      desc: 'Qualquer coluna vertical completa' },
  { value: 'diagonal',  label: 'Diagonal',    desc: 'Diagonal principal ou secundária' },
  { value: 'full_card', label: 'Cartela Cheia', desc: 'Todos os 25 números marcados' },
]

interface PlayerRow { name: string }

export default function SetupPage() {
  const [eventName, setEventName] = useState('')
  const [winCondition, setWinCondition] = useState<WinCondition>('full_card')
  const [players, setPlayers] = useState<PlayerRow[]>([{ name: '' }])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const addPlayer = useCallback(() => setPlayers(p => [...p, { name: '' }]), [])
  const removePlayer = useCallback((i: number) => setPlayers(p => p.filter((_, idx) => idx !== i)), [])
  const updatePlayer = useCallback((i: number, name: string) => {
    setPlayers(p => p.map((row, idx) => idx === i ? { name } : row))
  }, [])

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const validPlayers = players.filter(p => p.name.trim())
    if (!eventName.trim()) { toast.error('Informe o nome do evento'); return }
    if (validPlayers.length === 0) { toast.error('Adicione ao menos um jogador'); return }

    setLoading(true)
    const supabase = createClient()

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .insert({ name: eventName.trim(), status: 'active', win_condition: winCondition, drawn_numbers: [] })
      .select('id')
      .single()

    if (eventError || !eventData) {
      toast.error('Erro ao criar evento')
      setLoading(false)
      return
    }

    const cardsToInsert = validPlayers.map(p => ({
      event_id: eventData.id,
      player_name: p.name.trim(),
      numbers: generateCardNumbers(),
      marked_numbers: [],
    }))

    const { error: cardsError } = await supabase.from('cards').insert(cardsToInsert)
    if (cardsError) {
      toast.error('Erro ao criar cartelas')
      setLoading(false)
      return
    }

    toast.success('Evento criado com sucesso!')
    router.push('/admin/players')
  }, [eventName, winCondition, players, router])

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-white text-4xl">NOVO EVENTO</h1>
        <p className="text-white/50 mt-1">Configure e crie as cartelas dos jogadores</p>
      </div>

      <form onSubmit={handleCreate} className="space-y-6">
        {/* Nome */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
          <label className="text-white/60 text-sm uppercase tracking-widest">Nome do Evento</label>
          <input
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            placeholder="Ex: Bingo de Natal 2025"
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#fcd34d]/50 text-lg"
          />
        </div>

        {/* Condição de vitória */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <label className="text-white/60 text-sm uppercase tracking-widest">Condição de Vitória</label>
          <div className="grid grid-cols-2 gap-2">
            {WIN_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWinCondition(opt.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  winCondition === opt.value
                    ? 'bg-[#fcd34d] border-[#fcd34d] text-[#5C1F47]'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <div className="font-bold text-sm">{opt.label}</div>
                <div className={`text-xs mt-0.5 ${winCondition === opt.value ? 'text-[#5C1F47]/70' : 'text-white/40'}`}>
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Jogadores */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <label className="text-white/60 text-sm uppercase tracking-widest">
            Jogadores ({players.filter(p => p.name.trim()).length})
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {players.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={p.name}
                  onChange={e => updatePlayer(i, e.target.value)}
                  placeholder={`Jogador ${i + 1}`}
                  className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#fcd34d]/50 text-sm"
                />
                {players.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePlayer(i)}
                    className="px-3 py-2 text-white/30 hover:text-red-400 transition-colors text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addPlayer}
            className="w-full py-2 border border-dashed border-white/20 rounded-lg text-white/40 hover:text-white/60 hover:border-white/30 text-sm transition-colors"
          >
            + Adicionar Jogador
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#fcd34d] hover:bg-yellow-300 disabled:opacity-40 text-[#5C1F47] font-bold py-4 rounded-xl text-lg transition-all active:scale-95"
        >
          {loading ? 'Criando...' : '🎰 Criar Evento e Cartelas'}
        </button>
      </form>
    </div>
  )
}
