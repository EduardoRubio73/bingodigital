'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BingoEvent } from '@/lib/supabase/types'

export function useEvent(eventId: string | null) {
  const [event, setEvent] = useState<BingoEvent | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchEvent = useCallback(async () => {
    if (!eventId) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('events')
      .select('id, name, status, win_condition, drawn_numbers, created_at, price_per_card, max_cards, cards_sold, prize_conditions')
      .eq('id', eventId)
      .single()
    setEvent(data)
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    fetchEvent()
    if (!eventId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`event-${eventId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'events',
        filter: `id=eq.${eventId}`,
      }, payload => setEvent(payload.new as BingoEvent))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [eventId, fetchEvent])

  return { event, loading, refetch: fetchEvent }
}
