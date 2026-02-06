import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import { SpotifyAPI } from '@/lib/spotify/client'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const spotify = new SpotifyAPI(session.accessToken)
    const genres = await spotify.getGenres()

    return NextResponse.json({ genres })
  } catch (error) {
    console.error('Error fetching genres:', error)
    return NextResponse.json(
      { error: 'Failed to fetch genres' },
      { status: 500 }
    )
  }
}
