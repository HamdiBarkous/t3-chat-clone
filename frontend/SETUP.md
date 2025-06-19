# T3.chat Frontend Setup

## Environment Variables

Create a `.env.local` file in the root of the frontend directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Backend API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1

# App Configuration
NEXT_PUBLIC_APP_NAME=T3.chat
NEXT_PUBLIC_APP_VERSION=1.0.0

# Production Site URL (for email redirects)
# Set this to your production domain in production environment
NEXT_PUBLIC_SITE_URL=https://t3-chat-clone-delta.vercel.app
```

## Getting Supabase Credentials

1. Go to [Supabase](https://app.supabase.com)
2. Create a new project or use an existing one
3. Go to Settings > API
4. Copy the **Project URL** and **anon/public key**
5. Replace the placeholder values in your `.env.local` file

## Backend Setup

Make sure your FastAPI backend is running on `http://localhost:8000` or update the `NEXT_PUBLIC_API_BASE_URL` accordingly.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Authentication Flow

1. Navigate to `/auth/login` to sign in or sign up
2. After authentication, you'll be redirected to the main chat interface
3. The app will automatically redirect unauthenticated users to the login page

## Phase 1 Complete ✅

- ✅ Supabase authentication setup
- ✅ API client with token management
- ✅ TypeScript types from backend
- ✅ Auth context and guards
- ✅ Login/signup forms with T3.chat styling
- ✅ Protected routes and navigation
- ✅ Basic chat interface placeholder 