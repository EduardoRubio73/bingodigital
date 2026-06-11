'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadConfig, saveConfig, DEFAULT_CONFIG, type BingoConfig } from '@/lib/config'
import { speakNumber } from '@/lib/tts'
import { toast } from 'sonner'
import {
  Volume2, VolumeX, Globe, Phone, Calendar, DollarSign,
  Save, RotateCcw, Eye, ExternalLink, ChevronRight, CheckCircle, AlertCircle,
  Palette,
} from 'lucide-react'

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

type Section = 'voz' | 'evento' | 'contatos' | 'organizacao' | 'precos' | 'textos' | 'visual'


export default function ConfiguracoesPage() {
  const [cfg, setCfg] = useState<BingoConfig>(DEFAULT_CONFIG)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('voz')
  const [testingVoice, setTestingVoice] = useState(false)
  const [testError, setTestError] = useState('')
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => { setCfg(loadConfig()) }, [])

  useEffect(() => {
    const load = () => {
      const voices = window.speechSynthesis?.getVoices() ?? []
      if (voices.length > 0) setBrowserVoices(voices)
    }
    load()
    window.speechSynthesis?.addEventListener('voiceschanged', load)
    return () => { window.speechSynthesis?.removeEventListener('voiceschanged', load) }
  }, [])

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
    setTestingVoice(true)
    setTestError('')
    try {
      await speakNumber(42, cfg.geminiApiKey, cfg.voiceName, cfg.ttsPrefix, 'normal', cfg.browserVoiceName)
    } catch (e: unknown) {
      setTestError(e instanceof Error ? e.message : 'Erro ao testar voz')
    } finally {
      setTestingVoice(false)
    }
  }, [cfg.geminiApiKey, cfg.voiceName, cfg.ttsPrefix, cfg.browserVoiceName])

  const sections: { id: Section; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'voz',         label: 'Voz & Áudio',       icon: <Volume2 size={16} />,    desc: 'TTS com Gemini' },
    { id: 'evento',      label: 'Evento & Data',      icon: <Calendar size={16} />,   desc: 'Data, hora e local' },
    { id: 'contatos',    label: 'Contatos & Links',   icon: <Phone size={16} />,      desc: 'WhatsApp e YouTube' },
    { id: 'organizacao', label: 'Organização',        icon: <Globe size={16} />,      desc: 'Nomes e URLs' },
    { id: 'precos',      label: 'Preços',             icon: <DollarSign size={16} />, desc: 'Valores dos convites' },
    { id: 'textos',  label: 'Textos da Página', icon: <Eye size={16} />,     desc: 'Hero e rodapé' },
    { id: 'visual',  label: 'Visual do Telão',  icon: <Palette size={16} />, desc: 'Fonte, cores, fundo' },
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

                {/* Voz Gemini */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest">🎙 Vozes Gemini (requer chave API)</p>
                  <div>
                    <label className="cfg-label">Voz do Gemini</label>
                    <select value={cfg.voiceName} onChange={e => update('voiceName', e.target.value)} className="cfg-field">
                      {VOICES.map(v => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </select>
                    <p className="cfg-hint">Usada quando a chave Gemini está configurada e funcionando</p>
                  </div>
                </div>

                {/* Voz do navegador */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest">🔈 Voz do Navegador (fallback / sem API)</p>
                  <div>
                    <label className="cfg-label">Voz do navegador</label>
                    {browserVoices.length > 0 ? (
                      <select
                        value={cfg.browserVoiceName}
                        onChange={e => update('browserVoiceName', e.target.value)}
                        className="cfg-field"
                      >
                        <option value="">— Padrão do sistema —</option>
                        {browserVoices.map(v => (
                          <option key={v.name} value={v.name}>
                            {v.name} ({v.lang}){v.localService ? ' ★' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="cfg-field text-white/30 text-sm">Carregando vozes do navegador...</div>
                    )}
                    <p className="cfg-hint">★ = voz local (offline). Usada como fallback quando o Gemini não está disponível</p>
                  </div>
                </div>

                {/* Prefixo + Teste */}
                <div className="cfg-grid-2">
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
                  <div className="flex flex-col justify-end">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-white text-sm font-semibold">Testar voz</div>
                        <div className="text-white/40 text-xs mt-0.5">Número quarenta e dois</div>
                      </div>
                      <button
                        onClick={testVoice}
                        disabled={testingVoice}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 disabled:opacity-40 text-yellow-300 border border-yellow-400/30 rounded-lg text-sm font-semibold transition-colors"
                      >
                        {testingVoice ? <><span className="animate-pulse">🔊</span> Falando...</> : <><Volume2 size={15} /> Testar</>}
                      </button>
                    </div>
                  </div>
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
                    <li>1. Ative o anúncio de voz acima</li>
                    <li>2. <strong className="text-white/60">Com chave Gemini:</strong> usa as vozes IA de alta qualidade (Aoede, Kore etc.)</li>
                    <li>3. <strong className="text-white/60">Sem chave ou se falhar:</strong> usa a voz do navegador selecionada</li>
                    <li>4. Escolha a voz do navegador (★ = local/offline) para ter sempre um fallback garantido</li>
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

            {/* ── VISUAL DO TELÃO ── */}
            {activeSection === 'visual' && (
              <div className="p-6 space-y-8">
                <SectionHeader icon={<Palette size={18} />} title="Visual do Telão" desc="Personalize fonte, cores dos números e fundo da tela de sorteio" />

                {/* Tamanho da fonte */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="cfg-label" style={{ marginBottom: 0 }}>Tamanho da fonte dos números</label>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center justify-center rounded-lg font-display font-black"
                        style={{
                          width: Math.max(40, cfg.gridFontSize * 2.2),
                          height: Math.max(32, cfg.gridFontSize * 1.8),
                          backgroundColor: cfg.gridCardColor || '#fcd34d',
                          color: cfg.gridFontColor || '#3a1230',
                          fontSize: cfg.gridFontSize,
                          fontFamily: 'Bebas Neue, sans-serif',
                          transition: 'all 0.15s',
                        }}
                      >
                        42
                      </div>
                      <span className="cfg-mono text-yellow-400 text-sm font-bold w-12">{cfg.gridFontSize}px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={16}
                    max={72}
                    step={2}
                    value={cfg.gridFontSize}
                    onChange={e => update('gridFontSize', Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#fcd34d', cursor: 'pointer' }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="cfg-hint">16px (mínimo)</span>
                    <span className="cfg-hint">72px (máximo)</span>
                  </div>
                </div>

                {/* Cores dos cartões */}
                <div>
                  <p className="cfg-label">Cores dos números na grade</p>
                  <div className="cfg-grid-2 gap-4">
                    <div>
                      <label className="cfg-label">Cor do número (texto)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={cfg.gridFontColor}
                          onChange={e => update('gridFontColor', e.target.value)}
                          style={{ width: 44, height: 36, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer', background: 'transparent', padding: 2 }}
                        />
                        <input
                          type="text"
                          value={cfg.gridFontColor}
                          onChange={e => update('gridFontColor', e.target.value)}
                          className="cfg-field cfg-mono flex-1"
                          style={{ padding: '8px 10px' }}
                          placeholder="#3a1230"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="cfg-label">Fundo — número sorteado</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={cfg.gridCardColor}
                          onChange={e => update('gridCardColor', e.target.value)}
                          style={{ width: 44, height: 36, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer', background: 'transparent', padding: 2 }}
                        />
                        <input
                          type="text"
                          value={cfg.gridCardColor}
                          onChange={e => update('gridCardColor', e.target.value)}
                          className="cfg-field cfg-mono flex-1"
                          style={{ padding: '8px 10px' }}
                          placeholder="#fcd34d"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="cfg-label">Fundo — número não sorteado</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={cfg.gridCardUndrawnColor || '#111827'}
                          onChange={e => update('gridCardUndrawnColor', e.target.value)}
                          style={{ width: 44, height: 36, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer', background: 'transparent', padding: 2 }}
                        />
                        <input
                          type="text"
                          value={cfg.gridCardUndrawnColor}
                          onChange={e => update('gridCardUndrawnColor', e.target.value)}
                          className="cfg-field cfg-mono flex-1"
                          style={{ padding: '8px 10px' }}
                          placeholder="Vazio = transparente"
                        />
                      </div>
                      <p className="cfg-hint">Deixe vazio para manter semitransparente</p>
                    </div>
                  </div>
                </div>

                {/* Preview da grade */}
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <div className="bg-white/5 px-4 py-2 border-b border-white/10">
                    <span className="text-white/30 text-xs font-semibold uppercase tracking-widest">Preview da grade</span>
                  </div>
                  <div
                    className="p-4"
                    style={{ background: `radial-gradient(ellipse at top, ${cfg.pageBackgroundTop} 0%, ${cfg.pageBackground} 70%)` }}
                  >
                    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(15, 1fr)' }}>
                      {Array.from({ length: 15 }, (_, i) => i + 1).map(n => {
                        const isDrawn = [3, 7, 11, 14].includes(n)
                        return (
                          <div
                            key={n}
                            className="flex items-center justify-center rounded font-display font-black"
                            style={{
                              fontSize: Math.max(10, cfg.gridFontSize * 0.55),
                              padding: `${Math.round(cfg.gridFontSize * 0.18)}px 2px`,
                              backgroundColor: isDrawn
                                ? cfg.gridCardColor
                                : (cfg.gridCardUndrawnColor || 'rgba(255,255,255,0.07)'),
                              color: isDrawn ? cfg.gridFontColor : 'rgba(255,255,255,0.4)',
                              fontFamily: 'Bebas Neue, sans-serif',
                              transition: 'all 0.15s',
                            }}
                          >
                            {n}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-white/20 text-xs text-center mt-2">Números 3, 7, 11 e 14 simulam sorteados</p>
                  </div>
                </div>

                {/* Fundo da página */}
                <div>
                  <p className="cfg-label">Fundo da tela de sorteio (gradiente)</p>
                  <div className="cfg-grid-2 gap-4">
                    <div>
                      <label className="cfg-label">Cor base (baixo)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={cfg.pageBackground}
                          onChange={e => update('pageBackground', e.target.value)}
                          style={{ width: 44, height: 36, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer', background: 'transparent', padding: 2 }}
                        />
                        <input
                          type="text"
                          value={cfg.pageBackground}
                          onChange={e => update('pageBackground', e.target.value)}
                          className="cfg-field cfg-mono flex-1"
                          style={{ padding: '8px 10px' }}
                          placeholder="#3a1230"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="cfg-label">Cor do topo (gradiente)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={cfg.pageBackgroundTop}
                          onChange={e => update('pageBackgroundTop', e.target.value)}
                          style={{ width: 44, height: 36, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer', background: 'transparent', padding: 2 }}
                        />
                        <input
                          type="text"
                          value={cfg.pageBackgroundTop}
                          onChange={e => update('pageBackgroundTop', e.target.value)}
                          className="cfg-field cfg-mono flex-1"
                          style={{ padding: '8px 10px' }}
                          placeholder="#7a2960"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Preview do gradiente */}
                  <div
                    className="mt-3 rounded-xl border border-white/10 flex items-center justify-center"
                    style={{
                      height: 64,
                      background: `radial-gradient(ellipse at top, ${cfg.pageBackgroundTop} 0%, ${cfg.pageBackground} 70%)`,
                      transition: 'background 0.2s',
                    }}
                  >
                    <span className="text-white/30 text-xs font-semibold uppercase tracking-widest">Preview do fundo</span>
                  </div>
                </div>

                {/* Botão restaurar visual */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <p className="cfg-hint">As cores são aplicadas imediatamente ao abrir o telão</p>
                  <button
                    onClick={() => {
                      update('gridFontSize', 24)
                      update('gridFontColor', '#3a1230')
                      update('gridCardColor', '#fcd34d')
                      update('gridCardUndrawnColor', '')
                      update('pageBackground', '#3a1230')
                      update('pageBackgroundTop', '#7a2960')
                    }}
                    className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
                  >
                    <RotateCcw size={12} /> Restaurar padrão visual
                  </button>
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
