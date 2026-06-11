'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Award, Plus, Pencil, Trash2, X, Clock, Repeat,
  CheckCircle, XCircle, DollarSign, TrendingUp,
} from 'lucide-react'
import {
  listSponsors, upsertSponsor, deleteSponsor,
  listSponsorSales, registerSponsorSale, updateSponsorSaleStatus,
  TIER_DEFAULT_AMOUNTS,
  type Sponsor, type SponsorInsert, type SponsorTier, type QrType,
  type SponsorSale, type SponsorPaymentMethod, type SponsorPaymentStatus,
} from '@/lib/sponsors'
import { formatCurrency } from '@/lib/utils'
import { loadConfig } from '@/lib/config'

const QR_LABELS: Record<QrType, string> = {
  site: '🌐 Site / URL',
  instagram: '📸 Instagram',
  whatsapp: '💬 WhatsApp',
}
const TIER_LABELS: Record<SponsorTier, string> = {
  simples: 'Simples', destaque: 'Destaque', personalizado: 'Personalizado',
}
const TIER_COLORS: Record<SponsorTier, string> = {
  simples: 'text-amber-400 border-amber-400/40 bg-amber-400/10',
  destaque: 'text-purple-300 border-purple-400/40 bg-purple-400/10',
  personalizado: 'text-green-300 border-green-400/40 bg-green-400/10',
}

interface SponsorFormState extends SponsorInsert {
  payment_method: SponsorPaymentMethod
  payment_status: SponsorPaymentStatus
}

const DEFAULT_FORM: SponsorFormState = {
  name: '', logo_url: '', contact_name: '', site_url: '', instagram_url: '',
  whatsapp_number: '', qr_type: 'site', tier: 'simples', sponsorship_amount: '100',
  appearances: 3, duration_seconds: 10, active: true,
  payment_method: 'pix', payment_status: 'pendente',
}

export default function PatrocinadoresPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [sales, setSales] = useState<SponsorSale[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<SponsorFormState>(DEFAULT_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [cfg, setCfg] = useState({ sponsorSimplesAppearances: 3, sponsorSimplesDuration: 10, sponsorDestaqueAppearances: 5, sponsorDestaqueDuration: 15, sponsorPersonalizadoDuration: 30 })

  useEffect(() => {
    const c = loadConfig()
    setCfg({ sponsorSimplesAppearances: c.sponsorSimplesAppearances, sponsorSimplesDuration: c.sponsorSimplesDuration, sponsorDestaqueAppearances: c.sponsorDestaqueAppearances, sponsorDestaqueDuration: c.sponsorDestaqueDuration, sponsorPersonalizadoDuration: c.sponsorPersonalizadoDuration })
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sp, sl] = await Promise.all([listSponsors(), listSponsorSales().catch(() => [])])
      setSponsors(sp)
      setSales(sl)
    } catch (e) {
      console.error('[Patrocinadores]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleTierChange = useCallback((tier: SponsorTier) => {
    const defaults: Record<SponsorTier, { appearances: number; duration_seconds: number; sponsorship_amount: string }> = {
      simples:       { appearances: cfg.sponsorSimplesAppearances,  duration_seconds: cfg.sponsorSimplesDuration,       sponsorship_amount: TIER_DEFAULT_AMOUNTS.simples },
      destaque:      { appearances: cfg.sponsorDestaqueAppearances, duration_seconds: cfg.sponsorDestaqueDuration,      sponsorship_amount: TIER_DEFAULT_AMOUNTS.destaque },
      personalizado: { appearances: 1,                              duration_seconds: cfg.sponsorPersonalizadoDuration, sponsorship_amount: TIER_DEFAULT_AMOUNTS.personalizado },
    }
    setForm(f => ({ ...f, tier, ...defaults[tier] }))
  }, [cfg])

  const openNew = useCallback(() => {
    setEditingId(null)
    setForm({ ...DEFAULT_FORM, appearances: cfg.sponsorSimplesAppearances, duration_seconds: cfg.sponsorSimplesDuration })
    setShowForm(true)
  }, [cfg])

  const openEdit = useCallback((s: Sponsor) => {
    setEditingId(s.id)
    setForm({ name: s.name, logo_url: s.logo_url, contact_name: s.contact_name, site_url: s.site_url, instagram_url: s.instagram_url, whatsapp_number: s.whatsapp_number, qr_type: s.qr_type, tier: s.tier, sponsorship_amount: s.sponsorship_amount, appearances: s.appearances, duration_seconds: s.duration_seconds, active: s.active, payment_method: 'pix', payment_status: 'pendente' })
    setShowForm(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const { payment_status, payment_method, ...sponsorPayload } = form
      const payload = editingId ? { ...sponsorPayload, id: editingId } : sponsorPayload
      const saved = await upsertSponsor(payload)

      if (!editingId && form.sponsorship_amount) {
        const amount = parseFloat(form.sponsorship_amount.replace(',', '.'))
        if (!isNaN(amount) && amount > 0) {
          const sl = await registerSponsorSale({ sponsor_id: saved.id, sponsor_name: saved.name, tier: saved.tier, amount, payment_method, payment_status, notes: null })
          setSales(prev => [sl, ...prev])
        }
      }

      setSponsors(prev => editingId ? prev.map(s => s.id === editingId ? saved : s) : [...prev, saved])
      setShowForm(false)
      setEditingId(null)
      setForm(DEFAULT_FORM)
      toast.success(editingId ? 'Patrocinador atualizado!' : 'Patrocinador salvo!')
    } catch (e) {
      console.error('[Sponsor Save]', e)
      const msg = (e as { message?: string })?.message ?? String(e)
      toast.error(msg.includes('does not exist') || msg.includes('relation') ? 'Execute a migration SQL no Supabase Dashboard primeiro.' : msg, { duration: 8000 })
    } finally {
      setSaving(false)
    }
  }, [form, editingId])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Remover este patrocinador?')) return
    setDeletingId(id)
    try {
      await deleteSponsor(id)
      setSponsors(prev => prev.filter(s => s.id !== id))
      toast.success('Patrocinador removido.')
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? 'Erro ao remover')
    } finally {
      setDeletingId(null) }
  }, [])

  const handleUpdateSaleStatus = useCallback(async (id: string, status: SponsorPaymentStatus) => {
    try {
      await updateSponsorSaleStatus(id, status)
      setSales(prev => prev.map(s => s.id === id ? { ...s, payment_status: status } : s))
      toast.success('Status atualizado!')
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? 'Erro ao atualizar')
    }
  }, [])

  const totalRecebido = sales.filter(s => s.payment_status === 'pago').reduce((sum, s) => sum + s.amount, 0)
  const totalPendente = sales.filter(s => s.payment_status === 'pendente').reduce((sum, s) => sum + s.amount, 0)
  const totalGeral = totalRecebido + totalPendente

  if (loading) return <div className="text-white/50 text-center py-20 font-display text-2xl">CARREGANDO...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl text-white tracking-widest">PATROCINADORES</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border border-yellow-400/30 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          <Plus size={16} /> Adicionar patrocinador
        </button>
      </div>

      {/* KPIs */}
      {sales.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={<Award size={16} />} label="Patrocinadores" value={String(sponsors.length)} color="purple" />
          <KpiCard icon={<DollarSign size={16} />} label="Total Contratado" value={formatCurrency(totalGeral)} color="blue" />
          <KpiCard icon={<CheckCircle size={16} />} label="Recebido" value={formatCurrency(totalRecebido)} color="green" />
          <KpiCard icon={<Clock size={16} />} label="Pendente" value={formatCurrency(totalPendente)} color="yellow" />
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-white/5 border border-yellow-400/20 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-yellow-400/5">
            <span className="text-yellow-300 font-bold text-sm flex items-center gap-2">
              <Award size={14} /> {editingId ? 'Editar patrocinador' : 'Novo patrocinador'}
            </span>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="text-white/30 hover:text-white/70"><X size={16} /></button>
          </div>
          <div className="p-5 space-y-4">
            {/* Nome + Tier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">Nome da empresa *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Padaria Central" className="w-full bg-white/7 border border-white/12 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400/40" />
              </div>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">Modalidade</label>
                <select value={form.tier} onChange={e => handleTierChange(e.target.value as SponsorTier)} className="w-full bg-white/7 border border-white/12 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/40" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <option value="simples" className="bg-[#3a1230]">Simples — R$ 100 · 3 aparições · 10s</option>
                  <option value="destaque" className="bg-[#3a1230]">Destaque — R$ 500 · 5 aparições · 15s</option>
                  <option value="personalizado" className="bg-[#3a1230]">Personalizado — A combinar</option>
                </select>
              </div>
            </div>

            {/* Logo + Contato */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">URL do logo</label>
                <input type="url" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." className="w-full bg-white/7 border border-white/12 rounded-xl px-3 py-2.5 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-yellow-400/40" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <p className="text-white/25 text-xs mt-1">Link direto para a imagem (PNG/JPG/SVG)</p>
              </div>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">Nome do contato</label>
                <input type="text" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Ex: João Silva" className="w-full bg-white/7 border border-white/12 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400/40" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>
            </div>

            {/* Site + Instagram */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">Site / URL</label>
                <input type="url" value={form.site_url} onChange={e => setForm(f => ({ ...f, site_url: e.target.value }))} placeholder="https://meusite.com.br" className="w-full bg-white/7 border border-white/12 rounded-xl px-3 py-2.5 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-yellow-400/40" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">Instagram</label>
                <input type="text" value={form.instagram_url} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))} placeholder="@empresa ou URL" className="w-full bg-white/7 border border-white/12 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400/40" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>
            </div>

            {/* WhatsApp + Valor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">WhatsApp (com DDI)</label>
                <input type="text" value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))} placeholder="5511999999999" className="w-full bg-white/7 border border-white/12 rounded-xl px-3 py-2.5 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-yellow-400/40" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">Valor do patrocínio (R$)</label>
                <input type="text" value={form.sponsorship_amount} onChange={e => setForm(f => ({ ...f, sponsorship_amount: e.target.value }))} placeholder="100" className="w-full bg-white/7 border border-white/12 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400/40" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>
            </div>

            {/* Forma de pagamento + Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">Forma de recebimento</label>
                <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value as SponsorPaymentMethod }))} className="w-full bg-white/7 border border-white/12 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/40" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <option value="pix" className="bg-[#3a1230]">PIX</option>
                  <option value="dinheiro" className="bg-[#3a1230]">Dinheiro</option>
                  <option value="cartao" className="bg-[#3a1230]">Cartão</option>
                  <option value="transferencia" className="bg-[#3a1230]">Transferência</option>
                  <option value="outro" className="bg-[#3a1230]">Outro</option>
                </select>
              </div>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">Status do pagamento</label>
                <select value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value as SponsorPaymentStatus }))} className="w-full bg-white/7 border border-white/12 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/40" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <option value="pendente" className="bg-[#3a1230]">Pendente</option>
                  <option value="pago" className="bg-[#3a1230]">Pago</option>
                  <option value="cancelado" className="bg-[#3a1230]">Cancelado</option>
                </select>
                {!editingId && <p className="text-white/25 text-xs mt-1">Registrado em vendas ao salvar</p>}
              </div>
            </div>

            {/* QR + Aparições + Duração */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">QR Code para</label>
                <select value={form.qr_type} onChange={e => setForm(f => ({ ...f, qr_type: e.target.value as QrType }))} className="w-full bg-white/7 border border-white/12 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/40" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <option value="site" className="bg-[#3a1230]">🌐 Site / URL</option>
                  <option value="instagram" className="bg-[#3a1230]">📸 Instagram</option>
                  <option value="whatsapp" className="bg-[#3a1230]">💬 WhatsApp</option>
                </select>
              </div>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">Aparições</label>
                <input type="number" min={1} max={20} value={form.appearances} onChange={e => setForm(f => ({ ...f, appearances: Number(e.target.value) }))} className="w-full bg-white/7 border border-white/12 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/40" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">Duração (s)</label>
                <input type="number" min={5} max={120} value={form.duration_seconds} onChange={e => setForm(f => ({ ...f, duration_seconds: Number(e.target.value) }))} className="w-full bg-white/7 border border-white/12 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/40" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>
            </div>

            {/* Toggle ativo */}
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <div>
                <div className="text-white font-semibold text-sm">Exibir no telão</div>
                <div className="text-white/40 text-xs">Desative para esconder sem excluir</div>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                className={`relative w-11 h-6 rounded-full border transition-all ${form.active ? 'bg-yellow-400/30 border-yellow-400/50' : 'bg-white/10 border-white/15'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${form.active ? 'left-5 bg-yellow-400' : 'left-0.5 bg-white/40'}`} />
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || saving}
                className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-[#3a1230] font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
              >
                {saving ? 'Salvando...' : <><CheckCircle size={15} /> Salvar patrocinador</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de patrocinadores */}
      {sponsors.length > 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 text-white/40 text-xs uppercase tracking-widest">
            {sponsors.length} patrocinador{sponsors.length !== 1 ? 'es' : ''}
          </div>
          <div className="divide-y divide-white/5">
            {sponsors.map(s => {
              const sponsorSalesList = sales.filter(sl => sl.sponsor_id === s.id)
              const pago = sponsorSalesList.filter(sl => sl.payment_status === 'pago').reduce((sum, sl) => sum + sl.amount, 0)
              const pendente = sponsorSalesList.filter(sl => sl.payment_status === 'pendente').reduce((sum, sl) => sum + sl.amount, 0)
              return (
                <div key={s.id} className={`px-5 py-4 flex items-center gap-4 ${!s.active ? 'opacity-50' : ''}`}>
                  <div className="w-14 h-10 rounded-lg bg-white/90 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {s.logo_url ? <img src={s.logo_url} alt={s.name} className="max-w-full max-h-full object-contain" /> : <span className="text-gray-400 text-xs font-bold">LOGO</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">{s.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${TIER_COLORS[s.tier]}`}>{TIER_LABELS[s.tier]}</span>
                      {!s.active && <span className="text-xs text-white/30 font-semibold">INATIVO</span>}
                    </div>
                    <div className="text-white/35 text-xs mt-1 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><Repeat size={10} />{s.appearances}× aparições</span>
                      <span className="flex items-center gap-1"><Clock size={10} />{s.duration_seconds}s</span>
                      {s.sponsorship_amount && <span className="text-yellow-400/60">R$ {s.sponsorship_amount}</span>}
                      <span>{QR_LABELS[s.qr_type]}</span>
                    </div>
                    {(pago > 0 || pendente > 0) && (
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        {pago > 0 && <span className="text-green-400">{formatCurrency(pago)} recebido</span>}
                        {pendente > 0 && <span className="text-yellow-400">{formatCurrency(pendente)} pendente</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} className="p-2 rounded-lg hover:bg-red-400/10 text-white/30 hover:text-red-400 transition-colors disabled:opacity-40"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : !showForm ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-white/30">
          Nenhum patrocinador cadastrado ainda.
        </div>
      ) : null}

      {/* Histórico de recebimentos */}
      {sales.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
            <TrendingUp size={14} className="text-yellow-400" />
            <span className="text-white font-semibold text-sm">Histórico de recebimentos</span>
          </div>
          <div className="divide-y divide-white/5">
            {sales.map(sl => {
              const scfg = {
                pago:      { color: 'text-green-400 bg-green-400/10 border-green-400/20', label: 'Pago',      icon: <CheckCircle size={11} /> },
                pendente:  { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', label: 'Pendente', icon: <Clock size={11} /> },
                cancelado: { color: 'text-red-400 bg-red-400/10 border-red-400/20', label: 'Cancelado',  icon: <XCircle size={11} /> },
              }[sl.payment_status]
              return (
                <div key={sl.id} className="px-5 py-3 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{sl.sponsor_name}</div>
                    <div className="text-white/40 text-xs mt-0.5">
                      {TIER_LABELS[sl.tier as SponsorTier] ?? sl.tier} · {sl.payment_method?.toUpperCase()} · {new Date(sl.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-white font-semibold">{formatCurrency(sl.amount)}</div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${scfg.color}`}>
                    {scfg.icon} {scfg.label}
                  </div>
                  {sl.payment_status === 'pendente' && (
                    <button onClick={() => handleUpdateSaleStatus(sl.id, 'pago')} className="text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 px-3 py-1 rounded-lg transition-colors">
                      Marcar Pago
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: 'green' | 'yellow' | 'blue' | 'purple' }) {
  const colors = { green: 'text-green-400', yellow: 'text-yellow-400', blue: 'text-blue-400', purple: 'text-purple-400' }
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className={`flex items-center gap-1.5 mb-2 ${colors[color]}`}>{icon}<span className="text-xs text-white/50">{label}</span></div>
      <div className="text-white font-bold text-lg">{value}</div>
    </div>
  )
}
