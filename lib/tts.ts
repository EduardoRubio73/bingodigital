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

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioCtx
}

export async function speakNumber(
  number: number,
  apiKey: string,
  voiceName = 'Aoede',
  prefix = 'Número'
): Promise<void> {
  const text = `${prefix} ${numberToPortuguese(number)}`

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

  // Decode base64 → PCM 16-bit little-endian, 24 kHz mono
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)

  const sampleRate = 24000
  const numSamples = bytes.length / 2
  const ctx = getAudioCtx()

  if (ctx.state === 'suspended') await ctx.resume()

  const buffer = ctx.createBuffer(1, numSamples, sampleRate)
  const channel = buffer.getChannelData(0)
  const view = new DataView(bytes.buffer)

  for (let i = 0; i < numSamples; i++) {
    channel[i] = view.getInt16(i * 2, true) / 32768
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start()

  return new Promise(resolve => { source.onended = () => resolve() })
}
