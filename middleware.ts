import { withAuth } from 'next-auth/middleware'

export const middleware = withAuth({
  callbacks: {
    authorized({ token }) {
      return !!token
    },
  },
})

export const config = {
  matcher: ['/((?!auth|api/auth|_next/static|_next/image|favicon.ico).*)'],
}
