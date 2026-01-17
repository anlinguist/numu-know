# Numu Know

A modern full-stack language learning platform built with Next.js, featuring interactive stories, vocabulary tools, and multimedia content for learning indigenous and world languages.

## Overview

Numu Know is a comprehensive language learning application that combines:
- Interactive interlinear text stories for immersive reading practice
- Dictionary and vocabulary building tools
- Curated educational content from YouTube, blogs, and TikTok
- Real-time search powered by Algolia
- User progress tracking and personalized learning

## Features

- **Interlinear Stories**: Read stories with word-by-word translations and audio pronunciation
- **Smart Dictionary**: Search and explore vocabulary with pronunciation guides
- **Learning Hub**: Access curated YouTube videos, blog posts, and TikTok content
- **Real-time Search**: Fast, full-text search across all content using Algolia
- **User Authentication**: Secure Firebase authentication with Google sign-in
- **Content Management**: Admin tools for publishing new stories and syncing content
- **Email Notifications**: Klaviyo integration for new content announcements
- **Responsive Design**: Mobile-first UI built with Mantine

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI Library**: Mantine v8 + Tabler Icons
- **Styling**: CSS Modules + PostCSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Search**: Algolia
- **Email Marketing**: Klaviyo
- **Deployment**: Docker

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun
- Firebase project with Firestore and Authentication enabled
- Algolia account with search API keys
- Klaviyo account (for email notifications)
- YouTube Data API key (for content sync)
- Google Cloud SDK (for local Firebase Admin authentication)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/numu-know-next.git
cd numu-know-next
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with your credentials:

```env
# Firebase Client Configuration (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123

# Firebase Admin (Server-side)
FIREBASE_PROJECT_ID=your-project-id

# Algolia Search
ALGOLIA_APP_ID=your_algolia_app_id
ALGOLIA_API_KEY=your_algolia_admin_api_key
NEXT_PUBLIC_ALGOLIA_APP_ID=your_algolia_app_id
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your_algolia_search_only_key

# Klaviyo Email Marketing
KLAVIYO_API_KEY=your_klaviyo_private_key

# YouTube Data API
YOUTUBE_API_KEY=your_youtube_api_key

# WordPress Blog Integration
WORDPRESS_BLOG_URL=https://public-api.wordpress.com/wp/v2/sites/your-blog.wordpress.com/posts
```

4. Authenticate Firebase Admin SDK:

This app uses Application Default Credentials (ADC) for secure server-side Firebase operations.

**For local development:**
```bash
# Install Google Cloud SDK if not already installed
# https://cloud.google.com/sdk/docs/install

# Authenticate with your Google account
gcloud auth application-default login

# Set your Firebase project
gcloud config set project your-project-id
```

**For production deployment:**
Deploy to Google Cloud (Cloud Run, App Engine, etc.) where ADC is automatically configured.

### Running the Application

**Development mode** (with hot reload):
```bash
npm run dev
# or
bun dev
```

**Production build**:
```bash
npm run build
npm start
# or
bun run build
bun start
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## API Routes

All backend functionality is exposed through Next.js API routes:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ping` | GET | Health check endpoint |
| `/api/queryNumu` | POST | Search content using Algolia |
| `/api/getYTVideos` | GET | Sync YouTube videos (admin only) |
| `/api/userSubscribed` | GET | Register user email subscription |
| `/api/newBlogPost` | POST | Webhook for new WordPress posts |
| `/api/newStory` | POST | Publish new story (admin only) |

## Project Structure

```
numu-know-next/
├── app/                          # Next.js App Router
│   ├── actions/                  # Server actions
│   ├── api/                      # API routes
│   │   ├── getYTVideos/         # YouTube sync endpoint
│   │   ├── newBlogPost/         # Blog webhook
│   │   ├── newStory/            # Story publishing
│   │   ├── ping/                # Health check
│   │   ├── queryNumu/           # Search endpoint
│   │   └── userSubscribed/      # Email subscription
│   ├── dictionary/              # Dictionary page
│   ├── learn/                   # Learning hub page
│   ├── settings/                # User settings
│   ├── store/                   # Store page
│   ├── stories/                 # Stories pages
│   │   └── [slug]/              # Dynamic story routes
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Home page
│   ├── error.tsx                # Error boundary
│   ├── loading.tsx              # Loading UI
│   └── global-error.tsx         # Global error handler
├── components/                   # React components
│   ├── Dictionary/              # Dictionary search UI
│   ├── Header/                  # App header
│   ├── Home/                    # Landing page components
│   ├── Learn/                   # Learning materials UI
│   ├── Logo/                    # Brand logo
│   ├── Navigation/              # Navigation bar
│   ├── Search/                  # Search interface
│   ├── Settings/                # Settings UI
│   ├── Store/                   # Store UI
│   └── Stories/                 # Story reader components
├── lib/                         # Shared utilities
│   ├── firebase.ts              # Firebase client config
│   ├── firebase-admin.ts        # Firebase Admin SDK
│   ├── algolia.ts               # Algolia search client
│   └── api.ts                   # API helper functions
├── types/                       # TypeScript type definitions
├── assets/                      # Static assets (fonts, images)
├── public/                      # Public static files
├── styles/                      # Global CSS
├── .env.local                   # Environment variables (local)
├── Dockerfile                   # Production container config
├── next.config.js              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── theme.ts                    # Mantine theme config
└── package.json                # Dependencies and scripts
```

## Docker Deployment

### Building the Image

```bash
docker build -t numu-know:latest .
```

### Running the Container

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_FIREBASE_API_KEY=your_key \
  -e NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com \
  -e NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id \
  -e FIREBASE_PROJECT_ID=your-project-id \
  -e ALGOLIA_APP_ID=your_algolia_app_id \
  -e ALGOLIA_API_KEY=your_algolia_admin_key \
  -e KLAVIYO_API_KEY=your_klaviyo_key \
  -e YOUTUBE_API_KEY=your_youtube_key \
  numu-know:latest
```

### Production Deployment

Deploy to Google Cloud Platform for automatic Firebase Admin authentication:

```bash
# Deploy to Cloud Run
gcloud run deploy numu-know \
  --image gcr.io/your-project/numu-know:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Key Features Explained

### Interlinear Stories

The story reader displays text with word-by-word translations in an interlinear format. Users can:
- Click words to see definitions
- Hear pronunciations
- Track their reading progress
- Access multiple difficulty levels

### Smart Search

Algolia powers instant search across:
- Story content
- Dictionary entries
- Blog posts
- Video transcripts

### Content Management

Admin users can:
- Publish new stories with interlinear formatting
- Sync YouTube videos automatically
- Trigger Klaviyo email campaigns for new content
- Manage vocabulary entries

## Development

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Client components use `'use client'` directive
- Server components by default
- API routes in `app/api/` directory

### Branch Strategy

- `main` - Production branch
- `next-rewrite` - Current development branch
- Feature branches from `next-rewrite`

### Testing Locally

1. Start the development server: `npm run dev`
2. Test authentication with Firebase Auth
3. Verify API routes with `/api/ping`
4. Check search functionality with Algolia
5. Test story rendering and interlinear features

## Troubleshooting

### Firebase Authentication Issues

**Problem**: "Firebase Admin SDK initialization failed"

**Solution**:
```bash
# Verify ADC credentials
gcloud auth application-default print-access-token

# If no token, re-authenticate
gcloud auth application-default login

# Verify project is set
gcloud config get-value project
```

### Build Errors

**Problem**: TypeScript or build errors

**Solution**:
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Missing Environment Variables

**Problem**: API routes failing with authentication errors

**Solution**: Ensure all required environment variables are set in `.env.local`. Check the environment variables section above.

### Algolia Search Not Working

**Problem**: Search returns no results

**Solution**:
- Verify Algolia API keys are correct
- Check that search index is populated
- Ensure `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY` is using the search-only key, not admin key

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Test thoroughly
5. Submit a pull request to `next-rewrite` branch

## License

This project is proprietary. All rights reserved.

## Contact

For questions or support, please contact the development team.
