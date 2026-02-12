import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import { SpotifyAPI } from '@/lib/spotify/client'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    console.log('[genres] Session check:', !!session?.accessToken)

    if (!session?.accessToken) {
      console.log('[genres] No access token found')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const spotify = new SpotifyAPI(session.accessToken)
    console.log('[genres] Fetching genres from Spotify...')
    const genres = await spotify.getGenres()
    console.log('[genres] Got', genres.length, 'genres')

    return NextResponse.json({ genres })
  } catch (error) {
    console.error('[genres] Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to fetch genres', details: errorMessage },
      { status: 500 }
    )
  }
}
