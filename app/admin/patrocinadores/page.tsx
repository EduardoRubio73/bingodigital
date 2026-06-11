'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Award, Plus, Pencil, Trash2, X, Clock, Repeat,
  CheckCircle, XCircle, DollarSign, TrendingUp, Banknote,
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
  site: '🌐 Site / URL', instagram: '📸 Instagram', whatsapp: '💬 WhatsApp',
}
const TIER_LABELS: Record<SponsorTier, string> = {
  simples: 'Simples', destaque: 'Destaque', personalizado: 'Personalizado',
}
const TIER_COLORS: Record<SponsorTier, string> = {
  simples: 'text-amber-400 border-amber-400/40 bg-amber-400/10',
  destaque: 'text-purple-300 border-purple-400/40 bg-purple-400/10',
  personalizado: 'text-green-300 border-green-400/40 bg-green-400/10',
}

const STATUS_CFG: Record<SponsorPaymentStatus, { color: string; label: string; icon: React.ReactNode }> = {
  pago:      { color: 'text-green-400 bg-green-400/10 border-green-400/30',   label: 'Pago',      icon: <CheckCircle size={11} /> },
  pendente:  { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', label: 'Pendente',  icon: <Clock size={11} /> },
  cancelado: { color: 'text-red-400 bg-red-400/10 border-red-400/30',          label: 'Cancelado', icon: <XCircle size={11} /> },
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

const field = 'w-full rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none transition-colors'
const fieldStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }
const fieldFocusStyle = { background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(252,211,77,0.4)' }

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      className={field}
      style={focused ? fieldFocusStyle : fieldStyle}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

function StyledSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      {...props}
      className={field}
      style={{ ...(focused ? fieldFocusStyle : fieldStyle), cursor: 'pointer' }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

export default function PatrocinadoresPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [sales, setSales] = useState<SponsorSale[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<SponsorFormState>(DEFAULT_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [cfg, setCfg] = useState({
    sponsorSimplesAppearances: 3, sponsorSimplesDuration: 10,
    sponsorDestaqueAppearances: 5, sponsorDestaqueDuration: 15,
    sponsorPersonalizadoDuration: 30,
  })

  useEffect(() => {
    const c = loadConfig()
    setCfg({
      sponsorSimplesAppearances: c.sponsorSimplesAppearances,
      sponsorSimplesDuration: c.sponsorSimplesDuration,
      sponsorDestaqueAppearances: c.sponsorDestaqueAppearances,
      sponsorDestaqueDuration: c.sponsorDestaqueDuration,
      sponsorPersonalizadoDuration: c.sponsorPersonalizadoDuration,
    })
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
    setEditingSaleId(null)
    setForm({ ...DEFAULT_FORM, appearances: cfg.sponsorSimplesAppearances, duration_seconds: cfg.sponsorSimplesDuration })
    setShowForm(true)
  }, [cfg])

  const openEdit = useCallback((s: Sponsor, allSales: SponsorSale[]) => {
    setEditingId(s.id)
    // Busca a venda mais recente deste patrocinador para pré-preencher status
    const existingSale = allSales
      .filter(sl => sl.sponsor_id === s.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    setEditingSaleId(existingSale?.id ?? null)
    setForm({
      name: s.name,
      logo_url: s.logo_url,
      contact_name: s.contact_name,
      site_url: s.site_url,
      instagram_url: s.instagram_url,
      whatsapp_number: s.whatsapp_number,
      qr_type: s.qr_type,
      tier: s.tier,
      sponsorship_amount: s.sponsorship_amount,
      appearances: s.appearances,
      duration_seconds: s.duration_seconds,
      active: s.active,
      payment_method: (existingSale?.payment_method ?? 'pix') as SponsorPaymentMethod,
      payment_status: (existingSale?.payment_status ?? 'pendente') as SponsorPaymentStatus,
    })
    setShowForm(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const { payment_status, payment_method, ...sponsorPayload } = form
      const payload = editingId ? { ...sponsorPayload, id: editingId } : sponsorPayload
      const saved = await upsertSponsor(payload)

      const amount = parseFloat(form.sponsorship_amount.replace(',', '.') || '0')

      if (!editingId) {
        // Novo patrocinador: cria sponsor_sale se tiver valor
        if (!isNaN(amount) && amount > 0) {
          const sl = await registerSponsorSale({
            sponsor_id: saved.id,
            sponsor_name: saved.name,
            tier: saved.tier,
            amount,
            payment_method,
            payment_status,
            notes: null,
          })
          setSales(prev => [sl, ...prev])
        }
      } else {
        // Editando: atualiza sale existente ou cria novo
        if (editingSaleId) {
          await updateSponsorSaleStatus(editingSaleId, payment_status, isNaN(amount) ? undefined : amount, payment_method)
          setSales(prev => prev.map(s => s.id === editingSaleId ? { ...s, payment_status, amount: isNaN(amount) ? s.amount : amount, payment_method } : s))
        } else if (!isNaN(amount) && amount > 0) {
          const sl = await registerSponsorSale({
            sponsor_id: saved.id,
            sponsor_name: saved.name,
            tier: saved.tier,
            amount,
            payment_method,
            payment_status,
            notes: null,
          })
          setSales(prev => [sl, ...prev])
        }
      }

      setSponsors(prev => editingId ? prev.map(s => s.id === editingId ? saved : s) : [...prev, saved])
      setShowForm(false)
      setEditingId(null)
      setEditingSaleId(null)
      setForm(DEFAULT_FORM)
      toast.success(editingId ? 'Patrocinador atualizado!' : 'Patrocinador salvo!')
    } catch (e) {
      console.error('[Sponsor Save]', e)
      const msg = (e as { message?: string })?.message ?? String(e)
      toast.error(
        msg.includes('does not exist') || msg.includes('relation')
          ? 'Execute a migration SQL no Supabase Dashboard primeiro.'
          : msg,
        { duration: 8000 }
      )
    } finally {
      setSaving(false)
    }
  }, [form, editingId, editingSaleId])

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
      setDeletingId(null)
    }
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

  if (loading) return (
    <div className="text-white/50 text-center py-20 font-display text-2xl tracking-widest">CARREGANDO...</div>
  )

  return (
    <>
      <style>{`
        .pat-section { font-family: 'DM Sans', sans-serif; }
        .pat-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; }
        .pat-row { border-bottom: 1px solid rgba(255,255,255,0.05); }
        .pat-row:last-child { border-bottom: none; }
        .pat-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; border: 1px solid; }
        .pay-btn { font-size: 12px; padding: 4px 12px; border-radius: 8px; border: 1px solid rgba(74,222,128,0.3); background: rgba(74,222,128,0.1); color: #4ade80; cursor: pointer; transition: all 0.15s; }
        .pay-btn:hover { background: rgba(74,222,128,0.2); }
        .add-btn { display: flex; align-items: center; gap: 8px; background: rgba(252,211,77,0.15); border: 1px solid rgba(252,211,77,0.3); color: #fcd34d; font-weight: 600; font-size: 14px; padding: 10px 18px; border-radius: 12px; cursor: pointer; transition: all 0.15s; }
        .add-btn:hover { background: rgba(252,211,77,0.25); }
        .save-btn { display: flex; align-items: center; gap: 6px; background: #fcd34d; color: #3a1230; font-weight: 700; font-size: 14px; padding: 10px 22px; border-radius: 12px; border: none; cursor: pointer; transition: all 0.15s; }
        .save-btn:hover { background: #fde68a; }
        .save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .toggle-track { position: relative; width: 44px; height: 24px; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .toggle-thumb { position: absolute; top: 3px; width: 18px; height: 18px; border-radius: 50%; transition: all 0.2s; }
      `}</style>

      <div className="pat-section max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl text-white tracking-widest">PATROCINADORES</h1>
            <p className="text-white/30 text-xs mt-1">Gerencie marcas, recebimentos e exibição no telão</p>
          </div>
          <button className="add-btn" onClick={openNew}>
            <Plus size={16} /> Adicionar patrocinador
          </button>
        </div>

        {/* KPIs — sempre visíveis */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={<Award size={15} />} label="Patrocinadores" value={String(sponsors.length)} color="purple" />
          <KpiCard icon={<Banknote size={15} />} label="Total Contratado" value={formatCurrency(totalGeral)} color="blue" />
          <KpiCard icon={<CheckCircle size={15} />} label="Recebido" value={formatCurrency(totalRecebido)} color="green" />
          <KpiCard icon={<Clock size={15} />} label="Pendente" value={formatCurrency(totalPendente)} color="yellow" />
        </div>

        {/* Formulário */}
        {showForm && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(252,211,77,0.25)', borderRadius: 16, overflow: 'hidden' }}>
            {/* Header do form */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(252,211,77,0.05)' }}>
              <span style={{ color: '#fcd34d', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={14} /> {editingId ? 'Editar patrocinador' : 'Novo patrocinador'}
              </span>
              <button onClick={() => { setShowForm(false); setEditingId(null) }} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>
                <X size={16} />
              </button>
            </div>

            {/* Corpo do form */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Row 1: Nome + Modalidade */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Nome da empresa *">
                  <StyledInput
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Padaria Central"
                  />
                </Field>
                <Field label="Modalidade">
                  <StyledSelect value={form.tier} onChange={e => handleTierChange(e.target.value as SponsorTier)}>
                    <option value="simples" style={{ background: '#3a1230' }}>Simples — R$ 100 · 3 aparições · 10s</option>
                    <option value="destaque" style={{ background: '#3a1230' }}>Destaque — R$ 500 · 5 aparições · 15s</option>
                    <option value="personalizado" style={{ background: '#3a1230' }}>Personalizado — A combinar</option>
                  </StyledSelect>
                </Field>
              </div>

              {/* Row 2: Logo + Contato */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="URL do logo" hint="Link direto para a imagem (PNG/JPG/SVG)">
                  <StyledInput
                    type="url"
                    value={form.logo_url}
                    onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Nome do contato">
                  <StyledInput
                    type="text"
                    value={form.contact_name}
                    onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                    placeholder="Ex: João Silva"
                  />
                </Field>
              </div>

              {/* Row 3: Site + Instagram */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Site / URL">
                  <StyledInput
                    type="url"
                    value={form.site_url}
                    onChange={e => setForm(f => ({ ...f, site_url: e.target.value }))}
                    placeholder="https://meusite.com.br"
                  />
                </Field>
                <Field label="Instagram">
                  <StyledInput
                    type="text"
                    value={form.instagram_url}
                    onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
                    placeholder="@empresa ou URL"
                  />
                </Field>
              </div>

              {/* Row 4: WhatsApp + Valor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="WhatsApp (com DDI)">
                  <StyledInput
                    type="text"
                    value={form.whatsapp_number}
                    onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
                    placeholder="5511999999999"
                  />
                </Field>
                <Field label="Valor do patrocínio (R$)">
                  <StyledInput
                    type="text"
                    value={form.sponsorship_amount}
                    onChange={e => setForm(f => ({ ...f, sponsorship_amount: e.target.value }))}
                    placeholder="100"
                  />
                </Field>
              </div>

              {/* Row 5: Forma de recebimento + Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Forma de recebimento">
                  <StyledSelect value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value as SponsorPaymentMethod }))}>
                    <option value="pix" style={{ background: '#3a1230' }}>PIX</option>
                    <option value="dinheiro" style={{ background: '#3a1230' }}>Dinheiro</option>
                    <option value="cartao" style={{ background: '#3a1230' }}>Cartão</option>
                    <option value="transferencia" style={{ background: '#3a1230' }}>Transferência</option>
                    <option value="outro" style={{ background: '#3a1230' }}>Outro</option>
                  </StyledSelect>
                </Field>
                <Field label="Status do pagamento" hint={editingId ? 'Salva e atualiza o registro em vendas' : 'Registrado em vendas ao salvar'}>
                  <StyledSelect value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value as SponsorPaymentStatus }))}>
                    <option value="pendente" style={{ background: '#3a1230' }}>Pendente</option>
                    <option value="pago" style={{ background: '#3a1230' }}>Pago</option>
                    <option value="cancelado" style={{ background: '#3a1230' }}>Cancelado</option>
                  </StyledSelect>
                </Field>
              </div>

              {/* Row 6: QR + Aparições + Duração */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <Field label="QR Code para">
                  <StyledSelect value={form.qr_type} onChange={e => setForm(f => ({ ...f, qr_type: e.target.value as QrType }))}>
                    <option value="site" style={{ background: '#3a1230' }}>🌐 Site / URL</option>
                    <option value="instagram" style={{ background: '#3a1230' }}>📸 Instagram</option>
                    <option value="whatsapp" style={{ background: '#3a1230' }}>💬 WhatsApp</option>
                  </StyledSelect>
                </Field>
                <Field label="Aparições">
                  <StyledInput
                    type="number"
                    min={1}
                    max={20}
                    value={form.appearances}
                    onChange={e => setForm(f => ({ ...f, appearances: Number(e.target.value) }))}
                  />
                </Field>
                <Field label="Duração (s)">
                  <StyledInput
                    type="number"
                    min={5}
                    max={120}
                    value={form.duration_seconds}
                    onChange={e => setForm(f => ({ ...f, duration_seconds: Number(e.target.value) }))}
                  />
                </Field>
              </div>

              {/* Toggle ativo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px' }}>
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Exibir no telão</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>Desative para esconder sem excluir</div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className="toggle-track"
                  style={{ background: form.active ? 'rgba(252,211,77,0.3)' : 'rgba(255,255,255,0.1)', border: `1px solid ${form.active ? 'rgba(252,211,77,0.5)' : 'rgba(255,255,255,0.15)'}` }}
                >
                  <div
                    className="toggle-thumb"
                    style={{ left: form.active ? 23 : 3, background: form.active ? '#fcd34d' : 'rgba(255,255,255,0.4)' }}
                  />
                </button>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null) }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer', padding: '8px 12px' }}
                >
                  Cancelar
                </button>
                <button
                  className="save-btn"
                  onClick={handleSave}
                  disabled={!form.name.trim() || saving}
                >
                  {saving ? 'Salvando...' : <><CheckCircle size={15} /> Salvar patrocinador</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de patrocinadores */}
        {sponsors.length > 0 ? (
          <div className="pat-card">
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                {sponsors.length} patrocinador{sponsors.length !== 1 ? 'es' : ''}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                {sponsors.filter(s => s.active).length} ativos
              </span>
            </div>
            {sponsors.map(s => {
              const sponsorSalesList = sales.filter(sl => sl.sponsor_id === s.id)
              const lastSale = sponsorSalesList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
              const pago = sponsorSalesList.filter(sl => sl.payment_status === 'pago').reduce((sum, sl) => sum + sl.amount, 0)
              const pendente = sponsorSalesList.filter(sl => sl.payment_status === 'pendente').reduce((sum, sl) => sum + sl.amount, 0)
              const scfg = lastSale ? STATUS_CFG[lastSale.payment_status] : null
              return (
                <div key={s.id} className="pat-row" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, opacity: s.active ? 1 : 0.45 }}>
                  {/* Logo */}
                  <div style={{ width: 52, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {s.logo_url
                      ? <img src={s.logo_url} alt={s.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      : <span style={{ fontSize: 9, fontWeight: 700, color: '#aaa' }}>LOGO</span>}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                      <span className={`pat-badge ${TIER_COLORS[s.tier]}`}>{TIER_LABELS[s.tier]}</span>
                      {scfg && (
                        <span className={`pat-badge ${scfg.color}`}>{scfg.icon}{scfg.label}</span>
                      )}
                      {!s.active && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>INATIVO</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                        <Repeat size={10} />{s.appearances}× aparições
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                        <Clock size={10} />{s.duration_seconds}s
                      </span>
                      {s.sponsorship_amount && (
                        <span style={{ color: 'rgba(252,211,77,0.7)', fontSize: 11 }}>R$ {s.sponsorship_amount}</span>
                      )}
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{QR_LABELS[s.qr_type]}</span>
                    </div>
                    {(pago > 0 || pendente > 0) && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                        {pago > 0 && <span style={{ color: '#4ade80', fontSize: 11 }}>{formatCurrency(pago)} recebido</span>}
                        {pendente > 0 && <span style={{ color: '#facc15', fontSize: 11 }}>{formatCurrency(pendente)} pendente</span>}
                      </div>
                    )}
                  </div>
                  {/* Ações */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => openEdit(s, sales)}
                      style={{ padding: 8, borderRadius: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                      onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      style={{ padding: 8, borderRadius: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseOver={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : !showForm ? (
          <div className="pat-card" style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>
            Nenhum patrocinador cadastrado ainda.
          </div>
        ) : null}

        {/* Histórico de recebimentos */}
        {sales.length > 0 && (
          <div className="pat-card">
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={14} style={{ color: '#fcd34d' }} />
              <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Histórico de recebimentos</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{sales.length} registro{sales.length !== 1 ? 's' : ''}</span>
            </div>
            {sales.map(sl => {
              const scfg = STATUS_CFG[sl.payment_status]
              return (
                <div key={sl.id} className="pat-row" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>{sl.sponsor_name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                      {TIER_LABELS[sl.tier as SponsorTier] ?? sl.tier} · {sl.payment_method?.toUpperCase()} · {new Date(sl.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{formatCurrency(sl.amount)}</span>
                  <span className={`pat-badge ${scfg.color}`}>{scfg.icon} {scfg.label}</span>
                  {sl.payment_status === 'pendente' && (
                    <button className="pay-btn" onClick={() => handleUpdateSaleStatus(sl.id, 'pago')}>
                      Marcar Pago
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function KpiCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string
  color: 'green' | 'yellow' | 'blue' | 'purple'
}) {
  const accent = { green: '#4ade80', yellow: '#facc15', blue: '#60a5fa', purple: '#c084fc' }[color]
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: accent }}>
        {icon}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ color: 'white', fontWeight: 700, fontSize: 20, lineHeight: 1 }}>{value}</div>
    </div>
  )
}
