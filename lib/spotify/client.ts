import axios from 'axios'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

export interface SpotifySearchParams {
  seed_artists?: string
  seed_genres?: string
  seed_tracks?: string
  target_energy?: number
  target_valence?: number
  target_danceability?: number
  target_acousticness?: number
  target_instrumentalness?: number
  target_tempo?: number
  target_loudness?: number
  limit?: number
}

export interface Track {
  id: string
  name: string
  artists: Array<{ name: string }>
  external_urls: { spotify: string }
  preview_url: string | null
  image?: string
}

export class SpotifyAPI {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
    console.log('[SpotifyAPI] Initialized with token:', accessToken.substring(0, 10) + '....' + accessToken.substring(accessToken.length - 5))
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    }
  }

  async searchTracks(query: string, limit: number = 10): Promise<Track[]> {
    try {
      const response = await axios.get(`${SPOTIFY_API_BASE}/search`, {
        headers: this.headers,
        params: {
          q: query,
          type: 'track',
          limit,
        },
      })

      return response.data.tracks.items.map((track: any) => ({
        id: track.id,
        name: track.name,
        artists: track.artists,
        external_urls: track.external_urls,
        preview_url: track.preview_url,
        image: track.album?.images?.[0]?.url,
      }))
    } catch (error) {
      console.error('Error searching tracks:', error)
      throw error
    }
  }

  async getRecommendations(params: SpotifySearchParams): Promise<Track[]> {
    try {
      // Spotify requires at least one seed (artist, genre, or track)
      const seedGenres = params.seed_genres
      const seedArtists = params.seed_artists
      const seedTracks = params.seed_tracks
      
      console.log('[SpotifyAPI.getRecommendations] Seeds:', { seedGenres, seedArtists, seedTracks })
      
      if (!seedArtists && !seedTracks && (!seedGenres || seedGenres.length === 0 || seedGenres === '')) {
        console.log('[SpotifyAPI.getRecommendations] No seeds provided, using defaults')
        // Use popular genres as fallback
        params.seed_genres = 'pop,rock,indie,electronic,hip-hop'
      }
      
      console.log('[SpotifyAPI.getRecommendations] Final params:', { ...params, seed_genres: params.seed_genres?.substring(0, 20) + '...' })

      const response = await axios.get(
        `${SPOTIFY_API_BASE}/recommendations`,
        {
          headers: this.headers,
          params: {
            limit: 50,
            ...params,
          },
        }
      )

      console.log('[SpotifyAPI.getRecommendations] Got', response.data.tracks?.length || 0, 'recommendations')
      return response.data.tracks.map((track: any) => ({
        id: track.id,
        name: track.name,
        artists: track.artists,
        external_urls: track.external_urls,
        preview_url: track.preview_url,
        image: track.album?.images?.[0]?.url,
      }))
    } catch (error: any) {
      console.error('[SpotifyAPI.getRecommendations] Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        params: error.config?.params,
      })
      throw error
    }
  }

  async getGenres(): Promise<string[]> {
    try {
      const url = `${SPOTIFY_API_BASE}/recommendations/available-genre-seeds`
      console.log('[SpotifyAPI.getGenres] URL:', url)
      console.log('[SpotifyAPI.getGenres] Auth header:', this.headers.Authorization.substring(0, 20) + '....')
      
      const response = await axios.get(url, { headers: this.headers })
      console.log('[SpotifyAPI.getGenres] Status:', response.status)
      console.log('[SpotifyAPI.getGenres] Got', response.data.genres?.length || 0, 'genres')

      return response.data.genres || []
    } catch (error: any) {
      console.error('[SpotifyAPI.getGenres] Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
      })
      throw error
    }
  }

  async createPlaylist(
    userId: string,
    name: string,
    description: string,
    isPublic: boolean = false
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${SPOTIFY_API_BASE}/users/${userId}/playlists`,
        {
          name,
          description,
          public: isPublic,
        },
        {
          headers: this.headers,
        }
      )

      return response.data.id
    } catch (error) {
      console.error('Error creating playlist:', error)
      throw error
    }
  }

  async addTracksToPlaylist(
    playlistId: string,
    trackUris: string[]
  ): Promise<void> {
    try {
      await axios.post(
        `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
        {
          uris: trackUris,
        },
        {
          headers: this.headers,
        }
      )
    } catch (error) {
      console.error('Error adding tracks to playlist:', error)
      throw error
    }
  }

  async getCurrentUser() {
    try {
      const url = `${SPOTIFY_API_BASE}/me`
      console.log('[SpotifyAPI.getCurrentUser] URL:', url)
      
      const response = await axios.get(url, { headers: this.headers })
      console.log('[SpotifyAPI.getCurrentUser] Got user:', response.data.id)
      return response.data
    } catch (error: any) {
      console.error('[SpotifyAPI.getCurrentUser] Error:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url,
      })
      throw error
    }
  }
}
