'use client'

import { Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Music } from 'lucide-react'

export const dynamic = 'force-dynamic'

function SignInContent() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-900 via-slate-900 to-slate-900">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <Music className="w-16 h-16 text-green-400" />
        </div>
        <h1 className="text-4xl font-bold text-white">
          Spotify Mood Playlist Generator
        </h1>
        <p className="text-gray-300 text-lg">
          Generate playlists based on the mood and colors of your photos
        </p>
        <Button
          onClick={() => signIn('spotify', { redirectTo: '/' })}
          className="mt-8 bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
        >
          Sign in with Spotify
        </Button>
      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SignInContent />
    </Suspense>
  )
}
