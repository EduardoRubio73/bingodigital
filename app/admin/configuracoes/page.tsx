'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadConfig, saveConfig, DEFAULT_CONFIG, type BingoConfig } from '@/lib/config'
import { speakNumber } from '@/lib/tts'
import { toast } from 'sonner'
import {
  Volume2, VolumeX, Globe, Phone, Calendar, MapPin, DollarSign,
  Save, RotateCcw, Eye, ExternalLink, ChevronRight, CheckCircle, AlertCircle,
  Award, Plus, Pencil, Trash2, X, Clock, Repeat,
} from 'lucide-react'
import {
  listSponsors, upsertSponsor, deleteSponsor, getQrUrl,
  type Sponsor, type SponsorInsert, type SponsorTier, type QrType,
} from '@/lib/sponsors'

const VOICES = [
  { id: 'Aoede',   label: 'Aoede — Feminina, suave' },
  { id: 'Kore',    label: 'Kore — Feminina, clara' },
  { id: 'Leda',    label: 'Leda — Feminina, natural' },
  { id: 'Zephyr',  label: 'Zephyr — Masculina, leve' },
  { id: 'Puck',    label: 'Puck — Masculina, jovial' },
  { id: 'Charon',  label: 'Charon — Masculina, grave' },
  { id: 'Fenrir',  label: 'Fenrir — Masculina, forte' },
  { id: 'Orus',    label: 'Orus — Masculina, profunda' },
]

type Section = 'voz' | 'evento' | 'contatos' | 'organizacao' | 'precos' | 'textos' | 'patrocinadores'

const DEFAULT_SPONSOR_FORM: SponsorInsert = {
  name: '', logo_url: '', contact_name: '', site_url: '', instagram_url: '',
  whatsapp_number: '', qr_type: 'site', tier: 'simples', sponsorship_amount: '',
  appearances: 3, duration_seconds: 10, active: true,
}

const TIER_LABELS: Record<SponsorTier, string> = {
  simples: 'Simples', destaque: 'Destaque', personalizado: 'Personalizado',
}
const TIER_COLORS: Record<SponsorTier, string> = {
  simples: 'text-amber-400 border-amber-400/40 bg-amber-400/10',
  destaque: 'text-purple-300 border-purple-400/40 bg-purple-400/10',
  personalizado: 'text-green-300 border-green-400/40 bg-green-400/10',
}
const QR_LABELS: Record<QrType, string> = {
  site: '🌐 Site / URL',
  instagram: '📸 Instagram',
  whatsapp: '💬 WhatsApp',
}

export default function ConfiguracoesPage() {
  const [cfg, setCfg] = useState<BingoConfig>(DEFAULT_CONFIG)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('voz')
  const [testingVoice, setTestingVoice] = useState(false)
  const [testError, setTestError] = useState('')

  // Patrocinadores state
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [sponsorLoading, setSponsorLoading] = useState(false)
  const [showSponsorForm, setShowSponsorForm] = useState(false)
  const [sponsorForm, setSponsorForm] = useState<SponsorInsert>(DEFAULT_SPONSOR_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingSponsor, setSavingSponsor] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { setCfg(loadConfig()) }, [])

  const update = useCallback(<K extends keyof BingoConfig>(key: K, value: BingoConfig[K]) => {
    setCfg(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  const handleSave = useCallback(() => {
    saveConfig(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }, [cfg])

  const handleReset = useCallback(() => {
    if (!confirm('Restaurar todas as configurações para o padrão?')) return
    setCfg(DEFAULT_CONFIG)
    saveConfig(DEFAULT_CONFIG)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  const testVoice = useCallback(async () => {
    if (!cfg.geminiApiKey) { setTestError('Insira a chave da API Gemini primeiro'); return }
    setTestingVoice(true)
    setTestError('')
    try {
      await speakNumber(42, cfg.geminiApiKey, cfg.voiceName, cfg.ttsPrefix)
    } catch (e: unknown) {
      setTestError(e instanceof Error ? e.message : 'Erro ao testar voz')
    } finally {
      setTestingVoice(false)
    }
  }, [cfg.geminiApiKey, cfg.voiceName, cfg.ttsPrefix])

  // Load sponsors when section becomes active
  useEffect(() => {
    if (activeSection !== 'patrocinadores') return
    setSponsorLoading(true)
    listSponsors().then(setSponsors).catch(console.error).finally(() => setSponsorLoading(false))
  }, [activeSection])

  const openNewSponsorForm = useCallback(() => {
    setEditingId(null)
    setSponsorForm({ ...DEFAULT_SPONSOR_FORM, appearances: cfg.sponsorSimplesAppearances, duration_seconds: cfg.sponsorSimplesDuration })
    setShowSponsorForm(true)
  }, [cfg.sponsorSimplesAppearances, cfg.sponsorSimplesDuration])

  const openEditSponsorForm = useCallback((s: Sponsor) => {
    setEditingId(s.id)
    setSponsorForm({ name: s.name, logo_url: s.logo_url, contact_name: s.contact_name, site_url: s.site_url, instagram_url: s.instagram_url, whatsapp_number: s.whatsapp_number, qr_type: s.qr_type, tier: s.tier, sponsorship_amount: s.sponsorship_amount, appearances: s.appearances, duration_seconds: s.duration_seconds, active: s.active })
    setShowSponsorForm(true)
  }, [])

  const handleTierChange = useCallback((tier: SponsorTier) => {
    const defaults: Record<SponsorTier, { appearances: number; duration_seconds: number }> = {
      simples:       { appearances: cfg.sponsorSimplesAppearances,  duration_seconds: cfg.sponsorSimplesDuration },
      destaque:      { appearances: cfg.sponsorDestaqueAppearances, duration_seconds: cfg.sponsorDestaqueDuration },
      personalizado: { appearances: 1,                              duration_seconds: cfg.sponsorPersonalizadoDuration },
    }
    setSponsorForm(f => ({ ...f, tier, ...defaults[tier] }))
  }, [cfg])

  const handleSaveSponsor = useCallback(async () => {
    if (!sponsorForm.name.trim()) return
    setSavingSponsor(true)
    try {
      const payload = editingId ? { ...sponsorForm, id: editingId } : sponsorForm
      const saved = await upsertSponsor(payload)
      setSponsors(prev => editingId ? prev.map(s => s.id === editingId ? saved : s) : [...prev, saved])
      setShowSponsorForm(false)
      setEditingId(null)
      setSponsorForm(DEFAULT_SPONSOR_FORM)
      toast.success(editingId ? 'Patrocinador atualizado!' : 'Patrocinador salvo!')
    } catch (e) {
      console.error('[Sponsor Save]', e)
      // Supabase throws PostgrestError (not instanceof Error) — extract .message safely
      const msg = (e as { message?: string })?.message ?? String(e)
      toast.error(
        msg.includes('does not exist') || msg.includes('relation')
          ? 'Tabela sponsors não existe — execute a migration no Supabase Dashboard'
          : msg,
        { duration: 8000 }
      )
    }
    finally { setSavingSponsor(false) }
  }, [sponsorForm, editingId])

  const handleDeleteSponsor = useCallback(async (id: string) => {
    if (!confirm('Remover este patrocinador?')) return
    setDeletingId(id)
    try {
      await deleteSponsor(id)
      setSponsors(prev => prev.filter(s => s.id !== id))
      toast.success('Patrocinador removido.')
    } catch (e) {
      console.error('[Sponsor Delete]', e)
      toast.error((e as { message?: string })?.message ?? 'Erro ao remover patrocinador', { duration: 8000 })
    }
    finally { setDeletingId(null) }
  }, [])

  const sections: { id: Section; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'voz',         label: 'Voz & Áudio',       icon: <Volume2 size={16} />,    desc: 'TTS com Gemini' },
    { id: 'evento',      label: 'Evento & Data',      icon: <Calendar size={16} />,   desc: 'Data, hora e local' },
    { id: 'contatos',    label: 'Contatos & Links',   icon: <Phone size={16} />,      desc: 'WhatsApp e YouTube' },
    { id: 'organizacao', label: 'Organização',        icon: <Globe size={16} />,      desc: 'Nomes e URLs' },
    { id: 'precos',      label: 'Preços',             icon: <DollarSign size={16} />, desc: 'Valores dos convites' },
    { id: 'textos',         label: 'Textos da Página',   icon: <Eye size={16} />,    desc: 'Hero e rodapé' },
    { id: 'patrocinadores', label: 'Patrocinadores',     icon: <Award size={16} />,  desc: 'Marcas & QR Code' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap');

        .cfg-root { font-family: 'DM Sans', sans-serif; }
        .cfg-mono { font-family: 'DM Mono', monospace; }
        .cfg-display { font-family: 'Bebas Neue', sans-serif; }

        .cfg-section-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.2s;
        }
        .cfg-section-btn::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 0;
          background: linear-gradient(90deg, rgba(252,211,77,0.15), transparent);
          transition: width 0.2s;
        }
        .cfg-section-btn.active::before { width: 100%; }
        .cfg-section-btn.active { border-left: 3px solid #fcd34d; }

        .cfg-field {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 10px 14px;
          color: white;
          width: 100%;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .cfg-field:focus {
          border-color: rgba(252,211,77,0.5);
          box-shadow: 0 0 0 3px rgba(252,211,77,0.08);
        }
        .cfg-field::placeholder { color: rgba(255,255,255,0.2); }
        select.cfg-field option { background: #2d0f20; }

        .cfg-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          margin-bottom: 6px;
        }
        .cfg-hint {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          margin-top: 5px;
          line-height: 1.4;
        }

        .cfg-toggle {
          position: relative;
          width: 46px;
          height: 26px;
          flex-shrink: 0;
        }
        .cfg-toggle input { opacity: 0; width: 0; height: 0; }
        .cfg-toggle-track {
          position: absolute;
          inset: 0;
          border-radius: 13px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          cursor: pointer;
          transition: background 0.2s;
        }
        .cfg-toggle input:checked ~ .cfg-toggle-track {
          background: rgba(252,211,77,0.3);
          border-color: rgba(252,211,77,0.5);
        }
        .cfg-toggle-thumb {
          position: absolute;
          top: 3px; left: 3px;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: rgba(255,255,255,0.4);
          transition: transform 0.2s, background 0.2s;
          pointer-events: none;
        }
        .cfg-toggle input:checked ~ .cfg-toggle-track .cfg-toggle-thumb {
          transform: translateX(20px);
          background: #fcd34d;
        }

        .cfg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 600px) { .cfg-grid-2 { grid-template-columns: 1fr; } }

        .cfg-save-btn {
          background: #fcd34d;
          color: #3a1230;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 14px;
          padding: 10px 28px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          display: flex; align-items: center; gap: 8px;
          transition: background 0.15s, transform 0.1s;
        }
        .cfg-save-btn:hover { background: #fde68a; transform: translateY(-1px); }
        .cfg-save-btn:active { transform: scale(0.98); }
        .cfg-save-btn.saved { background: rgba(74,222,128,0.2); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
      `}</style>

      <div className="cfg-root max-w-5xl mx-auto space-y-0">
        {/* Page header */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="cfg-display text-white text-5xl tracking-widest">CONFIGURAÇÕES</h1>
            <p className="text-white/40 text-sm mt-1">Painel de controle do Bingo Digital</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-sm transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
            >
              <RotateCcw size={14} /> Restaurar padrão
            </button>
            <button
              onClick={handleSave}
              className={`cfg-save-btn ${saved ? 'saved' : ''}`}
            >
              {saved ? <><CheckCircle size={16} /> Salvo!</> : <><Save size={16} /> Salvar alterações</>}
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar de seções */}
          <div className="w-56 flex-shrink-0 space-y-0.5">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`cfg-section-btn w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 ${
                  activeSection === s.id ? 'active bg-white/5' : 'hover:bg-white/5'
                }`}
              >
                <span className={activeSection === s.id ? 'text-yellow-400' : 'text-white/30'}>
                  {s.icon}
                </span>
                <div>
                  <div className={`text-sm font-semibold ${activeSection === s.id ? 'text-white' : 'text-white/60'}`}>
                    {s.label}
                  </div>
                  <div className="text-xs text-white/25">{s.desc}</div>
                </div>
                {activeSection === s.id && <ChevronRight size={14} className="ml-auto text-yellow-400/60" />}
              </button>
            ))}
          </div>

          {/* Conteúdo da seção */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">

            {/* ── VOZ & ÁUDIO ── */}
            {activeSection === 'voz' && (
              <div className="p-6 space-y-6">
                <SectionHeader icon={<Volume2 size={18} />} title="Voz & Áudio" desc="Configure o anúncio de voz dos números sorteados usando a API Gemini" />

                {/* Toggle TTS */}
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                  <div>
                    <div className="text-white font-semibold text-sm">Ativar anúncio de voz</div>
                    <div className="text-white/40 text-xs mt-0.5">Fala cada número sorteado no telão</div>
                  </div>
                  <label className="cfg-toggle">
                    <input type="checkbox" checked={cfg.ttsEnabled} onChange={e => update('ttsEnabled', e.target.checked)} />
                    <div className="cfg-toggle-track"><div className="cfg-toggle-thumb" /></div>
                  </label>
                </div>

                {/* API Key */}
                <div>
                  <label className="cfg-label">Chave da API Gemini</label>
                  <input
                    type="password"
                    value={cfg.geminiApiKey}
                    onChange={e => update('geminiApiKey', e.target.value)}
                    placeholder="AIza..."
                    className="cfg-field cfg-mono"
                  />
                  <p className="cfg-hint">
                    Obtenha gratuitamente em{' '}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" className="text-yellow-400/70 hover:text-yellow-400 transition-colors">
                      aistudio.google.com <ExternalLink size={10} className="inline" />
                    </a>
                    {' '}· Gemini 2.5 Flash TTS (free tier)
                  </p>
                </div>

                <div className="cfg-grid-2">
                  {/* Voz */}
                  <div>
                    <label className="cfg-label">Voz</label>
                    <select value={cfg.voiceName} onChange={e => update('voiceName', e.target.value)} className="cfg-field">
                      {VOICES.map(v => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </select>
                    <p className="cfg-hint">Todas as vozes suportam português</p>
                  </div>

                  {/* Prefixo */}
                  <div>
                    <label className="cfg-label">Prefixo do anúncio</label>
                    <input
                      type="text"
                      value={cfg.ttsPrefix}
                      onChange={e => update('ttsPrefix', e.target.value)}
                      placeholder="Número"
                      className="cfg-field"
                    />
                    <p className="cfg-hint">Ex: &quot;Número&quot; → diz &quot;Número quarenta e dois&quot;</p>
                  </div>
                </div>

                {/* Botão de teste */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-white text-sm font-semibold">Testar voz agora</div>
                    <div className="text-white/40 text-xs mt-0.5">Reproduz &quot;{cfg.ttsPrefix} quarenta e dois&quot;</div>
                  </div>
                  <button
                    onClick={testVoice}
                    disabled={testingVoice || !cfg.geminiApiKey}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 disabled:opacity-40 text-yellow-300 border border-yellow-400/30 rounded-lg text-sm font-semibold transition-colors"
                  >
                    {testingVoice ? <><span className="animate-pulse">🔊</span> Reproduzindo...</> : <><Volume2 size={15} /> Testar</>}
                  </button>
                </div>

                {testError && (
                  <div className="flex items-start gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                    {testError}
                  </div>
                )}

                {/* Vozes info */}
                <div className="bg-yellow-400/5 border border-yellow-400/15 rounded-xl p-4">
                  <p className="text-yellow-400/80 text-xs font-semibold mb-2 uppercase tracking-wider">Como funciona</p>
                  <ol className="space-y-1 text-white/50 text-xs">
                    <li>1. Ative a opção acima e insira sua chave gratuita da API Gemini</li>
                    <li>2. Abra o Telão — cada novo número sorteado será falado automaticamente</li>
                    <li>3. O áudio usa PCM 24kHz via Web Audio API, sem plugins externos</li>
                  </ol>
                </div>
              </div>
            )}

            {/* ── EVENTO & DATA ── */}
            {activeSection === 'evento' && (
              <div className="p-6 space-y-6">
                <SectionHeader icon={<Calendar size={18} />} title="Evento & Data" desc="Informações exibidas na página principal do site" />

                <div className="cfg-grid-2">
                  <div>
                    <label className="cfg-label">Dia do evento</label>
                    <input type="text" value={cfg.eventDate} onChange={e => update('eventDate', e.target.value)} placeholder="20" className="cfg-field" />
                  </div>
                  <div>
                    <label className="cfg-label">Mês (por extenso)</label>
                    <input type="text" value={cfg.eventMonth} onChange={e => update('eventMonth', e.target.value)} placeholder="de Agosto" className="cfg-field" />
                  </div>
                </div>

                <div className="cfg-grid-2">
                  <div>
                    <label className="cfg-label">Ano</label>
                    <input type="text" value={cfg.eventYear} onChange={e => update('eventYear', e.target.value)} placeholder="2026" className="cfg-field" />
                  </div>
                  <div>
                    <label className="cfg-label">Horário</label>
                    <input type="text" value={cfg.eventTime} onChange={e => update('eventTime', e.target.value)} placeholder="Das 19h às 23h" className="cfg-field" />
                  </div>
                </div>

                <div>
                  <label className="cfg-label">Local (linha 1)</label>
                  <input type="text" value={cfg.eventLocation} onChange={e => update('eventLocation', e.target.value)} placeholder="Salão de Eventos do" className="cfg-field" />
                </div>
                <div>
                  <label className="cfg-label">Local (linha 2 / detalhe)</label>
                  <input type="text" value={cfg.eventLocationDetail} onChange={e => update('eventLocationDetail', e.target.value)} placeholder="Condomínio Izaura — Presencial" className="cfg-field" />
                </div>

                <Preview label="Visualização">
                  <div className="text-4xl font-bold text-yellow-400" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{cfg.eventDate}</div>
                  <div className="text-lg text-white/80" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{cfg.eventMonth}</div>
                  <div className="text-white/50 text-sm mt-1">{cfg.eventTime}</div>
                  <div className="text-white/40 text-xs mt-1">{cfg.eventLocation}<br />{cfg.eventLocationDetail}</div>
                </Preview>
              </div>
            )}

            {/* ── CONTATOS & LINKS ── */}
            {activeSection === 'contatos' && (
              <div className="p-6 space-y-6">
                <SectionHeader icon={<Phone size={18} />} title="Contatos & Links" desc="Dados de contato exibidos no site e links externos" />

                <div className="cfg-grid-2">
                  <div>
                    <label className="cfg-label">Número do WhatsApp (com DDI)</label>
                    <input type="text" value={cfg.whatsappNumber} onChange={e => update('whatsappNumber', e.target.value)} placeholder="5515996016655" className="cfg-field cfg-mono" />
                    <p className="cfg-hint">Sem espaços ou traços. Ex: 5511999999999</p>
                  </div>
                  <div>
                    <label className="cfg-label">Nome do responsável</label>
                    <input type="text" value={cfg.whatsappName} onChange={e => update('whatsappName', e.target.value)} placeholder="Izabel" className="cfg-field" />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                  <div>
                    <div className="text-white font-semibold text-sm">Transmissão ao vivo no YouTube</div>
                    <div className="text-white/40 text-xs mt-0.5">Exibe bloco de YouTube na página principal</div>
                  </div>
                  <label className="cfg-toggle">
                    <input type="checkbox" checked={cfg.youtubeEnabled} onChange={e => update('youtubeEnabled', e.target.checked)} />
                    <div className="cfg-toggle-track"><div className="cfg-toggle-thumb" /></div>
                  </label>
                </div>

                {cfg.youtubeEnabled && (
                  <div>
                    <label className="cfg-label">URL do canal/live no YouTube</label>
                    <input type="url" value={cfg.youtubeChannelUrl} onChange={e => update('youtubeChannelUrl', e.target.value)} placeholder="https://youtube.com/..." className="cfg-field cfg-mono" />
                  </div>
                )}

                <Preview label="Link WhatsApp gerado">
                  <a
                    href={`https://wa.me/${cfg.whatsappNumber}`}
                    target="_blank"
                    rel="noopener"
                    className="text-green-400 text-sm font-mono hover:underline flex items-center gap-1"
                  >
                    wa.me/{cfg.whatsappNumber} <ExternalLink size={11} />
                  </a>
                  <div className="text-white/40 text-xs mt-1">Responsável: {cfg.whatsappName}</div>
                </Preview>
              </div>
            )}

            {/* ── ORGANIZAÇÃO ── */}
            {activeSection === 'organizacao' && (
              <div className="p-6 space-y-6">
                <SectionHeader icon={<Globe size={18} />} title="Organização" desc="Nomes das organizações e URLs institucionais" />

                <div>
                  <label className="cfg-label">Organização 1</label>
                  <input type="text" value={cfg.orgName1} onChange={e => update('orgName1', e.target.value)} placeholder="Fraternidade Sem Fronteiras" className="cfg-field" />
                  <p className="cfg-hint">Exibido no rodapé e no telão</p>
                </div>

                <div>
                  <label className="cfg-label">Organização 2</label>
                  <input type="text" value={cfg.orgName2} onChange={e => update('orgName2', e.target.value)} placeholder="Nação Ubuntu" className="cfg-field" />
                </div>

                <div>
                  <label className="cfg-label">URL do projeto</label>
                  <input type="url" value={cfg.projectUrl} onChange={e => update('projectUrl', e.target.value)} placeholder="https://..." className="cfg-field cfg-mono" />
                  <p className="cfg-hint">Link exibido no rodapé e seção Missão</p>
                </div>
              </div>
            )}

            {/* ── PREÇOS ── */}
            {activeSection === 'precos' && (
              <div className="p-6 space-y-6">
                <SectionHeader icon={<DollarSign size={18} />} title="Preços" desc="Valores dos convites exibidos na página principal" />

                <div className="cfg-grid-2">
                  <div>
                    <label className="cfg-label">Preço do convite completo (R$)</label>
                    <input type="text" value={cfg.ticketPrice} onChange={e => update('ticketPrice', e.target.value)} placeholder="150" className="cfg-field" />
                  </div>
                  <div>
                    <label className="cfg-label">Cartelas por convite</label>
                    <input type="text" value={cfg.cardsPerTicket} onChange={e => update('cardsPerTicket', e.target.value)} placeholder="10" className="cfg-field" />
                  </div>
                </div>

                <div>
                  <label className="cfg-label">Preço cartela avulsa (R$)</label>
                  <input type="text" value={cfg.cardPrice} onChange={e => update('cardPrice', e.target.value)} placeholder="15" className="cfg-field" />
                </div>

                <Preview label="Visualização do preço">
                  <div className="text-3xl font-bold text-[#7B1D1D]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                    R$ {cfg.ticketPrice},00
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {cfg.cardsPerTicket} cartelas por R$ {cfg.ticketPrice},00 · Cartela avulsa R$ {cfg.cardPrice},00
                  </div>
                </Preview>
              </div>
            )}

            {/* ── TEXTOS DA PÁGINA ── */}
            {activeSection === 'textos' && (
              <div className="p-6 space-y-6">
                <SectionHeader icon={<Eye size={18} />} title="Textos da Página" desc="Headline e textos do hero e rodapé" />

                <div>
                  <label className="cfg-label">Tag do evento (aparece acima do título)</label>
                  <input type="text" value={cfg.heroEventLabel} onChange={e => update('heroEventLabel', e.target.value)} placeholder="Caravana da Saúde 2026 · Malawi" className="cfg-field" />
                </div>

                <div>
                  <label className="cfg-label">Subtítulo do hero</label>
                  <textarea
                    value={cfg.heroSubtitle}
                    onChange={e => update('heroSubtitle', e.target.value)}
                    rows={3}
                    placeholder="Descrição curta do evento..."
                    className="cfg-field resize-none"
                    style={{ lineHeight: '1.5' }}
                  />
                </div>

                <div>
                  <label className="cfg-label">Texto do rodapé (copyright)</label>
                  <input type="text" value={cfg.footerCopy} onChange={e => update('footerCopy', e.target.value)} placeholder="© 2026 · ..." className="cfg-field" />
                </div>

                <Preview label="Hero preview">
                  <div className="text-xs text-yellow-600 font-bold tracking-widest uppercase mb-1">{cfg.heroEventLabel}</div>
                  <div className="text-3xl font-black text-[#7B1D1D]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>BINGO<br />Solidário</div>
                  <p className="text-sm text-gray-600 mt-2">{cfg.heroSubtitle}</p>
                </Preview>
              </div>
            )}

            {/* ── PATROCINADORES ── */}
            {activeSection === 'patrocinadores' && (
              <div className="p-6 space-y-6">
                <SectionHeader icon={<Award size={18} />} title="Patrocinadores" desc="Gerencie marcas, logos e QR Codes exibidos no Telão durante o sorteio" />

                {/* Timing defaults */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <Clock size={12} /> Durações padrão por modalidade (segundos)
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'sponsorSimplesDuration' as const,       label: 'Simples',       color: 'text-amber-400' },
                      { key: 'sponsorDestaqueDuration' as const,      label: 'Destaque',      color: 'text-purple-300' },
                      { key: 'sponsorPersonalizadoDuration' as const, label: 'Personalizado', color: 'text-green-300' },
                    ].map(({ key, label, color }) => (
                      <div key={key}>
                        <label className={`cfg-label ${color}`}>{label} (s)</label>
                        <input type="number" min={5} max={60}
                          value={cfg[key]}
                          onChange={e => update(key, Number(e.target.value))}
                          className="cfg-field"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="cfg-label text-amber-400">Simples — nº de aparições</label>
                      <input type="number" min={1} max={20}
                        value={cfg.sponsorSimplesAppearances}
                        onChange={e => update('sponsorSimplesAppearances', Number(e.target.value))}
                        className="cfg-field"
                      />
                    </div>
                    <div>
                      <label className="cfg-label text-purple-300">Destaque — nº de aparições</label>
                      <input type="number" min={1} max={20}
                        value={cfg.sponsorDestaqueAppearances}
                        onChange={e => update('sponsorDestaqueAppearances', Number(e.target.value))}
                        className="cfg-field"
                      />
                    </div>
                  </div>
                  <button onClick={handleSave} className="cfg-save-btn text-xs py-2 px-4" style={{ fontSize: 12, padding: '6px 16px' }}>
                    <Save size={12} /> Salvar configurações de tempo
                  </button>
                </div>

                {/* Header da lista */}
                <div className="flex items-center justify-between">
                  <div className="text-white/60 text-sm font-semibold">
                    {sponsors.length === 0 ? 'Nenhum patrocinador cadastrado' : `${sponsors.length} patrocinador${sponsors.length > 1 ? 'es' : ''}`}
                  </div>
                  <button
                    onClick={openNewSponsorForm}
                    className="flex items-center gap-1.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border border-yellow-400/30 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
                  >
                    <Plus size={14} /> Adicionar patrocinador
                  </button>
                </div>

                {/* Lista de patrocinadores */}
                {sponsorLoading ? (
                  <div className="text-white/30 text-sm text-center py-8">Carregando...</div>
                ) : sponsors.length > 0 ? (
                  <div className="space-y-2">
                    {sponsors.map(s => (
                      <div key={s.id} className={`flex items-center gap-4 bg-white/5 border rounded-xl px-4 py-3 transition-all ${s.active ? 'border-white/10' : 'border-white/5 opacity-50'}`}>
                        {/* Logo preview */}
                        <div className="w-14 h-10 rounded-lg bg-white/90 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {s.logo_url ? (
                            <img src={s.logo_url} alt={s.name} className="max-w-full max-h-full object-contain" />
                          ) : (
                            <span className="text-gray-400 text-xs font-bold">LOGO</span>
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold text-sm truncate">{s.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${TIER_COLORS[s.tier]}`}>
                              {TIER_LABELS[s.tier]}
                            </span>
                            {!s.active && <span className="text-xs text-white/30 font-semibold">INATIVO</span>}
                          </div>
                          <div className="text-white/35 text-xs mt-0.5 flex items-center gap-3">
                            <span className="flex items-center gap-1"><Repeat size={10} />{s.appearances}× aparições</span>
                            <span className="flex items-center gap-1"><Clock size={10} />{s.duration_seconds}s</span>
                            {s.sponsorship_amount && <span>R$ {s.sponsorship_amount}</span>}
                            <span className="text-yellow-400/40">{QR_LABELS[s.qr_type]}</span>
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEditSponsorForm(s)}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSponsor(s.id)}
                            disabled={deletingId === s.id}
                            className="p-2 rounded-lg hover:bg-red-400/10 text-white/30 hover:text-red-400 transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Formulário inline de cadastro/edição */}
                {showSponsorForm && (
                  <div className="bg-white/5 border border-yellow-400/20 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-yellow-400/5">
                      <span className="text-yellow-300 font-bold text-sm flex items-center gap-2">
                        <Award size={14} />
                        {editingId ? 'Editar patrocinador' : 'Novo patrocinador'}
                      </span>
                      <button onClick={() => { setShowSponsorForm(false); setEditingId(null) }} className="text-white/30 hover:text-white/70 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="p-5 space-y-5">

                      {/* Nome + Tier */}
                      <div className="cfg-grid-2">
                        <div>
                          <label className="cfg-label">Nome da empresa *</label>
                          <input type="text" value={sponsorForm.name} onChange={e => setSponsorForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Padaria Central" className="cfg-field" />
                        </div>
                        <div>
                          <label className="cfg-label">Modalidade</label>
                          <select value={sponsorForm.tier} onChange={e => handleTierChange(e.target.value as SponsorTier)} className="cfg-field">
                            <option value="simples">Simples — R$ 100 · 3 aparições · 10s</option>
                            <option value="destaque">Destaque — R$ 500 · 5 aparições · 15s</option>
                            <option value="personalizado">Personalizado — A combinar</option>
                          </select>
                        </div>
                      </div>

                      {/* Logo + Contato */}
                      <div className="cfg-grid-2">
                        <div>
                          <label className="cfg-label">URL do logo</label>
                          <input type="url" value={sponsorForm.logo_url} onChange={e => setSponsorForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." className="cfg-field cfg-mono" />
                          <p className="cfg-hint">Link direto para a imagem (PNG/JPG/SVG)</p>
                        </div>
                        <div>
                          <label className="cfg-label">Nome do contato</label>
                          <input type="text" value={sponsorForm.contact_name} onChange={e => setSponsorForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Ex: João Silva" className="cfg-field" />
                        </div>
                      </div>

                      {/* Site + Instagram */}
                      <div className="cfg-grid-2">
                        <div>
                          <label className="cfg-label">Site / URL</label>
                          <input type="url" value={sponsorForm.site_url} onChange={e => setSponsorForm(f => ({ ...f, site_url: e.target.value }))} placeholder="https://meusite.com.br" className="cfg-field cfg-mono" />
                        </div>
                        <div>
                          <label className="cfg-label">Instagram</label>
                          <input type="text" value={sponsorForm.instagram_url} onChange={e => setSponsorForm(f => ({ ...f, instagram_url: e.target.value }))} placeholder="@empresa ou URL" className="cfg-field" />
                        </div>
                      </div>

                      {/* WhatsApp + Valor */}
                      <div className="cfg-grid-2">
                        <div>
                          <label className="cfg-label">WhatsApp (com DDI)</label>
                          <input type="text" value={sponsorForm.whatsapp_number} onChange={e => setSponsorForm(f => ({ ...f, whatsapp_number: e.target.value }))} placeholder="5511999999999" className="cfg-field cfg-mono" />
                        </div>
                        <div>
                          <label className="cfg-label">Valor do patrocínio (R$)</label>
                          <input type="text" value={sponsorForm.sponsorship_amount} onChange={e => setSponsorForm(f => ({ ...f, sponsorship_amount: e.target.value }))} placeholder="100" className="cfg-field" />
                        </div>
                      </div>

                      {/* QR + Aparições + Duração */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="cfg-label">QR Code gerado para</label>
                          <select value={sponsorForm.qr_type} onChange={e => setSponsorForm(f => ({ ...f, qr_type: e.target.value as QrType }))} className="cfg-field">
                            <option value="site">🌐 Site / URL</option>
                            <option value="instagram">📸 Instagram</option>
                            <option value="whatsapp">💬 WhatsApp</option>
                          </select>
                        </div>
                        <div>
                          <label className="cfg-label">Aparições por ciclo</label>
                          <input type="number" min={1} max={20} value={sponsorForm.appearances} onChange={e => setSponsorForm(f => ({ ...f, appearances: Number(e.target.value) }))} className="cfg-field" />
                        </div>
                        <div>
                          <label className="cfg-label">Duração (segundos)</label>
                          <input type="number" min={5} max={120} value={sponsorForm.duration_seconds} onChange={e => setSponsorForm(f => ({ ...f, duration_seconds: Number(e.target.value) }))} className="cfg-field" />
                        </div>
                      </div>

                      {/* Toggle ativo */}
                      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                        <div>
                          <div className="text-white font-semibold text-sm">Exibir no telão</div>
                          <div className="text-white/40 text-xs mt-0.5">Desative para esconder temporariamente sem excluir</div>
                        </div>
                        <label className="cfg-toggle">
                          <input type="checkbox" checked={sponsorForm.active} onChange={e => setSponsorForm(f => ({ ...f, active: e.target.checked }))} />
                          <div className="cfg-toggle-track"><div className="cfg-toggle-thumb" /></div>
                        </label>
                      </div>

                      {/* Preview do card */}
                      {sponsorForm.name && (
                        <div className="rounded-xl border border-white/10 overflow-hidden">
                          <div className="bg-white/5 px-4 py-2 border-b border-white/10">
                            <span className="text-white/30 text-xs font-semibold uppercase tracking-widest">Preview no Telão</span>
                          </div>
                          <div style={{ background: 'linear-gradient(135deg, #1a0b28, #120820)', padding: '20px 24px', borderTop: '2px solid rgba(252,211,77,0.5)' }}>
                            <div className="flex items-center gap-5">
                              <div className="w-20 h-14 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {sponsorForm.logo_url ? (
                                  <img src={sponsorForm.logo_url} alt="" className="max-w-full max-h-full object-contain" />
                                ) : (
                                  <span className="text-gray-400 text-xs font-bold">LOGO</span>
                                )}
                              </div>
                              <div className="flex-1">
                                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#fcd34d', letterSpacing: 2 }}>{sponsorForm.name}</div>
                                {sponsorForm.contact_name && <div className="text-white/70 text-xs mt-1">👤 {sponsorForm.contact_name}</div>}
                                {sponsorForm.site_url && <div className="text-white/60 text-xs">🌐 {sponsorForm.site_url.replace(/^https?:\/\//, '')}</div>}
                                {sponsorForm.whatsapp_number && <div className="text-white/60 text-xs">💬 {sponsorForm.whatsapp_number}</div>}
                                {sponsorForm.instagram_url && <div className="text-white/60 text-xs">📸 {sponsorForm.instagram_url}</div>}
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                {(() => {
                                  const qrData = sponsorForm.qr_type === 'instagram' && sponsorForm.instagram_url
                                    ? `https://instagram.com/${sponsorForm.instagram_url.replace(/^@/, '').replace(/.*instagram\.com\//, '')}`
                                    : sponsorForm.qr_type === 'whatsapp' && sponsorForm.whatsapp_number
                                    ? `https://wa.me/${sponsorForm.whatsapp_number.replace(/\D/g, '')}`
                                    : sponsorForm.site_url
                                  return qrData ? (
                                    <>
                                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&bgcolor=ffffff&color=1a0820&data=${encodeURIComponent(qrData)}`} alt="QR" className="rounded w-16 h-16" />
                                      <span className="text-white/30 text-xs">{QR_LABELS[sponsorForm.qr_type]}</span>
                                    </>
                                  ) : <div className="w-16 h-16 rounded bg-white/10 flex items-center justify-center text-white/20 text-xs">QR</div>
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Ações do formulário */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          onClick={() => { setShowSponsorForm(false); setEditingId(null) }}
                          className="px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveSponsor}
                          disabled={!sponsorForm.name.trim() || savingSponsor}
                          className="cfg-save-btn disabled:opacity-40"
                        >
                          {savingSponsor ? 'Salvando...' : <><CheckCircle size={15} /> Salvar patrocinador</>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info box */}
                <div className="bg-yellow-400/5 border border-yellow-400/15 rounded-xl p-4">
                  <p className="text-yellow-400/80 text-xs font-semibold mb-2 uppercase tracking-wider">Como funciona no telão</p>
                  <ol className="space-y-1 text-white/50 text-xs">
                    <li>1. Cadastre patrocinadores com logo, contato e modalidade</li>
                    <li>2. No telão, os patrocinadores aparecem em rotação abaixo do grid de números</li>
                    <li>3. Cada patrocinador aparece pelo número de vezes definido em &quot;Aparições&quot;</li>
                    <li>4. O QR Code gerado leva ao site, Instagram ou WhatsApp escolhido</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Footer fixo do painel */}
            <div className="border-t border-white/10 px-6 py-4 flex items-center justify-between bg-white/3">
              <div className="text-white/20 text-xs cfg-mono">
                Configurações salvas no navegador (localStorage)
              </div>
              <button
                onClick={handleSave}
                className={`cfg-save-btn ${saved ? 'saved' : ''}`}
              >
                {saved ? <><CheckCircle size={15} /> Salvo!</> : <><Save size={15} /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function SectionHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 pb-2 border-b border-white/10">
      <div className="w-8 h-8 rounded-lg bg-yellow-400/15 border border-yellow-400/20 flex items-center justify-center text-yellow-400 flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h2 className="text-white font-bold text-base">{title}</h2>
        <p className="text-white/40 text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function Preview({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className="bg-white/5 px-4 py-2 border-b border-white/10">
        <span className="text-white/30 text-xs font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <div className="bg-white/95 px-5 py-4">
        {children}
      </div>
    </div>
  )
}
