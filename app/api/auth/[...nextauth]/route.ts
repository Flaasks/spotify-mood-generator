import NextAuth, { type NextAuthOptions } from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'

const scopes = [
  'user-read-private',
  'user-read-email',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-modify',
  'user-library-read',
  'streaming',
].join(' ')

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID || '',
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
      authorization: {
        params: { scope: scopes },
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }

      // Refresh token se scaduto
      if (token.expiresAt && token.expiresAt < Date.now() / 1000) {
        return refreshAccessToken(token)
      }

      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.user = {
        ...session.user,
        id: token.sub,
      }
      return session
    },
  },
}

async function refreshAccessToken(token: any) {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }

    return token
  } catch (error) {
    console.error('Error refreshing access token:', error)
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
