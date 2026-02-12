import chroma from 'chroma-js'
import { Vibrant } from 'node-vibrant/node'

type PaletteColor = {
  hex: string
  population: number
}

type SwatchLike = {
  getHex: () => string
  getPopulation?: () => number
}


type AudioTargets = {
  target_energy: number
  target_valence: number
  target_danceability: number
  target_acousticness: number
  target_instrumentalness: number
  target_tempo: number
  target_loudness: number
}

type Analysis = {
  palette: PaletteColor[]
  averages: {
    warmth: number
    saturation: number
    lightness: number
  }
  explanations: string[]
}

const MAX_COLORS = 5
const DOMINANT_WEIGHT = 0.45
const TEMPO_MIN = 60
const TEMPO_MAX = 180

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const normalizeHue = (hue: number) => {
  if (Number.isNaN(hue)) return 0
  const normalized = hue % 360
  return normalized < 0 ? normalized + 360 : normalized
}

const getWarmth = (hue: number) => {
  const h = normalizeHue(hue)
  const radians = ((h - 30) * Math.PI) / 180
  return clamp01((Math.cos(radians) + 1) / 2)
}

const colorToMetrics = (hex: string) => {
  const [h, s, l] = chroma(hex).hsl()
  const saturation = Number.isNaN(s) ? 0 : clamp01(s)
  const lightness = Number.isNaN(l) ? 0 : clamp01(l)
  const warmth = getWarmth(h)

  const energy = clamp01(0.15 + 0.55 * warmth + 0.2 * saturation + 0.1 * lightness)
  const valence = clamp01(0.1 + 0.6 * warmth + 0.2 * saturation + 0.1 * lightness)
  const danceability = clamp01(0.15 + 0.75 * saturation + 0.1 * lightness)
  const acousticness = clamp01(0.1 + 0.6 * (1 - saturation) + 0.3 * (1 - lightness))
  const instrumentalness = clamp01(
    0.05 + 0.5 * (1 - warmth) + 0.25 * (1 - saturation) + 0.2 * (1 - lightness)
  )

  return {
    warmth,
    saturation,
    lightness,
    energy,
    valence,
    danceability,
    acousticness,
    instrumentalness,
  }
}

const mergeTargets = (items: Array<{ weight: number; metrics: ReturnType<typeof colorToMetrics> }>) => {
  const total = items.reduce((sum, item) => sum + item.weight, 0) || 1

  const merged = items.reduce(
    (acc, item) => {
      const factor = item.weight / total
      acc.warmth += item.metrics.warmth * factor
      acc.saturation += item.metrics.saturation * factor
      acc.lightness += item.metrics.lightness * factor
      acc.energy += item.metrics.energy * factor
      acc.valence += item.metrics.valence * factor
      acc.danceability += item.metrics.danceability * factor
      acc.acousticness += item.metrics.acousticness * factor
      acc.instrumentalness += item.metrics.instrumentalness * factor
      return acc
    },
    {
      warmth: 0,
      saturation: 0,
      lightness: 0,
      energy: 0,
      valence: 0,
      danceability: 0,
      acousticness: 0,
      instrumentalness: 0,
    }
  )

  return merged
}

const targetsFromMerged = (merged: ReturnType<typeof mergeTargets>): AudioTargets => {
  const tempoBase = clamp01(0.6 * merged.energy + 0.4 * merged.danceability)
  const target_tempo = clamp(TEMPO_MIN + tempoBase * (TEMPO_MAX - TEMPO_MIN), TEMPO_MIN, TEMPO_MAX)
  const target_loudness = clamp(-60 + merged.energy * 60, -60, 0)

  return {
    target_energy: clamp01(merged.energy),
    target_valence: clamp01(merged.valence),
    target_danceability: clamp01(merged.danceability),
    target_acousticness: clamp01(merged.acousticness),
    target_instrumentalness: clamp01(merged.instrumentalness),
    target_tempo,
    target_loudness,
  }
}

const explanationFromMerged = (merged: ReturnType<typeof mergeTargets>): string[] => {
  const explanations: string[] = []

  if (merged.warmth >= 0.6) {
    explanations.push('Colori caldi prevalenti, energia e valence piu alte')
  } else if (merged.warmth <= 0.4) {
    explanations.push('Colori freddi prevalenti, mood piu malinconico')
  } else {
    explanations.push('Warmth bilanciata, mood intermedio')
  }

  if (merged.saturation >= 0.6) {
    explanations.push('Saturazione alta, danceability elevata')
  } else if (merged.saturation <= 0.35) {
    explanations.push('Saturazione bassa, danceability moderata')
  }

  if (merged.lightness <= 0.4) {
    explanations.push('Luminosita bassa, acousticness e instrumentalness piu alte')
  } else if (merged.lightness >= 0.65) {
    explanations.push('Luminosita alta, mood piu aperto e brillante')
  }

  return explanations
}

const buildWeights = (palette: PaletteColor[]) => {
  if (palette.length === 0) return []
  if (palette.length === 1) return [{ ...palette[0], weight: 1 }]

  const dominant = palette[0]
  const rest = palette.slice(1)
  const restTotal = rest.reduce((sum, item) => sum + item.population, 0)

  const dominantWeight = DOMINANT_WEIGHT
  const remainingWeight = 1 - dominantWeight

  const restWeights = rest.map((item) => {
    const weight = restTotal > 0 ? (item.population / restTotal) * remainingWeight : remainingWeight / rest.length
    return { ...item, weight }
  })

  return [{ ...dominant, weight: dominantWeight }, ...restWeights]
}

const hexPaletteToAnalysis = (palette: PaletteColor[]): { targets: AudioTargets; analysis: Analysis } => {
  const weighted = buildWeights(palette)
  const items = weighted.map((item) => ({
    weight: item.weight,
    metrics: colorToMetrics(item.hex),
  }))

  const merged = mergeTargets(items)
  const targets = targetsFromMerged(merged)
  const analysis: Analysis = {
    palette,
    averages: {
      warmth: merged.warmth,
      saturation: merged.saturation,
      lightness: merged.lightness,
    },
    explanations: explanationFromMerged(merged),
  }

  return { targets, analysis }
}

const isSwatchLike = (value: unknown): value is SwatchLike => {
  return typeof (value as SwatchLike).getHex === 'function'
}

const getPaletteFromSwatches = (palette: Record<string, unknown>): PaletteColor[] => {
  console.log('[getPaletteFromSwatches] Input palette keys:', Object.keys(palette))
  const swatches = Object.values(palette)
    .filter(isSwatchLike)
  console.log('[getPaletteFromSwatches] Found', swatches.length, 'swatch-like objects')
  
  const mapped = swatches.map((swatch) => {
    const hex = swatch.getHex()
    const pop = swatch.getPopulation?.() ?? 0
    console.log('[getPaletteFromSwatches] Swatch:', hex, 'population:', pop)
    return { hex, population: pop }
  })

  const sorted = mapped.sort((a, b) => b.population - a.population)
  const result = sorted.slice(0, MAX_COLORS)
  console.log('[getPaletteFromSwatches] Returning', result.length, 'colors:', result.map(c => c.hex))
  return result
}

const decodeBase64Image = (imageBase64: string) => {
  const base64 = imageBase64.startsWith('data:')
    ? imageBase64.split(',')[1] ?? ''
    : imageBase64
  return Buffer.from(base64, 'base64')
}

export const extractPaletteFromImage = async (params: {
  imageUrl?: string
  imageBase64?: string
}): Promise<PaletteColor[]> => {
  const { imageUrl, imageBase64 } = params
  console.log('[extractPaletteFromImage] Params:', { imageUrl: !!imageUrl, imageBase64: !!imageBase64 })

  if (!imageUrl && !imageBase64) {
    console.log('[extractPaletteFromImage] No image provided, returning empty')
    return []
  }

  let buffer: Buffer

  try {
    if (imageBase64) {
      console.log('[extractPaletteFromImage] Processing base64...')
      buffer = decodeBase64Image(imageBase64)
      console.log('[extractPaletteFromImage] Buffer created, size:', buffer.length, 'bytes')
    } else {
      console.log('[extractPaletteFromImage] Fetching from URL:', imageUrl)
      const response = await fetch(imageUrl as string)
      if (!response.ok) {
        throw new Error('Failed to fetch image')
      }
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      console.log('[extractPaletteFromImage] Buffer created from URL, size:', buffer.length, 'bytes')
    }

    console.log('[extractPaletteFromImage] Calling Vibrant.from()...')
    const vibrant = Vibrant.from(buffer)
    const palette = await vibrant.getPalette()
    console.log('[extractPaletteFromImage] Vibrant palette:', Object.keys(palette))
    
    const result = getPaletteFromSwatches(palette)
    console.log('[extractPaletteFromImage] Final palette:', result)
    return result
  } catch (error) {
    console.error('[extractPaletteFromImage] Error:', error)
    throw error
  }
}

export const mapPaletteToAudioTargets = (paletteHex: string[]) => {
  const palette = paletteHex
    .filter((hex) => typeof hex === 'string' && hex.length > 0)
    .slice(0, MAX_COLORS)
    .map((hex, index) => ({
      hex,
      population: MAX_COLORS - index,
    }))

  return hexPaletteToAnalysis(palette)
}

export const analyzeImageToAudioTargets = async (params: {
  imageUrl?: string
  imageBase64?: string
}) => {
  console.log('[analyzeImageToAudioTargets] Starting with params:', { hasImageUrl: !!params.imageUrl, hasImageBase64: !!params.imageBase64 })
  const palette = await extractPaletteFromImage(params)
  console.log('[analyzeImageToAudioTargets] Extracted palette:', palette.length, 'colors')
  if (palette.length === 0) {
    console.warn('[analyzeImageToAudioTargets] WARNING: Empty palette returned!')
  }
  const result = hexPaletteToAnalysis(palette)
  console.log('[analyzeImageToAudioTargets] Result targets:', result.targets)
  return result
}
