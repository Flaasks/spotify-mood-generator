import type { Metadata } from 'next'
import { Fraunces, JetBrains_Mono } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'Spotify Mood Playlist Generator',
  description: 'Generate Spotify playlists based on image mood and colors',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${jetbrainsMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
