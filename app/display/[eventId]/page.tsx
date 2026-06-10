'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useEvent } from '@/hooks/useEvent'
import { speakNumber, type TensionLevel } from '@/lib/tts'
import { loadConfig } from '@/lib/config'
import { createClient } from '@/lib/supabase/client'
import { listSponsors, buildPlaylist, getQrUrl, type Sponsor } from '@/lib/sponsors'

// Bingo card has 25 squares (5x5 flat array). Index 12 = free space.
const FREE_IDX = 12

// All 12 lines in a 5×5 bingo card (5 rows + 5 cols + 2 diagonals)
const BINGO_LINES = [
  [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24],
  [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24],
  [0,6,12,18,24], [4,8,12,16,20],
] as const

function calcMinNeeded(numbers: number[], drawn: Set<number>, winCondition: string): number {
  if (winCondition === 'full_card') {
    let needed = 0
    for (let i = 0; i < 25; i++) {
      if (i === FREE_IDX) continue
      if (!drawn.has(numbers[i])) needed++
    }
    return needed
  }
  // Any line (default)
  let minNeeded = 5
  for (const line of BINGO_LINES) {
    let needed = 0
    for (const idx of line) {
      if (idx === FREE_IDX) continue
      if (!drawn.has(numbers[idx])) needed++
    }
    if (needed < minNeeded) minNeeded = needed
    if (minNeeded === 0) break
  }
  return minNeeded
}

async function getProximity(
  eventId: string,
  drawnNumbers: number[],
  winCondition: string
): Promise<TensionLevel> {
  const supabase = createClient()
  const { data: cards } = await supabase
    .from('cards')
    .select('numbers')
    .eq('event_id', eventId)

  if (!cards?.length) return 'normal'

  const drawn = new Set(drawnNumbers)
  let minNeeded = 99

  for (const card of cards) {
    const nums: number[] = card.numbers
    if (!Array.isArray(nums) || nums.length < 25) continue
    const needed = calcMinNeeded(nums, drawn, winCondition)
    if (needed < minNeeded) minNeeded = needed
    if (minNeeded <= 1) break
  }

  if (minNeeded <= 1) return 'climax'
  if (minNeeded <= 2) return 'dramatic'
  if (minNeeded <= 3) return 'alert'
  return 'normal'
}

export default function DisplayPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { event, loading } = useEvent(eventId)
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)
  const [animKey, setAnimKey] = useState(0)
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'speaking' | 'error'>('idle')
  const [tensionLevel, setTensionLevel] = useState<TensionLevel>('normal')
  const prevLengthRef = useRef(0)
  const speakingRef = useRef(false)

  // Sponsor rotation state
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [playlist, setPlaylist] = useState<Sponsor[]>([])
  const [sponsorSlot, setSponsorSlot] = useState(0)
  const [sponsorCycle, setSponsorCycle] = useState(0)
  const [sponsorProgress, setSponsorProgress] = useState(0)

  const triggerSpeak = useCallback(async (num: number, tension: TensionLevel) => {
    const cfg = loadConfig()
    if (!cfg.ttsEnabled || !cfg.geminiApiKey) return
    if (speakingRef.current) return
    speakingRef.current = true
    setTtsStatus('speaking')
    try {
      await speakNumber(num, cfg.geminiApiKey, cfg.voiceName, cfg.ttsPrefix, tension)
      setTtsStatus('idle')
    } catch (err) {
      console.error('[TTS]', err)
      setTtsStatus('error')
      setTimeout(() => setTtsStatus('idle'), 3000)
    } finally {
      speakingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!event?.drawn_numbers?.length) return
    if (event.drawn_numbers.length <= prevLengthRef.current) return

    const latest = event.drawn_numbers[event.drawn_numbers.length - 1]
    setCurrentNumber(latest)
    setAnimKey(k => k + 1)
    prevLengthRef.current = event.drawn_numbers.length

    // Check proximity to determine drama level, then speak
    getProximity(eventId, event.drawn_numbers, event.win_condition ?? 'line')
      .then(tension => {
        setTensionLevel(tension)
        triggerSpeak(latest, tension)
      })
      .catch(() => triggerSpeak(latest, 'normal'))
  }, [event?.drawn_numbers, eventId, event?.win_condition, triggerSpeak])

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  // Load sponsors on mount
  useEffect(() => {
    listSponsors().then(setSponsors).catch(console.error)
  }, [])

  // Rebuild playlist when sponsors change or cycle resets
  useEffect(() => {
    if (!sponsors.length) return
    setPlaylist(buildPlaylist(sponsors))
    setSponsorSlot(0)
    setSponsorProgress(0)
  }, [sponsors, sponsorCycle])

  // Sponsor rotation timer
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
      if (next >= playlist.length) {
        setSponsorCycle(c => c + 1)
      } else {
        setSponsorSlot(next)
        setSponsorProgress(0)
      }
    }, durationMs)

    return () => { clearInterval(progressId); clearTimeout(timerId) }
  }, [sponsorSlot, playlist])

  const cfg = loadConfig()
  const activeSponsor = playlist.length > 0 ? playlist[sponsorSlot] : null

  const TIER_BADGE: Record<string, string> = {
    simples: 'SIMPLES', destaque: '⭐ DESTAQUE', personalizado: '✦ PERSONALIZADO',
  }
  const QR_LABEL: Record<string, string> = {
    site: 'SITE', instagram: 'INSTAGRAM', whatsapp: 'WHATSAPP',
  }

  if (loading || !event) {
    return (
      <div className="min-h-screen brand-bg flex items-center justify-center">
        <p className="font-display text-white/40 text-4xl">AGUARDANDO EVENTO...</p>
      </div>
    )
  }

  const last5 = [...event.drawn_numbers].reverse().slice(0, 5)

  const tensionColors: Record<TensionLevel, string> = {
    normal:   'text-white/30 bg-white/5 border-white/10',
    alert:    'text-yellow-300 bg-yellow-400/10 border-yellow-400/30',
    dramatic: 'text-orange-300 bg-orange-400/10 border-orange-400/30 animate-pulse',
    climax:   'text-red-300 bg-red-400/10 border-red-400/30 animate-pulse',
  }

  const tensionIcons: Record<TensionLevel, string> = {
    normal:   ttsStatus === 'speaking' ? '🔊' : ttsStatus === 'error' ? '⚠️' : '🔈',
    alert:    '⚡',
    dramatic: '🥁',
    climax:   '🚨',
  }

  const tensionLabels: Record<TensionLevel, string> = {
    normal:   ttsStatus === 'speaking' ? 'Anunciando...' : ttsStatus === 'error' ? 'Erro de voz' : 'Voz ativa',
    alert:    'Alguém chegando perto!',
    dramatic: 'Suspense! 2 para o bingo!',
    climax:   '🚨 1 número para o BINGO!',
  }

  const qrUrl = activeSponsor ? getQrUrl(activeSponsor) : ''

  return (
    <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
      @keyframes spSlideUp {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .sp-card {
        position: relative;
        display: grid;
        grid-template-columns: 200px 1fr auto;
        gap: 0;
        align-items: center;
        background: linear-gradient(135deg, rgba(18,6,30,0.98), rgba(12,4,22,0.99));
        border-top: 2px solid rgba(252,211,77,0.6);
        border-left: 1px solid rgba(252,211,77,0.15);
        border-right: 1px solid rgba(252,211,77,0.15);
        border-bottom: 1px solid rgba(252,211,77,0.15);
        border-radius: 14px;
        padding: 18px 24px;
        overflow: hidden;
        box-shadow: 0 -8px 40px rgba(252,211,77,0.06), inset 0 1px 0 rgba(252,211,77,0.12);
        animation: spSlideUp 0.45s cubic-bezier(0.22,1,0.36,1) both;
      }
      .sp-card::before {
        content: '';
        position: absolute;
        top: 0; left: 15%; right: 15%;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(252,211,77,0.7), transparent);
      }
      .sp-tier-badge {
        position: absolute;
        top: -1px; left: 50%;
        transform: translateX(-50%);
        background: rgba(12,4,22,0.95);
        border: 1px solid rgba(252,211,77,0.35);
        color: rgba(252,211,77,0.75);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 3px;
        text-transform: uppercase;
        padding: 2px 14px;
        border-radius: 0 0 10px 10px;
        white-space: nowrap;
      }
      .sp-logo-col {
        display: flex;
        align-items: center;
        justify-content: center;
        padding-right: 24px;
        border-right: 1px solid rgba(255,255,255,0.07);
        height: 100%;
      }
      .sp-logo-box {
        background: rgba(255,255,255,0.97);
        border-radius: 10px;
        width: 160px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        padding: 8px;
      }
      .sp-logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
      .sp-logo-placeholder { font-size: 36px; opacity: 0.3; }
      .sp-info-col {
        padding: 0 28px;
      }
      .sp-sponsor-label {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 4px;
        text-transform: uppercase;
        color: rgba(255,255,255,0.25);
        margin-bottom: 4px;
      }
      .sp-name {
        font-family: 'Bebas Neue', var(--font-display), sans-serif;
        font-size: clamp(28px, 3.5vw, 52px);
        color: #fcd34d;
        letter-spacing: 2px;
        line-height: 1;
        margin-bottom: 8px;
      }
      .sp-detail {
        font-size: clamp(12px, 1.4vw, 17px);
        color: rgba(255,255,255,0.75);
        font-weight: 600;
        margin-bottom: 3px;
        letter-spacing: 0.2px;
      }
      .sp-qr-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding-left: 24px;
        border-left: 1px solid rgba(255,255,255,0.07);
        height: 100%;
        justify-content: center;
      }
      .sp-qr-box {
        background: #fff;
        border-radius: 10px;
        padding: 6px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      }
      .sp-qr-box img { display: block; border-radius: 6px; }
      .sp-qr-label {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 2.5px;
        text-transform: uppercase;
        color: rgba(255,255,255,0.3);
        text-align: center;
      }
      .sp-progress {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 2px;
        background: rgba(255,255,255,0.05);
      }
      .sp-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, rgba(252,211,77,0.4), rgba(252,211,77,0.9));
        border-radius: 0 2px 2px 0;
        transition: width 0.3s linear;
      }
    `}</style>
    <div className="min-h-screen brand-bg flex flex-col select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎰</span>
          <span className="font-display text-white text-2xl tracking-widest">{event.name}</span>
        </div>
        <div className="flex items-center gap-4">
          {cfg.ttsEnabled && (
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all ${
              tensionLevel !== 'normal'
                ? tensionColors[tensionLevel]
                : ttsStatus === 'speaking'
                  ? 'text-yellow-300 bg-yellow-400/10 border-yellow-400/30 animate-pulse'
                  : ttsStatus === 'error'
                  ? 'text-red-400 bg-red-400/10 border-red-400/30'
                  : tensionColors.normal
            }`}>
              <span>{tensionIcons[tensionLevel]}</span>
              <span>{tensionLabels[tensionLevel]}</span>
            </div>
          )}
          <div className="text-white/40 font-display text-xl">
            {event.drawn_numbers.length} / 75
          </div>
        </div>
      </div>

      {/* Corpo principal */}
      <div className="flex-1 flex gap-6 p-8">
        {/* Coluna esquerda: número atual */}
        <div className="flex flex-col items-center justify-center w-80 flex-shrink-0">
          <p className="text-white/40 text-sm uppercase tracking-widest mb-6 font-medium">Número Atual</p>
          {currentNumber ? (
            <div
              key={animKey}
              className={`ball w-52 h-52 flex items-center justify-center font-display text-8xl animate-ball-pop ${
                tensionLevel === 'climax'   ? 'ball-red'    :
                tensionLevel === 'dramatic' ? 'ball-orange' :
                tensionLevel === 'alert'    ? 'ball-purple' :
                'ball-yellow'
              }`}
            >
              {currentNumber}
            </div>
          ) : (
            <div className="ball ball-gray w-52 h-52 flex items-center justify-center font-display text-6xl text-gray-400">
              —
            </div>
          )}

          {/* Últimos 4 */}
          <div className="mt-8 w-full">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-3 text-center">Anteriores</p>
            <div className="flex justify-center gap-2">
              {last5.slice(1).map((n, i) => (
                <div
                  key={n}
                  className="ball ball-purple w-12 h-12 flex items-center justify-center font-display text-xl"
                  style={{ opacity: 1 - i * 0.2 }}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grade 1-75 */}
        <div className="flex-1 flex flex-col">
          <p className="text-white/40 text-sm uppercase tracking-widest mb-4 font-medium">Todos os Números</p>
          <div className="grid grid-cols-[repeat(15,1fr)] gap-1.5 flex-1 content-start">
            {Array.from({ length: 75 }, (_, i) => i + 1).map(n => {
              const isDrawn = event.drawn_numbers.includes(n)
              const isCurrent = n === currentNumber
              return (
                <div
                  key={n}
                  className={`aspect-square flex items-center justify-center rounded-lg font-display text-sm transition-all ${
                    isCurrent
                      ? `ball font-bold animate-ball-pop ${
                          tensionLevel === 'climax'   ? 'ball-red text-white'    :
                          tensionLevel === 'dramatic' ? 'ball-orange text-white' :
                          'ball-yellow text-[#5C1F47]'
                        }`
                      : isDrawn
                      ? 'bg-[#fcd34d]/30 text-[#fcd34d] font-bold'
                      : 'bg-white/5 text-white/20'
                  }`}
                >
                  {n}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Sponsor banner */}
      {activeSponsor && (
        <div key={`${activeSponsor.id}-${sponsorCycle}-${sponsorSlot}`} className="px-6 pb-3">
          <div className="sp-card">
            <div className="sp-tier-badge">{TIER_BADGE[activeSponsor.tier] ?? activeSponsor.tier}</div>

            {/* Logo */}
            <div className="sp-logo-col">
              <div className="sp-logo-box">
                {activeSponsor.logo_url
                  ? <img src={activeSponsor.logo_url} alt={activeSponsor.name} />
                  : <span className="sp-logo-placeholder">🏢</span>
                }
              </div>
            </div>

            {/* Info */}
            <div className="sp-info-col">
              <div className="sp-sponsor-label">Patrocinador</div>
              <div className="sp-name">{activeSponsor.name}</div>
              {activeSponsor.contact_name && <div className="sp-detail">👤 {activeSponsor.contact_name}</div>}
              {activeSponsor.site_url && (
                <div className="sp-detail">🌐 {activeSponsor.site_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</div>
              )}
              {activeSponsor.whatsapp_number && <div className="sp-detail">💬 {activeSponsor.whatsapp_number}</div>}
              {activeSponsor.instagram_url && <div className="sp-detail">📸 {activeSponsor.instagram_url.startsWith('@') ? activeSponsor.instagram_url : `@${activeSponsor.instagram_url.replace(/.*instagram\.com\//, '').replace(/\/.*/, '')}`}</div>}
            </div>

            {/* QR Code */}
            <div className="sp-qr-col">
              {qrUrl ? (
                <>
                  <div className="sp-qr-box">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&bgcolor=ffffff&color=120620&qzone=1&data=${encodeURIComponent(qrUrl)}`}
                      alt="QR Code"
                      width={120}
                      height={120}
                    />
                  </div>
                  <div className="sp-qr-label">{QR_LABEL[activeSponsor.qr_type] ?? 'ACESSE'}</div>
                </>
              ) : (
                <div style={{ width: 120, height: 120, background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }} />
              )}
            </div>

            {/* Progress bar */}
            <div className="sp-progress">
              <div className="sp-progress-fill" style={{ width: `${sponsorProgress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-8 py-3 border-t border-white/10 flex items-center justify-between">
        <p className="text-white/30 text-xs">{cfg.orgName1}</p>
        <p className="text-white/30 text-xs capitalize">
          {event.prize_conditions?.length
            ? `${event.prize_conditions.filter((p: { won_at: string | null }) => p.won_at).length}/${event.prize_conditions.length} prêmios entregues`
            : `Condição: ${event.win_condition?.replace('_', ' ')}`}
        </p>
        {event.status === 'finished' && (
          <div className="absolute inset-0 brand-bg/95 flex items-center justify-center">
            <p className="font-display text-[#fcd34d] text-8xl animate-celebrate">FIM DE JOGO!</p>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
