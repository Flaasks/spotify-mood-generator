# Spotify Mood Generator

## Features

- **Image-to-Mood Analysis** - Upload any photo (ex. sunset, rainy city, party scene) and analyze its dominant colors
- **Color-based Audio Mapping** - Convert color palettes to Spotify audio characteristics:
  - Energy, Valence, Danceability
  - Acousticness, Instrumentalness
  - Tempo (BPM), Loudness (dB)
- **Spotify Integration** - Browse genres and generate playlists on your account
- **Responsive Design** - Mobile-optimized UI with smooth animations
- **OAuth2 Authentication** - Secure login via Spotify

## Getting Started

### Prerequisites

- Node.js ≥ 20.9.0
- npm or yarn
- Spotify Developer Account (free)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd spotify-mood-generator
npm install
```

### 2. Get Spotify Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app (e.g., "Spotify Mood Generator")
3. Copy your **Client ID** and **Client Secret**
4. In app settings, add Redirect URI: `http://localhost:3000/api/auth/callback/spotify`

### 3. Configure Environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Spotify OAuth
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here

# Spotify API
NEXT_PUBLIC_SPOTIFY_API_BASE=https://api.spotify.com/v1
```

**Generate NEXTAUTH_SECRET securely:**

```bash
openssl rand -base64 32
```

Or use [this online generator](https://generate-secret.vercel.app/32)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Spotify

### 5. Test the App

1. Click "Sign in with Spotify"
2. Authorize the requested permissions
3. Upload an image
4. Select up to 5 genres
5. Enter playlist name/description
6. Click "Generate Playlist"
7. Your playlist will be created on Spotify

## Security

- Credentials stored in `.env.local` (gitignored)
- No sensitive data logged or exposed
- `.env.example` safe for public repository

## Project Structure

```
app/
  ├── page.tsx              # Main upload & generation UI
  ├── layout.tsx            # App layout with fonts & auth provider
  └── api/
      ├── auth/             # NextAuth.js routes
      ├── genres/           # Spotify genres endpoint
      └── playlist/
          └── generate/     # Image → Playlist generation

lib/
  ├── mood/
  │   └── color-mapper.ts  # Color extraction & audio mapping
  └── spotify/
      └── client.ts        # Spotify API client

components/ui/            # Shadcn UI components
  ├── button.tsx
  ├── input.tsx
  ├── textarea.tsx
  ├── label.tsx
  └── badge.tsx
```

## How It Works

### Color → Audio Parameter Mapping

1. **Extract Palette** - Uses vibrant library to get top 5 colors from image
2. **Weighted Analysis** - Dominant color (45% weight) + remaining colors distributed by population
3. **Mood Metrics** - Each color converted to:
   - **Warmth**: 0-1 based on hue (reds/oranges = warm, blues/purples = cool)
   - **Saturation**: 0-1 from HSL color space
   - **Lightness**: 0-1 from HSL color space
4. **Audio Targets** - Metrics combined into Spotify recommendations:
   - **Energy**: High for warm, saturated, bright colors
   - **Valence**: Similar to energy (positivity)
   - **Danceability**: Driven by saturation
   - **Acousticness**: High for cool, desaturated, dark colors
   - **Instrumentalness**: High for cool, desaturated, dark colors
   - **Tempo**: 60-180 BPM range based on overall metrics
   - **Loudness**: -60 to 0 dB range (Spotify standard)

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **UI**: React 19 + Tailwind CSS 4 + Shadcn UI
- **Animations**: Framer Motion
- **Color Analysis**: node-vibrant + chroma-js
- **Authentication**: NextAuth.js (Spotify OAuth2)
- **HTTP Client**: Axios

## License

MIT
