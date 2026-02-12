import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { SpotifyAPI } from '@/lib/spotify/client'
import { NextResponse } from 'next/server'
import {
  analyzeImageToAudioTargets,
  mapPaletteToAudioTargets,
} from '@/lib/mood/color-mapper'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const {
      seed_genres,
      seed_artists,
      target_energy,
      target_valence,
      target_danceability,
      target_acousticness,
      target_instrumentalness,
      target_tempo,
      target_loudness,
      imageUrl,
      imageBase64,
      paletteHex,
      playlistName,
      playlistDescription,
    } = await request.json()

    console.log('[playlist/generate] Starting analysis with imageBase64:', !!imageBase64)

    let derivedTargets
    if (imageUrl || imageBase64) {
      console.log('[playlist/generate] Analyzing image...')
      derivedTargets = await analyzeImageToAudioTargets({ imageUrl, imageBase64 })
      console.log('[playlist/generate] Analysis complete:', !!derivedTargets)
    } else if (Array.isArray(paletteHex) && paletteHex.length > 0) {
      console.log('[playlist/generate] Using provided palette')
      derivedTargets = mapPaletteToAudioTargets(paletteHex)
    }

    const resolvedTargets = {
      target_energy: target_energy ?? derivedTargets?.targets.target_energy,
      target_valence: target_valence ?? derivedTargets?.targets.target_valence,
      target_danceability:
        target_danceability ?? derivedTargets?.targets.target_danceability,
      target_acousticness:
        target_acousticness ?? derivedTargets?.targets.target_acousticness,
      target_instrumentalness:
        target_instrumentalness ?? derivedTargets?.targets.target_instrumentalness,
      target_tempo: target_tempo ?? derivedTargets?.targets.target_tempo,
      target_loudness: target_loudness ?? derivedTargets?.targets.target_loudness,
    }

    const spotify = new SpotifyAPI(session.accessToken)

    console.log('[playlist/generate] Audio targets from image:', resolvedTargets)
    
    // Log if all targets are default (0)
    const hasAudioTargets = Object.values(resolvedTargets).some(v => v !== 0 && v !== 60 && v !== -60)
    if (!hasAudioTargets) {
      console.warn('[playlist/generate] WARNING: All audio targets are default values!')
    }

    // Get recommendations based on mood
    console.log('[playlist/generate] seed_genres:', seed_genres, 'type:', Array.isArray(seed_genres) ? 'array' : typeof seed_genres)
    const seedGenres = Array.isArray(seed_genres) && seed_genres.length > 0 
      ? seed_genres.slice(0, 5).join(',')
      : undefined
    
    console.log('[playlist/generate] Final seedGenres for API:', seedGenres)
    const recommendations = await spotify.getRecommendations({
      seed_genres: seedGenres,
      seed_artists: seed_artists ? seed_artists.slice(0, 5).join(',') : undefined,
      target_energy: resolvedTargets.target_energy,
      target_valence: resolvedTargets.target_valence,
      target_danceability: resolvedTargets.target_danceability,
      target_acousticness: resolvedTargets.target_acousticness,
      target_instrumentalness: resolvedTargets.target_instrumentalness,
      target_tempo: resolvedTargets.target_tempo,
      target_loudness: resolvedTargets.target_loudness,
      limit: 50,
    })
    console.log('[playlist/generate] Got', recommendations.length, 'recommendations')

    // Get current user
    console.log('[playlist/generate] Fetching current user...')
    const user = await spotify.getCurrentUser()
    console.log('[playlist/generate] Current user:', user.id)

    // Create playlist
    console.log('[playlist/generate] Creating playlist...')
    const playlistId = await spotify.createPlaylist(
      user.id,
      playlistName || 'Mood Playlist',
      playlistDescription || 'Generated from image mood',
      false
    )
    console.log('[playlist/generate] Playlist created:', playlistId)

    // Add tracks to playlist
    const trackUris = recommendations
      .filter((track) => track.id)
      .map((track) => `spotify:track:${track.id}`)

    if (trackUris.length > 0) {
      await spotify.addTracksToPlaylist(playlistId, trackUris)
    }

    return NextResponse.json({
      playlistId,
      playlistUrl: `https://open.spotify.com/playlist/${playlistId}`,
      tracks: recommendations,
      trackCount: recommendations.length,
      derivedTargets: derivedTargets?.targets ?? null,
      analysis: derivedTargets?.analysis ?? null,
    })
  } catch (error) {
    console.error('[playlist/generate] Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to create playlist', details: errorMessage },
      { status: 500 }
    )
  }
}
