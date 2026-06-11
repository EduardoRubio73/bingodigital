import { createClient } from '@/lib/supabase/client'

export type QrType = 'site' | 'instagram' | 'whatsapp'
export type SponsorTier = 'simples' | 'destaque' | 'personalizado'
export type SponsorPaymentMethod = 'pix' | 'dinheiro' | 'cartao' | 'transferencia' | 'outro'
export type SponsorPaymentStatus = 'pendente' | 'pago' | 'cancelado'

export interface Sponsor {
  id: string
  name: string
  logo_url: string
  contact_name: string
  site_url: string
  instagram_url: string
  whatsapp_number: string
  qr_type: QrType
  tier: SponsorTier
  sponsorship_amount: string
  appearances: number
  duration_seconds: number
  active: boolean
  created_at: string
}

export type SponsorInsert = Omit<Sponsor, 'id' | 'created_at'>

export interface SponsorSale {
  id: string
  sponsor_id: string | null
  sponsor_name: string
  tier: string
  amount: number
  payment_method: SponsorPaymentMethod
  payment_status: SponsorPaymentStatus
  notes: string | null
  created_at: string
}

export type SponsorSaleInsert = Omit<SponsorSale, 'id' | 'created_at'>

// Preços padrão por tier
export const TIER_DEFAULT_AMOUNTS: Record<SponsorTier, string> = {
  simples: '100',
  destaque: '500',
  personalizado: '',
}

const COLS = 'id, name, logo_url, contact_name, site_url, instagram_url, whatsapp_number, qr_type, tier, sponsorship_amount, appearances, duration_seconds, active, created_at'
const SALE_COLS = 'id, sponsor_id, sponsor_name, tier, amount, payment_method, payment_status, notes, created_at'

export async function listSponsors(): Promise<Sponsor[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sponsors')
    .select(COLS)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Sponsor[]
}

export async function upsertSponsor(
  sponsor: SponsorInsert & { id?: string }
): Promise<Sponsor> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sponsors')
    .upsert(sponsor)
    .select(COLS)
    .single()
  if (error) throw error
  return data as Sponsor
}

export async function deleteSponsor(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('sponsors')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function registerSponsorSale(sale: SponsorSaleInsert): Promise<SponsorSale> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sponsor_sales')
    .insert(sale)
    .select(SALE_COLS)
    .single()
  if (error) throw error
  return data as SponsorSale
}

export async function listSponsorSales(): Promise<SponsorSale[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sponsor_sales')
    .select(SALE_COLS)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as SponsorSale[]
}

export async function updateSponsorSaleStatus(
  id: string,
  status: SponsorPaymentStatus,
  amount?: number
): Promise<void> {
  const supabase = createClient()
  const update: Partial<SponsorSale> = { payment_status: status }
  if (amount !== undefined) update.amount = amount
  const { error } = await supabase
    .from('sponsor_sales')
    .update(update)
    .eq('id', id)
  if (error) throw error
}

export function getQrUrl(sponsor: Sponsor): string {
  if (sponsor.qr_type === 'instagram' && sponsor.instagram_url) {
    const handle = sponsor.instagram_url
      .replace(/^@/, '')
      .replace(/.*instagram\.com\//, '')
      .replace(/\/.*/, '')
    return `https://instagram.com/${handle}`
  }
  if (sponsor.qr_type === 'whatsapp' && sponsor.whatsapp_number) {
    return `https://wa.me/${sponsor.whatsapp_number.replace(/\D/g, '')}`
  }
  return sponsor.site_url || ''
}

export function buildPlaylist(sponsors: Sponsor[]): Sponsor[] {
  const active = sponsors.filter(s => s.active)
  const playlist: Sponsor[] = []
  for (const s of active) {
    for (let i = 0; i < Math.max(1, s.appearances); i++) playlist.push(s)
  }
  // Fisher-Yates shuffle
  for (let i = playlist.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[playlist[i], playlist[j]] = [playlist[j], playlist[i]]
  }
  return playlist
}
