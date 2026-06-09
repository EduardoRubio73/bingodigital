export type EventStatus = 'setup' | 'active' | 'finished'
export type WinConditionType = 'line' | 'column' | 'diagonal' | 'full_card'
export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao' | 'outro'
export type PaymentStatus = 'pendente' | 'pago' | 'cancelado'

export interface PrizeCondition {
  condition: WinConditionType
  label: string
  prize: string
  won_by_card: string | null   // alphanumeric_code da cartela vencedora
  won_by_name: string | null   // nome do jogador vencedor
  won_at: string | null        // ISO timestamp
}

export interface BingoEvent {
  id: string
  name: string
  status: EventStatus
  win_condition: WinConditionType  // legado — mantido para compatibilidade
  drawn_numbers: number[]
  price_per_card: number
  max_cards: number
  cards_sold: number
  prize_conditions: PrizeCondition[]
  created_at: string
}

export interface BingoCard {
  id: string
  event_id: string
  player_name: string
  numbers: number[]
  marked_numbers: number[]
  bingo_claimed_at: string | null
  alphanumeric_code: string | null
  sale_id: string | null
  sequence_number: number | null
  created_at: string
}

export interface CardSale {
  id: string
  event_id: string
  buyer_name: string
  buyer_contact: string | null
  quantity: number
  amount_paid: number
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  registered_by: string | null
  notes: string | null
  created_at: string
  // join
  cards?: BingoCard[]
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
      card_sales: {
        Row: CardSale
        Insert: Omit<CardSale, 'id' | 'created_at' | 'cards'>
        Update: Partial<Omit<CardSale, 'id' | 'created_at' | 'cards'>>
      }
    }
  }
}
