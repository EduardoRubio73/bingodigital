'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BingoCard } from '@/lib/supabase/types'

export function useBingoCard(cardId: string | null) {
  const [card, setCard] = useState<BingoCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchCard = useCallback(async () => {
    if (!cardId) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('cards')
      .select('id, event_id, player_name, numbers, marked_numbers, bingo_claimed_at, created_at')
      .eq('id', cardId)
      .single()
    setCard(data)
    setLoading(false)
  }, [cardId])

  useEffect(() => { fetchCard() }, [fetchCard])

  const toggleNumber = useCallback(async (num: number) => {
    if (!card) return
    const isMarked = card.marked_numbers.includes(num)
    const updated = isMarked
      ? card.marked_numbers.filter(n => n !== num)
      : [...card.marked_numbers, num]

    setCard(prev => prev ? { ...prev, marked_numbers: updated } : prev)

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('cards')
      .update({ marked_numbers: updated })
      .eq('id', card.id)
    if (error) {
      console.error('[useBingoCard]', error)
      setCard(prev => prev ? { ...prev, marked_numbers: card.marked_numbers } : prev)
    }
    setSaving(false)
  }, [card])

  const claimBingo = useCallback(async () => {
    if (!card) return
    const supabase = createClient()
    const { error } = await supabase
      .from('cards')
      .update({ bingo_claimed_at: new Date().toISOString() })
      .eq('id', card.id)
    if (error) { console.error('[useBingoCard claimBingo]', error); return }
    setCard(prev => prev ? { ...prev, bingo_claimed_at: new Date().toISOString() } : prev)
  }, [card])

  return { card, loading, saving, toggleNumber, claimBingo }
}
