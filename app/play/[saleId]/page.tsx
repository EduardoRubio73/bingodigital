'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBingoCard } from '@/hooks/useBingoCard'
import { useEvent } from '@/hooks/useEvent'
import { checkWinCondition } from '@/lib/utils'
import { toast } from 'sonner'
import type { BingoCard } from '@/lib/supabase/types'

// Componente individual de cartela — reutiliza lógica do card-elderly
function CardSlide({ cardId, eventId }: { cardId: string; eventId: string }) {
  const { card, loading, toggleNumber, claimBingo } = useBingoCard(cardId)
  const { event } = useEvent(eventId)
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
      <div style={{ width: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ fontSize: 20, color: '#5C1F47' }}>Carregando cartela...</p>
      </div>
    )
  }

  if (!card) {
    return (
      <div style={{ width: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ fontSize: 18, color: '#dc2626' }}>Cartela não encontrada</p>
      </div>
    )
  }

  const isFinished = event?.status === 'finished'

  return (
    <div style={{
      width: '100%',
      flexShrink: 0,
      scrollSnapAlign: 'start',
      padding: '12px 16px 24px',
      boxSizing: 'border-box',
    }}>
      {/* Código + último número */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          background: '#5C1F47', color: '#fcd34d',
          borderRadius: 999, padding: '4px 14px',
          fontWeight: 'bold', fontSize: 16,
        }}>
          {card.alphanumeric_code ?? `#${card.sequence_number}`}
        </div>
        {lastDrawn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(252,211,77,0.2)', borderRadius: 999, padding: '4px 14px' }}>
            <span style={{ fontSize: 12, color: '#5C1F47' }}>Último:</span>
            <span style={{ fontSize: 22, fontWeight: 'bold', color: '#5C1F47' }}>{lastDrawn}</span>
          </div>
        )}
      </div>

      {/* Grid 5×5 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 6,
        marginBottom: 12,
      }}>
        {card.numbers.map(num => {
          const isDrawn = event?.drawn_numbers.includes(num) ?? false
          const isMarked = card.marked_numbers.includes(num)

          let bg = '#f3f4f6'
          let color = '#5C1F47'
          let border = '2px solid #d1d5db'
          let extraStyle: React.CSSProperties = {}

          if (isMarked) {
            bg = '#5C1F47'; color = 'white'; border = '2px solid #3a1230'
            extraStyle = { boxShadow: '0 4px 12px rgba(92,31,71,0.3)', transform: 'scale(0.95)' }
          } else if (isDrawn) {
            bg = '#fcd34d'; border = '2px solid #fbbf24'
            extraStyle = { boxShadow: '0 4px 12px rgba(252,211,77,0.5)', animation: 'pulse 1.2s ease-in-out infinite' }
          }

          return (
            <button
              key={num}
              onClick={() => !isFinished && toggleNumber(num)}
              disabled={isFinished}
              style={{
                aspectRatio: '1', minHeight: 56,
                background: bg, color, border, borderRadius: 8,
                fontSize: 28, fontWeight: 'bold',
                cursor: isFinished ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                WebkitUserSelect: 'none', userSelect: 'none',
                transition: 'all 0.15s',
                fontFamily: 'Segoe UI, sans-serif',
                opacity: isFinished ? 0.5 : 1,
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
        background: '#f3e8ff', borderRadius: 10, padding: '8px 12px',
        textAlign: 'center', marginBottom: 10,
      }}>
        <span style={{ fontSize: 13, color: '#5C1F47', opacity: 0.6 }}>Marcados: </span>
        <span style={{ fontSize: 22, fontWeight: 'bold', color: '#5C1F47' }}>
          {card.marked_numbers.length}<span style={{ fontSize: 14, opacity: 0.4 }}>/25</span>
        </span>
      </div>

      {/* Botão BINGO */}
      <button
        onClick={handleBingo}
        disabled={!canWin || !!card.bingo_claimed_at || isFinished}
        style={{
          width: '100%', padding: '16px 0', borderRadius: 12, border: 'none',
          fontSize: 22, fontWeight: 'bold',
          cursor: (canWin && !card.bingo_claimed_at && !isFinished) ? 'pointer' : 'not-allowed',
          background: card.bingo_claimed_at || isFinished ? '#e5e7eb'
            : canWin ? 'linear-gradient(135deg, #27ae60, #2ecc71)' : '#e5e7eb',
          color: card.bingo_claimed_at || !canWin || isFinished ? '#9ca3af' : 'white',
          boxShadow: (canWin && !card.bingo_claimed_at && !isFinished) ? '0 4px 16px rgba(39,174,96,0.4)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        {card.bingo_claimed_at ? '✅ BINGO Enviado!' : '🎉 BINGO!'}
      </button>
    </div>
  )
}

// Página principal do carrossel
export default function PlayPage() {
  const { saleId } = useParams<{ saleId: string }>()
  const [cards, setCards] = useState<BingoCard[]>([])
  const [eventId, setEventId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [eventName, setEventName] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      const { data: sale } = await supabase
        .from('card_sales')
        .select('id, buyer_name, event_id')
        .eq('id', saleId)
        .single()

      if (!sale) { setLoading(false); return }

      setPlayerName(sale.buyer_name)
      setEventId(sale.event_id)

      const { data: ev } = await supabase
        .from('events')
        .select('name')
        .eq('id', sale.event_id)
        .single()

      if (ev) setEventName(ev.name)

      const { data: cs } = await supabase
        .from('cards')
        .select('id, event_id, player_name, numbers, marked_numbers, bingo_claimed_at, alphanumeric_code, sale_id, sequence_number, created_at')
        .eq('sale_id', saleId)
        .order('sequence_number', { ascending: true })

      setCards(cs ?? [])
      setLoading(false)
    }
    load()
  }, [saleId])

  const scrollTo = useCallback((index: number) => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
    setCurrentIndex(index)
  }, [])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setCurrentIndex(index)
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100svh', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 24, color: '#5C1F47', fontWeight: 'bold' }}>Carregando...</p>
      </div>
    )
  }

  if (!eventId || cards.length === 0) {
    return (
      <div style={{ minHeight: '100svh', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 12 }}>❌</div>
          <p style={{ fontSize: 24, fontWeight: 'bold', color: '#dc2626' }}>Nenhuma cartela encontrada</p>
          <p style={{ fontSize: 14, color: '#ef4444', marginTop: 8 }}>Peça ajuda ao organizador</p>
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
      maxWidth: 440,
      margin: '0 auto',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* Header fixo */}
      <div style={{
        background: '#5C1F47',
        padding: '12px 16px',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        <p style={{ fontSize: 13, color: '#fcd34d', opacity: 0.8, margin: '0 0 2px' }}>{eventName}</p>
        <p style={{ fontSize: 20, fontWeight: 'bold', color: 'white', margin: 0 }}>{playerName}</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>
          Cartela {currentIndex + 1} de {cards.length}
        </p>
      </div>

      {/* Dots de navegação */}
      {cards.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0', flexShrink: 0, background: '#f9f0f6' }}>
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              style={{
                width: i === currentIndex ? 20 : 8,
                height: 8,
                borderRadius: 999,
                border: 'none',
                background: i === currentIndex ? '#5C1F47' : '#d1c0cc',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Carrossel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          flex: 1,
        }}
      >
        {cards.map(card => (
          <CardSlide key={card.id} cardId={card.id} eventId={eventId} />
        ))}
      </div>

      {/* Setas de navegação (mobile oculta, desktop visível) */}
      {cards.length > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '8px 16px 16px', flexShrink: 0,
          background: 'white',
        }}>
          <button
            onClick={() => scrollTo(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={{
              background: currentIndex === 0 ? '#f3f4f6' : '#5C1F47',
              color: currentIndex === 0 ? '#9ca3af' : 'white',
              border: 'none', borderRadius: 10, padding: '10px 20px',
              fontWeight: 'bold', fontSize: 16, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Anterior
          </button>
          <button
            onClick={() => scrollTo(Math.min(cards.length - 1, currentIndex + 1))}
            disabled={currentIndex === cards.length - 1}
            style={{
              background: currentIndex === cards.length - 1 ? '#f3f4f6' : '#5C1F47',
              color: currentIndex === cards.length - 1 ? '#9ca3af' : 'white',
              border: 'none', borderRadius: 10, padding: '10px 20px',
              fontWeight: 'bold', fontSize: 16, cursor: currentIndex === cards.length - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Próxima →
          </button>
        </div>
      )}

      <style>{`
        div::-webkit-scrollbar { display: none; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
      `}</style>
    </div>
  )
}
