export interface BingoConfig {
  // Voz TTS
  ttsEnabled: boolean
  geminiApiKey: string
  voiceName: string
  ttsPrefix: string
  // Evento principal
  eventDate: string
  eventMonth: string
  eventYear: string
  eventTime: string
  eventLocation: string
  eventLocationDetail: string
  // Contatos
  whatsappNumber: string
  whatsappName: string
  youtubeEnabled: boolean
  youtubeChannelUrl: string
  projectUrl: string
  // Organização
  orgName1: string
  orgName2: string
  // Preços
  ticketPrice: string
  cardPrice: string
  cardsPerTicket: string
  // Hero
  heroEventLabel: string
  heroSubtitle: string
  // Rodapé
  footerCopy: string
  // Patrocinadores — durações padrão por tier (segundos)
  sponsorSimplesDuration: number
  sponsorDestaqueDuration: number
  sponsorPersonalizadoDuration: number
  sponsorSimplesAppearances: number
  sponsorDestaqueAppearances: number
  // Voz do navegador (fallback Web Speech)
  browserVoiceName: string
  // Visual do Telão
  gridFontSize: number
  gridFontColor: string
  gridCardColor: string
  gridCardUndrawnColor: string
  pageBackground: string
  pageBackgroundTop: string
}

export const DEFAULT_CONFIG: BingoConfig = {
  ttsEnabled: false,
  geminiApiKey: '',
  voiceName: 'Aoede',
  ttsPrefix: 'Número',
  eventDate: '20',
  eventMonth: 'de Agosto',
  eventYear: '2026',
  eventTime: 'Das 19h às 23h',
  eventLocation: 'Salão de Eventos do',
  eventLocationDetail: 'Condomínio Izaura — Presencial',
  whatsappNumber: '5515996016655',
  whatsappName: 'Izabel',
  youtubeEnabled: true,
  youtubeChannelUrl: '',
  projectUrl: 'https://projetomalawi.vercel.app/',
  orgName1: 'Fraternidade Sem Fronteiras',
  orgName2: 'Nação Ubuntu',
  ticketPrice: '150',
  cardPrice: '15',
  cardsPerTicket: '10',
  heroEventLabel: 'Caravana da Saúde 2026 · Malawi',
  heroSubtitle: 'Participe e ajude a levar medicamentos, saúde e acolhimento para crianças e adultos em situação de vulnerabilidade no Malawi.',
  footerCopy: '© 2026 · Caravana da Saúde · Malawi · Todos os direitos reservados',
  sponsorSimplesDuration: 10,
  sponsorDestaqueDuration: 15,
  sponsorPersonalizadoDuration: 20,
  sponsorSimplesAppearances: 3,
  sponsorDestaqueAppearances: 5,
  browserVoiceName: '',
  gridFontSize: 24,
  gridFontColor: '#3a1230',
  gridCardColor: '#fcd34d',
  gridCardUndrawnColor: '',
  pageBackground: '#3a1230',
  pageBackgroundTop: '#7a2960',
}

const CONFIG_KEY = 'bingo_config'

export function loadConfig(): BingoConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(config: BingoConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}
