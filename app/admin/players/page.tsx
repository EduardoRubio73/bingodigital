'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BingoEvent, BingoCard } from '@/lib/supabase/types'
import QRCode from 'qrcode'
import Link from 'next/link'

export default function PlayersPage() {
  const [event, setEvent] = useState<BingoEvent | null>(null)
  const [cards, setCards] = useState<BingoCard[]>([])
  const [loading, setLoading] = useState(true)
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => { setBaseUrl(window.location.origin) }, [])

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: ev } = await supabase
      .from('events')
      .select('id, name, status, win_condition, drawn_numbers, created_at')
      .in('status', ['active', 'setup'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setEvent(ev)

    if (ev) {
      const { data: cs } = await supabase
        .from('cards')
        .select('id, event_id, player_name, numbers, marked_numbers, bingo_claimed_at, created_at')
        .eq('event_id', ev.id)
        .order('created_at', { ascending: true })
      setCards(cs ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const generateQR = useCallback(async (cardId: string, type: 'normal' | 'elderly') => {
    const url = `${baseUrl}/${type === 'elderly' ? 'card-elderly' : 'card'}/${cardId}`
    const key = `${cardId}-${type}`
    if (qrCodes[key]) return
    const qr = await QRCode.toDataURL(url, { width: 256, margin: 1, color: { dark: '#5C1F47', light: '#ffffff' } })
    setQrCodes(prev => ({ ...prev, [key]: qr }))
  }, [baseUrl, qrCodes])

  const downloadQR = useCallback((dataUrl: string, playerName: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `cartela-${playerName.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
  }, [])

  if (loading) return <div className="text-white/60 text-center py-20 font-display text-2xl">CARREGANDO...</div>

  if (!event) {
    return (
      <div className="text-center py-20">
        <h2 className="font-display text-white text-3xl mb-4">NENHUM EVENTO</h2>
        <Link href="/admin/setup" className="inline-block bg-[#fcd34d] text-[#5C1F47] font-bold px-6 py-3 rounded-xl">
          Criar Evento
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-white text-4xl">CARTELAS</h1>
        <p className="text-white/50 mt-1">{event.name} · {cards.length} jogadores</p>
      </div>

      <div className="grid gap-3">
        {cards.map(card => {
          const normalUrl = `${baseUrl}/card/${card.id}`
          const elderlyUrl = `${baseUrl}/card-elderly/${card.id}`
          const qrKey = `${card.id}-normal`

          return (
            <div key={card.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="ball ball-yellow w-10 h-10 flex items-center justify-center font-display text-lg flex-shrink-0">
                    {cards.indexOf(card) + 1}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{card.player_name}</p>
                    {card.bingo_claimed_at && (
                      <p className="text-green-400 text-xs">🏆 BINGO às {new Date(card.bingo_claimed_at).toLocaleTimeString('pt-BR')}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={normalUrl} target="_blank"
                    className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20 transition-colors">
                    Cartela Normal
                  </Link>
                  <Link href={elderlyUrl} target="_blank"
                    className="px-3 py-1.5 bg-[#fcd34d]/20 text-[#fcd34d] rounded-lg text-xs hover:bg-[#fcd34d]/30 transition-colors">
                    Versão Idoso
                  </Link>
                  <button
                    onClick={() => {
                      generateQR(card.id, 'normal')
                      if (qrCodes[qrKey]) downloadQR(qrCodes[qrKey], card.player_name)
                    }}
                    className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20 transition-colors"
                  >
                    {qrCodes[qrKey] ? '⬇ Baixar QR' : '📷 Gerar QR'}
                  </button>
                </div>
              </div>

              {qrCodes[qrKey] && (
                <div className="mt-3 flex gap-3 items-center">
                  <img src={qrCodes[qrKey]} alt="QR" className="w-16 h-16 rounded-lg" />
                  <p className="text-white/40 text-xs break-all">{normalUrl}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
