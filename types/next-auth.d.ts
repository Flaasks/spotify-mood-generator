import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    accessToken?: string
    user: {
      id?: string
    } & DefaultSession['user']
  }

  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
}
