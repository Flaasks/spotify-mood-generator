'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-900 via-slate-900 to-slate-900">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="w-16 h-16 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">Authentication Error</h1>
        <p className="text-gray-300">
          {error === 'OAuthCallback' 
            ? 'Failed to authenticate with Spotify. Please try again.'
            : 'An error occurred during authentication.'}
        </p>
        <Button
          onClick={() => signIn('spotify', { redirectTo: '/auth/signin' })}
          className="mt-8 bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg"
        >
          Try Again
        </Button>
      </div>
    </div>
  )
}
