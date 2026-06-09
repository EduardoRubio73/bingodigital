'use client'

import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useBingoCard } from '@/hooks/useBingoCard'
import { useEvent } from '@/hooks/useEvent'
import { checkWinCondition } from '@/lib/utils'
import { toast } from 'sonner'

export default function CardPage() {
  const { cardId } = useParams<{ cardId: string }>()
  const { card, loading, toggleNumber, claimBingo } = useBingoCard(cardId)
  const { event } = useEvent(card?.event_id ?? null)
  const [lastDrawn, setLastDrawn] = useState<number | null>(null)

  // Detecta novo número sorteado para destacar
  useEffect(() => {
    if (event?.drawn_numbers?.length) {
      setLastDrawn(event.drawn_numbers[event.drawn_numbers.length - 1])
    }
  }, [event?.drawn_numbers?.length])

  const canWin = card && event
    ? checkWinCondition(card.numbers, card.marked_numbers, event.win_condition)
    : false

  const handleBingo = useCallback(async () => {
    await claimBingo()
    toast.success('🎉 BINGO! Aguarde o organizador validar.')
  }, [claimBingo])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[#5C1F47] font-display text-3xl">CARREGANDO...</div>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-3">❌</div>
          <h1 className="text-2xl font-bold text-red-700 mb-1">Cartela não encontrada</h1>
          <p className="text-red-500 text-sm">Peça ajuda ao organizador</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-sm mx-auto px-3 py-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="font-display text-[#5C1F47] text-3xl">🎰 BINGO</h1>
        <p className="text-gray-600 font-semibold text-lg">{card.player_name}</p>
        <p className="text-gray-400 text-xs">Toque nos números sorteados</p>
        {event && lastDrawn && (
          <div className="mt-2 inline-flex items-center gap-2 bg-[#fcd34d]/20 rounded-full px-3 py-1">
            <span className="text-xs text-[#5C1F47]/70">Último:</span>
            <span className="font-display text-[#5C1F47] text-xl">{lastDrawn}</span>
          </div>
        )}
      </div>

      {/* Grid 5x5 */}
      <div className="grid grid-cols-5 gap-1.5 mb-4 flex-1">
        {card.numbers.map(num => {
          const isDrawn = event?.drawn_numbers.includes(num) ?? false
          const isMarked = card.marked_numbers.includes(num)
          return (
            <button
              key={num}
              onClick={() => toggleNumber(num)}
              className={`aspect-square rounded-xl font-display text-2xl transition-all active:scale-90 select-none
                ${isMarked
                  ? 'ball ball-purple shadow-lg'
                  : isDrawn
                  ? 'ball ball-yellow animate-pulse-ring'
                  : 'bg-gray-100 text-[#5C1F47]/40 border-2 border-gray-200'
                }`}
            >
              {num}
            </button>
          )
        })}
      </div>

      {/* Contador + legenda */}
      <div className="bg-[#f3e8ff] rounded-xl p-3 mb-3 text-center">
        <p className="text-xs text-[#5C1F47]/50 mb-0.5">Números marcados</p>
        <p className="font-display text-[#5C1F47] text-4xl">
          {card.marked_numbers.length}<span className="text-xl text-[#5C1F47]/40">/25</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-xs text-center">
        {[
          { cls: 'bg-gray-100 border-2 border-gray-200 rounded-lg', label: 'Não marcado' },
          { cls: 'ball ball-yellow rounded-lg', label: 'Sorteado' },
          { cls: 'ball ball-purple rounded-lg', label: 'Marcado' },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-7 h-7 flex-shrink-0 ${cls}`} />
            <span className="text-gray-500 text-left leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Botão BINGO */}
      <button
        onClick={handleBingo}
        disabled={!canWin || !!card.bingo_claimed_at}
        className={`w-full py-4 rounded-xl font-bold text-xl transition-all active:scale-95
          ${card.bingo_claimed_at
            ? 'bg-gray-100 text-gray-400 cursor-default'
            : canWin
            ? 'bg-[#27ae60] text-white shadow-lg shadow-green-200 animate-celebrate'
            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
      >
        {card.bingo_claimed_at ? '✅ BINGO Enviado!' : '🎉 BINGO!'}
      </button>
      <p className="text-center text-xs text-gray-400 mt-2">
        {card.bingo_claimed_at
          ? 'Aguarde o organizador validar'
          : canWin
          ? 'Pressione para avisar que ganhou!'
          : 'Complete a condição para ativar o BINGO'}
      </p>
    </div>
  )
}
