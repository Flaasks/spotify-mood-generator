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

      return response.data.tracks.map((track: any) => ({
        id: track.id,
        name: track.name,
        artists: track.artists,
        external_urls: track.external_urls,
        preview_url: track.preview_url,
        image: track.album?.images?.[0]?.url,
      }))
    } catch (error) {
      console.error('Error getting recommendations:', error)
      throw error
    }
  }

  async getGenres(): Promise<string[]> {
    try {
      const response = await axios.get(
        `${SPOTIFY_API_BASE}/recommendations/available-genre-seeds`,
        {
          headers: this.headers,
        }
      )

      return response.data.genres
    } catch (error) {
      console.error('Error getting genres:', error)
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
      const response = await axios.get(`${SPOTIFY_API_BASE}/me`, {
        headers: this.headers,
      })

      return response.data
    } catch (error) {
      console.error('Error getting current user:', error)
      throw error
    }
  }
}
