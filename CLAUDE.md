# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Prism** — Real-time AI article bias analyzer. Users submit a URL, the backend scrapes the article, streams it to Claude for bias analysis, and returns a structured result (score 0–100, left/right/neutral leaning, summary) via SSE.

## Development Commands

### Backend (run from `Backend/`)
```bash
npm run dev        # Start with nodemon (auto-restart)
npm start          # Start without auto-restart
```

### Frontend (run from `Frontend/Frontend/`)
```bash
npm run dev        # Vite dev server on port 5173
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Database (run from `Backend/`)
```bash
npx prisma migrate dev     # Apply migrations
npx prisma studio          # GUI for DB inspection
npx prisma generate        # Regenerate Prisma client after schema changes
```

## Environment Setup

Backend requires `Backend/.env`:
```
PORT=5000
DATABASE_URL="postgresql://user:pass@localhost:5432/Prism?schema=public"
ANTHROPIC_API_KEY="sk-ant-..."
```

## Architecture

### Request Flow for `/analyze-article`
1. `analyzeController.js` receives POST with `{ url, userId?, skipCache? }`
2. Checks DB for cached result (same URL) — returns cached unless `skipCache: true`
3. `biasAnalyzer.js` scrapes article via axios + cheerio, truncates to 50k chars
4. Sends to Claude (`claude-sonnet-4-20250514`) via streaming messages API
5. Parses JSON response: `{ biasScore, biasedLeaning, summary }`
6. Persists to PostgreSQL (User → Article → AnalysedResult)
7. Streams progress back to client via SSE

### Backend Structure
- `server.js` — Express app, all route registration, Swagger JSDoc definitions
- `controllers/` — One controller per resource/concern; thin layer delegating to services/Prisma
- `services/biasAnalyzer.js` — All AI and scraping logic
- `utils/userUtils.js` — `getUserOrDefault()` for anonymous user fallback
- `prisma/schema.prisma` — Source of truth for DB schema

### Frontend Structure
- `Frontend/Frontend/src/App.jsx` — Router root: `/` → LoginPage, `/home` → HomePage
- Pages are in `src/` (LoginPage, HomePage components)
- No state management library; React 19 + React Router 7

### API Documentation
Swagger UI is served at `http://localhost:5000/api-docs` when the backend is running. All schemas and endpoint docs are defined as JSDoc comments in `server.js`.

## Key Patterns

- **SSE streaming**: The `/analyze-article` endpoint uses Server-Sent Events. Frontend must consume an `EventSource` or handle chunked responses.
- **Default user**: `getUserOrDefault()` creates/fetches a default user when no `userId` is provided, enabling anonymous analysis.
- **Claude model**: Always use `claude-sonnet-4-20250514` for bias analysis (not the latest alias) to ensure response consistency.
