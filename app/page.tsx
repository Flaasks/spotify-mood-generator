"use client"

import { useEffect, useMemo, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { motion } from 'framer-motion'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type PaletteColor = {
  hex: string
  population: number
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

type AudioTargets = {
  target_energy: number
  target_valence: number
  target_danceability: number
  target_acousticness: number
  target_instrumentalness: number
  target_tempo: number
  target_loudness: number
}

type GenerateResponse = {
  playlistId: string
  playlistUrl: string
  trackCount: number
  derivedTargets: AudioTargets | null
  analysis: Analysis | null
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
}

const spin = {
  rotate: 360,
  transition: { duration: 1.5, repeat: Infinity, ease: 'linear' },
}

export default function Home() {
  const { status } = useSession()
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [playlistName, setPlaylistName] = useState('')
  const [playlistDescription, setPlaylistDescription] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResponse | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return

    const loadGenres = async () => {
      try {
        const response = await fetch('/api/genres')
        if (!response.ok) return
        const data = await response.json()
        setGenres(Array.isArray(data.genres) ? data.genres : [])
      } catch (error) {
        console.error('Failed to load genres', error)
      }
    }

    loadGenres()
  }, [status])

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const toggleGenre = (genre: string) => {
    setSelectedGenres((current) => {
      if (current.includes(genre)) {
        return current.filter((item) => item !== genre)
      }
      if (current.length >= 5) return current
      return [...current, genre]
    })
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setErrorMessage(null)
    setResult(null)

    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageBase64(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleGenerate = async () => {
    setErrorMessage(null)
    setResult(null)

    if (!imageBase64) {
      setErrorMessage('Upload an image to continue.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/playlist/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          seed_genres: selectedGenres,
          playlistName: playlistName || undefined,
          playlistDescription: playlistDescription || undefined,
        }),
      })

      if (response.status === 401) {
        setErrorMessage('Sign in with Spotify to generate a playlist.')
        return
      }

      if (!response.ok) {
        setErrorMessage('Failed to create a playlist. Try again.')
        return
      }

      const data = (await response.json()) as GenerateResponse
      setResult(data)
    } catch (error) {
      console.error('Failed to generate playlist', error)
      setErrorMessage('Something went wrong. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const targetRows = useMemo(() => {
    if (!result?.derivedTargets) return []

    const targets = result.derivedTargets
    return [
      { label: 'Energy', value: targets.target_energy, mode: 'ratio' },
      { label: 'Valence', value: targets.target_valence, mode: 'ratio' },
      { label: 'Danceability', value: targets.target_danceability, mode: 'ratio' },
      { label: 'Acousticness', value: targets.target_acousticness, mode: 'ratio' },
      { label: 'Instrumentalness', value: targets.target_instrumentalness, mode: 'ratio' },
      { label: 'Tempo', value: targets.target_tempo, mode: 'tempo' },
      { label: 'Loudness', value: targets.target_loudness, mode: 'loudness' },
    ]
  }, [result])

  const progressWidth = useMemo(() => {
    if (!result?.derivedTargets) return null
    const targets = result.derivedTargets
    return {
      energy: Math.round(targets.target_energy * 100),
      valence: Math.round(targets.target_valence * 100),
      danceability: Math.round(targets.target_danceability * 100),
      acousticness: Math.round(targets.target_acousticness * 100),
      instrumentalness: Math.round(targets.target_instrumentalness * 100),
      tempo: Math.min(100, Math.round(((targets.target_tempo - 60) / 1.2))),
      loudness: Math.min(100, Math.round(((targets.target_loudness + 60) * (100 / 60)))),
    }
  }, [result])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6efe6] text-[#1a1c20]">
      <div className="pointer-events-none absolute left-[-10%] top-[-15%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(244,157,106,0.45),rgba(244,157,106,0))] blur-2xl" />
      <div className="pointer-events-none absolute right-[-15%] top-[15%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(73,136,172,0.35),rgba(73,136,172,0))] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-30%] left-[20%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(243,208,128,0.4),rgba(243,208,128,0))] blur-3xl" />

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:px-12">
        <motion.header
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4 sm:gap-6"
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[0.65rem] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#5a5f6a]">
            <span className="rounded-full bg-white/70 px-2 sm:px-3 py-1">Photo mood</span>
            <span className="rounded-full bg-white/70 px-2 sm:px-3 py-1">Spotify playlist</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold leading-tight md:text-5xl lg:text-6xl">
            Turn image atmosphere into a Spotify playlist.
          </h1>
          <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-[#5a5f6a] md:text-lg">
            Upload a photo, let the colors guide the mood, and generate audio targets tuned
            for energy, valence, and danceability. Fine-tune with genres if you want.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Button onClick={handleGenerate} size="lg" disabled={isLoading}>
              {isLoading && <motion.div animate={spin} className="inline-block mr-2">⟳</motion.div>}
              {isLoading ? 'Generating...' : 'Generate playlist'}
            </Button>
            {status !== 'authenticated' && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => signIn('spotify', { redirectTo: '/' })}
              >
                Sign in with Spotify
              </Button>
            )}
          </div>
          {errorMessage && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-xs sm:text-sm font-medium text-[#b24c3f]"
              role="status"
            >
              {errorMessage}
            </motion.p>
          )}
        </motion.header>

        <div className="grid gap-6 lg:gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.section
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-6 sm:gap-8 rounded-2xl sm:rounded-3xl border border-black/5 bg-white/70 p-4 sm:p-8 shadow-[0_30px_80px_-60px_rgba(20,22,25,0.6)] backdrop-blur"
          >
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold">Upload and tune</h2>
              <p className="text-xs sm:text-sm text-[#6b707b]">
                Start with an image. We will extract the top colors and map them to audio targets.
              </p>
            </div>

            <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="show">
              <motion.div variants={staggerItem} className="space-y-2 sm:space-y-3">
                <Label htmlFor="image" className="text-xs sm:text-sm">Image</Label>
                <Input id="image" type="file" accept="image/*" onChange={handleFileChange} />
              </motion.div>

              <motion.div variants={staggerItem} className="grid gap-4 sm:gap-6 lg:grid-cols-1 xl:grid-cols-2">
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="playlist-name" className="text-xs sm:text-sm">Playlist name</Label>
                  <Input
                    id="playlist-name"
                    placeholder="Sunset city drive"
                    value={playlistName}
                    onChange={(event) => setPlaylistName(event.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="playlist-description" className="text-xs sm:text-sm">Description</Label>
                  <Textarea
                    id="playlist-description"
                    placeholder="Generated from color mood"
                    value={playlistDescription}
                    onChange={(event) => setPlaylistDescription(event.target.value)}
                  />
                </div>
              </motion.div>

              <motion.div variants={staggerItem} className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm">Seed genres</Label>
                  <span className="text-xs text-[#6b707b]">{selectedGenres.length}/5</span>
                </div>
                {status !== 'authenticated' && (
                  <p className="text-xs sm:text-sm text-[#6b707b]">Sign in to load Spotify genres.</p>
                )}
                <motion.div
                  className="flex flex-wrap gap-1.5 sm:gap-2"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                >
                  {genres.length === 0 && status === 'authenticated' ? (
                    <Badge className="text-[0.65rem] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1">Loading genres...</Badge>
                  ) : (
                    genres.slice(0, 30).map((genre) => (
                      <motion.button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        variants={staggerItem}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          'rounded-full border px-2.5 sm:px-4 py-1 text-[0.65rem] sm:text-xs font-semibold transition-all duration-200',
                          selectedGenres.includes(genre)
                            ? 'border-transparent bg-[#1a1c20] text-white shadow-md'
                            : 'border-black/10 bg-white text-[#3c414c] hover:border-black/20 active:scale-95'
                        )}
                      >
                        {genre}
                      </motion.button>
                    ))
                  )}
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.section>

          <motion.section
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-6 sm:gap-8 rounded-2xl sm:rounded-3xl border border-black/5 bg-white/70 p-4 sm:p-8 shadow-[0_30px_80px_-60px_rgba(20,22,25,0.6)] backdrop-blur order-first lg:order-last"
          >
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold">Preview + analysis</h2>
              <p className="text-xs sm:text-sm text-[#6b707b]">
                Check the extracted palette and the resulting audio targets.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-black/10 bg-white/80 p-3 sm:p-4 overflow-hidden"
            >
              {imagePreview ? (
                <motion.img
                  src={imagePreview}
                  alt="Uploaded preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="h-48 sm:h-64 w-full rounded-xl sm:rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-48 sm:h-64 items-center justify-center rounded-xl sm:rounded-2xl border border-dashed border-black/15 text-xs sm:text-sm text-[#6b707b]">
                  Upload an image to preview it here.
                </div>
              )}
            </motion.div>

            {result?.analysis?.palette?.length ? (
              <motion.div variants={scaleIn} initial="hidden" animate="show" className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-semibold">Palette</p>
                  <p className="text-[0.65rem] sm:text-xs text-[#6b707b]">Top colors</p>
                </div>
                <motion.div className="flex flex-wrap gap-1.5 sm:gap-2" variants={staggerContainer} initial="hidden" animate="show">
                  {result.analysis.palette.map((swatch) => (
                    <motion.div key={swatch.hex} variants={staggerItem} className="flex items-center gap-1.5 sm:gap-2">
                      <motion.div
                        whileHover={{ scale: 1.15 }}
                        className="h-6 sm:h-8 w-6 sm:w-8 rounded-full border border-black/10 cursor-pointer"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span className="text-[0.65rem] sm:text-xs font-medium text-[#3c414c]">{swatch.hex}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            ) : null}

            {result?.analysis?.explanations?.length ? (
              <motion.div variants={scaleIn} initial="hidden" animate="show" className="space-y-2">
                <p className="text-xs sm:text-sm font-semibold">Mood notes</p>
                <motion.ul className="space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-[#6b707b]" variants={staggerContainer} initial="hidden" animate="show">
                  {result.analysis.explanations.map((note, index) => (
                    <motion.li key={index} variants={staggerItem} className="flex items-start gap-2">
                      <span className="text-[#1a1c20] font-semibold mt-0.5 flex-shrink-0">•</span>
                      <span>{note}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.div>
            ) : null}

            {targetRows.length > 0 ? (
              <motion.div variants={scaleIn} initial="hidden" animate="show" className="space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm font-semibold">Audio targets</p>
                <motion.div className="space-y-2 sm:space-y-3" variants={staggerContainer} initial="hidden" animate="show">
                  {targetRows.map((row, index) => {
                    const widthKey = row.label.toLowerCase().replace(/ /g, '') as keyof (ReturnType<typeof progressWidth> || {})
                    const width = progressWidth?.[widthKey] ?? 0
                    return (
                      <motion.div key={row.label} variants={staggerItem} className="space-y-1.5 sm:space-y-2">
                        <div className="flex items-center justify-between text-[0.7rem] sm:text-xs font-medium text-[#3c414c]">
                          <span>{row.label}</span>
                          <span>
                            {row.mode === 'ratio'
                              ? `${width}%`
                              : row.mode === 'tempo'
                              ? `${Math.round(row.value as number)} BPM`
                              : `${Math.round(row.value as number)} dB`}
                          </span>
                        </div>
                        <div className="h-1.5 sm:h-2 rounded-full bg-black/5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${width}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.05 }}
                            className="h-full rounded-full bg-gradient-to-r from-[#1a1c20] to-[#3c414c]"
                          />
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </motion.div>
            ) : null}

            {result?.playlistUrl ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="rounded-2xl border border-white/20 bg-[#1a1c20] px-4 sm:px-6 py-3 sm:py-4 text-white shadow-lg"
              >
                <p className="text-xs sm:text-sm font-semibold mb-2">Playlist ready</p>
                <motion.a
                  href={result.playlistUrl}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-block text-sm sm:text-base font-semibold underline-offset-4 hover:underline transition-all"
                >
                  Open in Spotify →
                </motion.a>
                <p className="text-[0.7rem] sm:text-xs text-white/60 mt-2">Tracks: {result.trackCount}</p>
              </motion.div>
            ) : null}
          </motion.section>
        </div>
      </main>
    </div>
  )
}
