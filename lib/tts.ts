export type TensionLevel = 'normal' | 'alert' | 'dramatic' | 'climax'

const ONES = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
]
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']

export function numberToPortuguese(n: number): string {
  if (n < 20) return ONES[n]
  const t = Math.floor(n / 10)
  const o = n % 10
  if (o === 0) return TENS[t]
  return `${TENS[t]} e ${ONES[o]}`
}

const PHRASES: Record<TensionLevel, string[]> = {
  normal: [
    'Atenção! O número da vez é o',
    'E o próximo número sorteado é o',
    'Segura a cartela! Vem aí o número',
    'Olha lá, o bingo chama o número',
    'Concentração total! Saiu o número',
    'Prestem atenção, vamos ao número',
    'Quem vai marcar esse? Número',
    'Fiquem atentos, o número sorteado é o',
    'Bora marcar! O número é o',
    'Lá vem ele! O número é o',
    'Chegou a hora! Saiu o número',
    'Surpresa ou não, o número é o',
    'Ô povo! Saiu mais um! O número é o',
    'Segura que lá vem! Número',
    'Agora é sério! Saiu o número',
    'Todo mundo de olho! O número é o',
  ],
  alert: [
    'Atenção redobrada! Tem gente chegando perto! O número é o',
    'Temperatura subindo! Alguém está muito perto de ganhar! Saiu o',
    'Oh não! Tem gente na beira do precipício! Número',
    'Cuidado, cuidado! Alguém pode ganhar em breve! O número é o',
    'Isso está ficando muito interessante! O número é o',
    'Prestem atenção! Alguém está quase lá! Saiu o número',
    'O jogo está pegando fogo! O número é o',
  ],
  dramatic: [
    'ATENÇÃO TOTAL! Alguém está a dois passos do bingo! O número é o',
    'ISSO ESTÁ FICANDO MUITO SÉRIO! Dois números para o bingo! Saiu o',
    'NERVOSO! Tem gente na ponta da cadeira! O número é o',
    'SUSPENSE TOTAL! Alguém está quase lá! Número',
    'CALMA PESSOAL! Pode acontecer a qualquer momento! O número é o',
    'INACREDITÁVEL! Alguém está a um passo de ganhar! Saiu o número',
    'CORAÇÃO ACELERADO! Dois números para o bingo! O número é o',
  ],
  climax: [
    'MINHA GENTE! ALGUÉM ESTÁ A UM ÚNICO NÚMERO DO BINGO! Qual será o escolhido? É o',
    'ATENÇÃO TOTAL GALERA! TEM ALGUÉM QUASE GANHANDO! UM NÚMERO PODE MUDAR TUDO! É o',
    'MOMENTO DE TENSÃO MÁXIMA! Um único número pode ser o fim do jogo! Saiu o',
    'MEUS CAROS! ISSO VAI ACABAR AGORA! Alguém vai entrar em êxtase com o número',
    'EXPLOSÃO DE ADRENALINA! ALGUÉM ESTÁ A UM PASSO DO BINGO! O número é o',
    'PREPAREM OS CORAÇÕES! ALGUÉM ESTÁ NA ÚLTIMA CASA! O número sorteado é o',
  ],
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioCtx
}

// Synthesizes a snare drum roll that accelerates over ~2.5 seconds
async function playDrumRoll(ctx: AudioContext): Promise<void> {
  return new Promise(resolve => {
    const duration = 2.5
    const sampleRate = ctx.sampleRate
    const length = Math.floor(sampleRate * duration)
    const buffer = ctx.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    const startHPS = 5    // hits per second at start
    const endHPS = 28     // hits per second at end (accelerando)
    const hitDecay = 22   // snare hit decay factor

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const progress = t / duration
      const hps = startHPS + (endHPS - startHPS) * progress
      const posInCycle = (t * hps) % 1.0
      // Sharp attack, fast exponential decay per hit
      const hitEnv = posInCycle < 0.04 ? 1.0 : Math.exp(-posInCycle * hitDecay)
      // Crescendo from quiet to loud
      const crescendo = 0.2 + 0.8 * progress
      data[i] = (Math.random() * 2 - 1) * hitEnv * crescendo * 0.55
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    // Bandpass gives the snare its characteristic crack
    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 240
    bandpass.Q.value = 0.9

    const gain = ctx.createGain()
    gain.gain.value = 1.8
    // Fade out the last 0.3s so it doesn't cut abruptly into the voice
    gain.gain.setValueAtTime(1.8, ctx.currentTime + duration - 0.3)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

    source.connect(bandpass)
    bandpass.connect(gain)
    gain.connect(ctx.destination)

    source.start()
    source.stop(ctx.currentTime + duration)
    source.onended = () => resolve()
  })
}

export async function speakNumber(
  number: number,
  apiKey: string,
  voiceName = 'Aoede',
  prefix = '',
  tension: TensionLevel = 'normal'
): Promise<void> {
  // Prefix takes priority; otherwise use dynamic phrase by tension level
  const text = prefix
    ? `${prefix} ${numberToPortuguese(number)}`
    : `${pick(PHRASES[tension])} ${numberToPortuguese(number)}`

  const ctx = getAudioCtx()
  if (ctx.state === 'suspended') await ctx.resume()

  // Climax: play drum roll first, then voice
  if (!prefix && tension === 'climax') {
    await playDrumRoll(ctx)
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
      }),
    }
  )

  if (!res.ok) throw new Error(`Gemini TTS error: ${res.status}`)

  const data = await res.json()
  const b64: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
  if (!b64) throw new Error('Sem dados de áudio na resposta')

  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)

  const sampleRate = 24000
  const numSamples = bytes.length / 2
  const audioBuffer = ctx.createBuffer(1, numSamples, sampleRate)
  const channel = audioBuffer.getChannelData(0)
  const view = new DataView(bytes.buffer)

  for (let i = 0; i < numSamples; i++) {
    channel[i] = view.getInt16(i * 2, true) / 32768
  }

  const source = ctx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(ctx.destination)
  source.start()

  return new Promise(resolve => { source.onended = () => resolve() })
}
