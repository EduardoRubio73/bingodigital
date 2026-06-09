export type EventStatus = 'setup' | 'active' | 'finished'
export type WinCondition = 'line' | 'column' | 'diagonal' | 'full_card'

export interface BingoEvent {
  id: string
  name: string
  status: EventStatus
  win_condition: WinCondition
  drawn_numbers: number[]
  created_at: string
}

export interface BingoCard {
  id: string
  event_id: string
  player_name: string
  numbers: number[]
  marked_numbers: number[]
  bingo_claimed_at: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      events: {
        Row: BingoEvent
        Insert: Omit<BingoEvent, 'id' | 'created_at'>
        Update: Partial<Omit<BingoEvent, 'id' | 'created_at'>>
      }
      cards: {
        Row: BingoCard
        Insert: Omit<BingoCard, 'id' | 'created_at'>
        Update: Partial<Omit<BingoCard, 'id' | 'created_at'>>
      }
    }
  }
}
