'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBingoCard } from '@/hooks/useBingoCard'
import { useEvent } from '@/hooks/useEvent'
import { checkWinCondition } from '@/lib/utils'
import { listSponsors, buildPlaylist, getQrUrl } from '@/lib/sponsors'
import type { Sponsor } from '@/lib/sponsors'
import { toast } from 'sonner'
import type { BingoCard } from '@/lib/supabase/types'

function toBingoDisplayOrder(numbers: number[]): number[] {
  const cols = [
    numbers.filter(n => n >= 1 && n <= 15),
    numbers.filter(n => n >= 16 && n <= 30),
    numbers.filter(n => n >= 31 && n <= 45),
    numbers.filter(n => n >= 46 && n <= 60),
    numbers.filter(n => n >= 61 && n <= 75),
  ]
  const result: number[] = []
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 5; col++)
      result.push(cols[col][row] ?? 0)
  return result
}

function CardSlide({ cardId, eventId }: { cardId: string; eventId: string }) {
  const { card, loading, toggleNumber, claimBingo } = useBingoCard(cardId)
  const { event } = useEvent(eventId)

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
  const displayNumbers = toBingoDisplayOrder(card.numbers)

  return (
    <div style={{
      width: '100%',
      flexShrink: 0,
      scrollSnapAlign: 'start',
      padding: '12px 16px 24px',
      boxSizing: 'border-box',
    }}>
      {/* Código */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div style={{
          background: '#5C1F47', color: '#fcd34d',
          borderRadius: 999, padding: '4px 14px',
          fontWeight: 'bold', fontSize: 16,
        }}>
          {card.alphanumeric_code ?? `#${card.sequence_number}`}
        </div>
      </div>

      {/* Grid 5×5 em ordem BINGO */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 6,
        marginBottom: 12,
      }}>
        {displayNumbers.map((num, idx) => {
          if (num === 0) {
            return (
              <div
                key={`empty-${idx}`}
                style={{
                  aspectRatio: '1', minHeight: 56,
                  background: '#8a2c72', border: '2px solid #6e2259', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              />
            )
          }

          const isMarked = card.marked_numbers.includes(num)

          const bg = isMarked ? '#5C1F47' : '#f3f4f6'
          const color = isMarked ? 'white' : '#5C1F47'
          const border = isMarked ? '2px solid #3a1230' : '2px solid #d1d5db'
          const extraStyle: React.CSSProperties = isMarked
            ? { boxShadow: '0 4px 12px rgba(92,31,71,0.3)', transform: 'scale(0.95)' }
            : {}

          return (
            <button
              key={`${num}-${idx}`}
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

const TIER_BADGE: Record<string, string> = {
  simples: '✦ SIMPLES',
  destaque: '⭐ DESTAQUE',
  personalizado: '✦ PERSONALIZADO',
}

const QR_LABEL: Record<string, string> = {
  site: 'SITE',
  instagram: 'INSTAGRAM',
  whatsapp: 'WHATSAPP',
}

export default function PlayPage() {
  const { saleId } = useParams<{ saleId: string }>()
  const [cards, setCards] = useState<BingoCard[]>([])
  const [eventId, setEventId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [eventName, setEventName] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [playlist, setPlaylist] = useState<Sponsor[]>([])
  const [sponsorSlot, setSponsorSlot] = useState(0)
  const [sponsorCycle, setSponsorCycle] = useState(0)
  const [sponsorProgress, setSponsorProgress] = useState(0)

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

  useEffect(() => {
    let cancelled = false
    const load = () =>
      listSponsors()
        .then(data => { if (!cancelled) setSponsors(data) })
        .catch(console.error)

    load()

    const supabase = createClient()
    const channel = supabase
      .channel('play-sponsors-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sponsors' }, load)
      .subscribe()

    const timer = setInterval(load, 30_000)
    return () => { cancelled = true; supabase.removeChannel(channel); clearInterval(timer) }
  }, [])

  useEffect(() => {
    if (!sponsors.length) return
    setPlaylist(buildPlaylist(sponsors))
    setSponsorSlot(0)
    setSponsorProgress(0)
  }, [sponsors, sponsorCycle])

  useEffect(() => {
    if (!playlist.length) return
    const sponsor = playlist[sponsorSlot]
    if (!sponsor) return
    const durationMs = sponsor.duration_seconds * 1000
    const startTime = Date.now()
    setSponsorProgress(0)

    const progressId = setInterval(() => {
      const p = Math.min(100, ((Date.now() - startTime) / durationMs) * 100)
      setSponsorProgress(p)
      if (p >= 100) clearInterval(progressId)
    }, 250)

    const timerId = setTimeout(() => {
      const next = sponsorSlot + 1
      if (next >= playlist.length) setSponsorCycle(c => c + 1)
      else { setSponsorSlot(next); setSponsorProgress(0) }
    }, durationMs)

    return () => { clearInterval(progressId); clearTimeout(timerId) }
  }, [sponsorSlot, playlist])

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

  const activeSponsor = playlist.length > 0 ? playlist[sponsorSlot] : null
  const qrUrl = activeSponsor ? getQrUrl(activeSponsor) : ''
  const hasMultiple = cards.length > 1

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
      {/* Header com ícones de navegação */}
      <div style={{
        background: '#5C1F47',
        padding: '10px 12px 6px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Botão anterior */}
          <button
            onClick={() => scrollTo(Math.max(0, currentIndex - 1))}
            disabled={!hasMultiple || currentIndex === 0}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: (!hasMultiple || currentIndex === 0) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
              color: (!hasMultiple || currentIndex === 0) ? 'rgba(255,255,255,0.3)' : 'white',
              fontSize: 18, cursor: (!hasMultiple || currentIndex === 0) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            aria-label="Cartela anterior"
          >
            ‹
          </button>

          {/* Info central */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#fcd34d', opacity: 0.85, margin: 0, lineHeight: 1.2 }}>{eventName}</p>
            <p style={{ fontSize: 17, fontWeight: 'bold', color: 'white', margin: '1px 0 0', lineHeight: 1.2 }}>{playerName}</p>
            {hasMultiple && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '2px 0 0', lineHeight: 1 }}>
                Cartela {currentIndex + 1} de {cards.length}
              </p>
            )}
          </div>

          {/* Botão próxima */}
          <button
            onClick={() => scrollTo(Math.min(cards.length - 1, currentIndex + 1))}
            disabled={!hasMultiple || currentIndex === cards.length - 1}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: (!hasMultiple || currentIndex === cards.length - 1) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
              color: (!hasMultiple || currentIndex === cards.length - 1) ? 'rgba(255,255,255,0.3)' : 'white',
              fontSize: 18, cursor: (!hasMultiple || currentIndex === cards.length - 1) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            aria-label="Próxima cartela"
          >
            ›
          </button>
        </div>

        {/* Dots de navegação */}
        {hasMultiple && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 5, paddingTop: 6 }}>
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                style={{
                  width: i === currentIndex ? 20 : 7,
                  height: 7,
                  borderRadius: 999,
                  border: 'none',
                  background: i === currentIndex ? '#fcd34d' : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>

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

      {/* Banner de patrocinadores */}
      {activeSponsor && (
        <div key={`${activeSponsor.id}-${sponsorCycle}-${sponsorSlot}`} style={{ padding: '0 12px 12px', flexShrink: 0 }}>
          <div className="play-sp-card">
            <div className="play-sp-tier-badge">{TIER_BADGE[activeSponsor.tier] ?? activeSponsor.tier}</div>

            {/* Logo */}
            <div className="play-sp-logo-col">
              <div className="play-sp-logo-box">
                {activeSponsor.logo_url
                  ? <img src={activeSponsor.logo_url} alt={activeSponsor.name} />
                  : <span style={{ fontSize: 24, opacity: 0.3 }}>🏢</span>
                }
              </div>
            </div>

            {/* Info */}
            <div className="play-sp-info-col">
              <div className="play-sp-sponsor-label">Patrocinador</div>
              <div className="play-sp-name">{activeSponsor.name}</div>
              {activeSponsor.contact_name && <div className="play-sp-detail">👤 {activeSponsor.contact_name}</div>}
              {activeSponsor.site_url && (
                <div className="play-sp-detail">🌐 {activeSponsor.site_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</div>
              )}
              {activeSponsor.whatsapp_number && <div className="play-sp-detail">💬 {activeSponsor.whatsapp_number}</div>}
              {activeSponsor.instagram_url && (
                <div className="play-sp-detail">
                  📸 {activeSponsor.instagram_url.startsWith('@')
                    ? activeSponsor.instagram_url
                    : `@${activeSponsor.instagram_url.replace(/.*instagram\.com\//, '').replace(/\/.*/, '')}`}
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="play-sp-qr-col">
              {qrUrl ? (
                <>
                  <div className="play-sp-qr-box">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&bgcolor=ffffff&color=120620&qzone=1&data=${encodeURIComponent(qrUrl)}`}
                      alt="QR Code"
                      width={80}
                      height={80}
                    />
                  </div>
                  <div className="play-sp-qr-label">{QR_LABEL[activeSponsor.qr_type] ?? 'ACESSE'}</div>
                </>
              ) : (
                <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }} />
              )}
            </div>

            {/* Progress bar */}
            <div className="play-sp-progress">
              <div className="play-sp-progress-fill" style={{ width: `${sponsorProgress}%` }} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        div::-webkit-scrollbar { display: none; }

        @keyframes spSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .play-sp-card {
          position: relative;
          display: grid;
          grid-template-columns: 88px 1fr 88px;
          gap: 0;
          align-items: center;
          background: linear-gradient(135deg, rgba(18,6,30,0.98), rgba(12,4,22,0.99));
          border-top: 2px solid rgba(252,211,77,0.6);
          border-left: 1px solid rgba(252,211,77,0.15);
          border-right: 1px solid rgba(252,211,77,0.15);
          border-bottom: 1px solid rgba(252,211,77,0.15);
          border-radius: 12px;
          padding: 14px 12px;
          overflow: hidden;
          box-shadow: 0 -6px 30px rgba(252,211,77,0.06), inset 0 1px 0 rgba(252,211,77,0.12);
          animation: spSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) both;
        }
        .play-sp-card::before {
          content: '';
          position: absolute;
          top: 0; left: 15%; right: 15%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(252,211,77,0.7), transparent);
        }
        .play-sp-tier-badge {
          position: absolute;
          top: -1px; left: 50%;
          transform: translateX(-50%);
          background: rgba(12,4,22,0.95);
          border: 1px solid rgba(252,211,77,0.35);
          color: rgba(252,211,77,0.75);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 2px 10px;
          border-radius: 0 0 8px 8px;
          white-space: nowrap;
        }
        .play-sp-logo-col {
          display: flex;
          align-items: center;
          justify-content: center;
          padding-right: 10px;
          border-right: 1px solid rgba(255,255,255,0.07);
          height: 100%;
        }
        .play-sp-logo-box {
          background: rgba(255,255,255,0.97);
          border-radius: 8px;
          width: 72px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 3px 12px rgba(0,0,0,0.5);
          padding: 4px;
        }
        .play-sp-logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .play-sp-info-col {
          padding: 0 10px;
          min-width: 0;
        }
        .play-sp-sponsor-label {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          margin-bottom: 2px;
        }
        .play-sp-name {
          font-size: 18px;
          font-weight: 900;
          color: #fcd34d;
          letter-spacing: 1px;
          line-height: 1;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .play-sp-detail {
          font-size: 10px;
          color: rgba(255,255,255,0.7);
          font-weight: 600;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .play-sp-qr-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding-left: 10px;
          border-left: 1px solid rgba(255,255,255,0.07);
          height: 100%;
          justify-content: center;
        }
        .play-sp-qr-box {
          background: #fff;
          border-radius: 8px;
          padding: 4px;
          box-shadow: 0 3px 12px rgba(0,0,0,0.4);
        }
        .play-sp-qr-box img { display: block; border-radius: 4px; }
        .play-sp-qr-label {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          text-align: center;
        }
        .play-sp-progress {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          background: rgba(255,255,255,0.05);
        }
        .play-sp-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(252,211,77,0.4), rgba(252,211,77,0.9));
          border-radius: 0 2px 2px 0;
          transition: width 0.3s linear;
        }
      `}</style>
    </div>
  )
}
