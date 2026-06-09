'use client'

import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useBingoCard } from '@/hooks/useBingoCard'
import { useEvent } from '@/hooks/useEvent'
import { checkWinCondition } from '@/lib/utils'
import { toast } from 'sonner'

export default function CardElderlyPage() {
  const { cardId } = useParams<{ cardId: string }>()
  const { card, loading, toggleNumber, claimBingo } = useBingoCard(cardId)
  const { event } = useEvent(card?.event_id ?? null)
  const [lastDrawn, setLastDrawn] = useState<number | null>(null)

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
    toast.success('🎉 BINGO! Aguarde o organizador validar.', { duration: 6000 })
  }, [claimBingo])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p style={{ fontSize: 28, color: '#5C1F47', fontWeight: 'bold' }}>Carregando...</p>
      </div>
    )
  }

  if (!card) {
    return (
      <div style={{ minHeight: '100svh', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 12 }}>❌</div>
          <p style={{ fontSize: 28, fontWeight: 'bold', color: '#dc2626' }}>Cartela não encontrada</p>
          <p style={{ fontSize: 16, color: '#ef4444', marginTop: 8 }}>Peça ajuda ao organizador</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      padding: 12,
      maxWidth: 420,
      margin: '0 auto',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 36, fontWeight: 'bold', color: '#5C1F47', margin: 0 }}>🎰 BINGO</p>
        <p style={{ fontSize: 22, color: '#333', fontWeight: '600', margin: '6px 0 4px' }}>{card.player_name}</p>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>Toque nos números sorteados</p>
        {lastDrawn && (
          <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(252,211,77,0.2)', borderRadius: 999, padding: '4px 16px' }}>
            <span style={{ fontSize: 13, color: '#5C1F47' }}>Último número:</span>
            <span style={{ fontSize: 26, fontWeight: 'bold', color: '#5C1F47' }}>{lastDrawn}</span>
          </div>
        )}
      </div>

      {/* Grid 5x5 — botões grandes para idosos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 8,
        marginBottom: 16,
        flex: 1,
      }}>
        {card.numbers.map(num => {
          const isDrawn = event?.drawn_numbers.includes(num) ?? false
          const isMarked = card.marked_numbers.includes(num)

          let bg = '#f3f4f6'
          let color = '#5C1F47'
          let border = '2px solid #d1d5db'
          let extraStyle: React.CSSProperties = {}

          if (isMarked) {
            bg = '#5C1F47'
            color = 'white'
            border = '2px solid #3a1230'
            extraStyle = { boxShadow: '0 4px 12px rgba(92,31,71,0.3)', transform: 'scale(0.95)' }
          } else if (isDrawn) {
            bg = '#fcd34d'
            border = '2px solid #fbbf24'
            extraStyle = { boxShadow: '0 4px 12px rgba(252,211,77,0.5)', animation: 'pulse 1.2s ease-in-out infinite' }
          }

          return (
            <button
              key={num}
              onClick={() => toggleNumber(num)}
              style={{
                aspectRatio: '1',
                minHeight: 64,
                background: bg,
                color,
                border,
                borderRadius: 10,
                fontSize: 32,
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                transition: 'all 0.15s',
                fontFamily: 'Segoe UI, sans-serif',
                ...extraStyle,
              }}
            >
              {num}
            </button>
          )
        })}
      </div>

      {/* Contador */}
      <div style={{
        background: '#f3e8ff', borderRadius: 12, padding: '12px 16px',
        textAlign: 'center', marginBottom: 12,
      }}>
        <p style={{ fontSize: 13, color: '#5C1F47', opacity: 0.6, margin: '0 0 4px' }}>Números marcados</p>
        <p style={{ fontSize: 40, fontWeight: 'bold', color: '#5C1F47', margin: 0 }}>
          {card.marked_numbers.length}<span style={{ fontSize: 22, opacity: 0.4 }}>/25</span>
        </p>
      </div>

      {/* Legenda */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12, fontSize: 12 }}>
        {[
          { bg: '#f3f4f6', border: '2px solid #d1d5db', label: 'Não marcado', color: '#555' },
          { bg: '#fcd34d', border: '2px solid #fbbf24', label: 'Sorteado', color: '#555' },
          { bg: '#5C1F47', border: '2px solid #3a1230', label: 'Marcado', color: '#555' },
        ].map(({ bg, border, label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 36, height: 36, background: bg, border, borderRadius: 6, flexShrink: 0 }} />
            <span style={{ color, lineHeight: 1.2 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Botão BINGO — grande */}
      <button
        onClick={handleBingo}
        disabled={!canWin || !!card.bingo_claimed_at}
        style={{
          width: '100%',
          padding: '18px 0',
          borderRadius: 12,
          border: 'none',
          fontSize: 26,
          fontWeight: 'bold',
          cursor: canWin && !card.bingo_claimed_at ? 'pointer' : 'not-allowed',
          background: card.bingo_claimed_at
            ? '#e5e7eb'
            : canWin
            ? 'linear-gradient(135deg, #27ae60, #2ecc71)'
            : '#e5e7eb',
          color: card.bingo_claimed_at || !canWin ? '#9ca3af' : 'white',
          boxShadow: canWin && !card.bingo_claimed_at ? '0 4px 16px rgba(39,174,96,0.4)' : 'none',
          transition: 'all 0.2s',
          marginBottom: 8,
        }}
      >
        {card.bingo_claimed_at ? '✅ BINGO Enviado!' : '🎉 BINGO!'}
      </button>
      <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', margin: 0 }}>
        {card.bingo_claimed_at
          ? 'Aguarde o organizador validar'
          : canWin
          ? 'Pressione para avisar que ganhou!'
          : 'Complete a condição para ativar o BINGO'}
      </p>

      {/* CSS pulse para números sorteados */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
      `}</style>
    </div>
  )
}
