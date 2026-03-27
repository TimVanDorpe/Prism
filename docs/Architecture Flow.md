# Prism — Architecture Flow

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (React)                            │
│                    Vite Dev Server :5173                            │
│                                                                     │
│  ┌──────────────┐    ┌───────────────────────────────────────────┐  │
│  │  LoginPage   │    │              HomePage                     │  │
│  │              │    │                                           │  │
│  │  authService │    │  analyzeArticleStream()  compareArticle() │  │
│  └──────────────┘    └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │                        │ HTTP                │ HTTP
         │ JWT                    │ SSE                 │ REST
         ▼                        ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NODE.JS BACKEND (Express)                       │
│                          :5000                                      │
│                                                                     │
│  POST /analyze-article          POST /compare-article               │
│  GET  /history                  GET  /compare-article/:jobId        │
│  GET  /stats                    GET  /health                        │
│  CRUD /users /articles /results                                     │
│                                                                     │
│  ┌──────────────────────────┐   ┌─────────────────────────────────┐ │
│  │   analyzeController.js   │   │      compareController.js       │ │
│  │                          │   │                                 │ │
│  │  1. Check DB cache       │   │  1. Enqueue BullMQ job          │ │
│  │  2. biasAnalyzer.js      │   │  2. Return jobId immediately    │ │
│  │  3. Stream SSE           │   │  3. Poll → GET /:jobId          │ │
│  │  4. Save to PostgreSQL   │   │                                 │ │
│  └──────────────────────────┘   └─────────────────────────────────┘ │
│           │                                   │                     │
│           │                           ┌───────────────┐            │
│           │                           │    BullMQ     │            │
│           │                           │  (job queue)  │            │
│           │                           └───────┬───────┘            │
└───────────┼───────────────────────────────────┼────────────────────┘
            │                                   │ HTTP POST
            │ Prisma ORM                        ▼ /run-comparison
            ▼                     ┌─────────────────────────────────────┐
  ┌──────────────────┐            │       PYTHON SERVICE (FastAPI)      │
  │   PostgreSQL DB  │            │               :8000                 │
  │                  │            │                                     │
  │  User            │            │  POST /compare                      │
  │  Article         │            │  POST /run-comparison               │
  │  AnalysedResult  │            │  Rate limit: 10 req/min per IP      │
  │  Comparison      │            │                                     │
  └──────────────────┘            │  ┌───────────────────────────────┐  │
                                  │  │       RAG Pipeline            │  │
                                  │  │   (services/rag.py)           │  │
                                  │  └───────────────────────────────┘  │
                                  └─────────────────────────────────────┘
```

---

## Flow 1 — Artikel Analyseren (Bias Score)

```
Frontend                Node.js Backend              External
────────                ───────────────              ────────

POST /analyze-article
{ url }
        ──────────────────►
                           Check PostgreSQL cache
                           (zelfde URL eerder?)
                                │
                          [cache hit] ──► SSE: result direct
                                │
                          [cache miss]
                                │
                           biasAnalyzer.js
                                │
                                ├──► axios + cheerio
                                │    scrape artikel        ──► Website
                                │    (max 50k chars)       ◄──
                                │
                                ├──► SSE: "Analyzing..."
                                │
                                ├──► Claude API            ──► Anthropic
                                │    streaming messages        claude-sonnet-4-20250514
                                │                         ◄──
                                │
                                ├──► Parse JSON response
                                │    { biasScore, biasedLeaning, summary }
                                │
                                ├──► Prisma: save to DB
                                │    User → Article → AnalysedResult
                                │
                                └──► SSE: complete result
        ◄──────────────────
Display result
(score 0–100, left/right/neutral, summary)
```

---

## Flow 2 — Artikelen Vergelijken (RAG Pipeline)

```
Frontend                Node.js Backend         Python Service           External APIs
────────                ───────────────         ──────────────           ─────────────

POST /compare-article
{ url }
        ──────────────►
                        BullMQ: enqueue job
                        Return { jobId }
        ◄──────────────
Poll GET /compare-article/:jobId
(elke 3 seconden)

                        BullMQ worker
                        POST /run-comparison
                        { jobId, url, userId }
                                 ──────────────►
                                                a. Cache check
                                                   (in-memory TTL)
                                                      │
                                                 [hit] ──► return direct
                                                      │
                                                 [miss]
                                                      │
                                                b. scraper.py
                                                   WebBaseLoader        ──► Website
                                                   chunk (1000/200)     ◄──
                                                      │
                                                c. embeddings.py
                                                   embed eerste 1000    ──► Google GenAI
                                                   chars → query vector ◄──
                                                      │
                                                d. vector_store.py
                                                   embed alle chunks    ──► Google GenAI
                                                   upsert in Pinecone   ──► Pinecone
                                                      │
                                                e. vector_store.py
                                                   search_similar       ──► Pinecone
                                                   top_k=10 resultaten  ◄──
                                                   dedup op URL
                                                      │
                                                f. analyzer.py
                                                   Claude: bias analyse ──► Anthropic
                                                   origineel artikel    ◄──
                                                   → BiasAnalysis +
                                                     token counts
                                                      │
                                                g. analyzer.py (×3)
                                                   scrape + analyseer   ──► Websites
                                                   gerelateerde         ──► Anthropic
                                                   artikelen            ◄──
                                                      │
                                                h. kostberekening
                                                   input × $3/1M
                                                   output × $15/1M
                                                      │
                                                i. cache + return
                                                   CompareResponse
                                 ◄──────────────
                        Save to DB
                        Comparison: completed
        ◄──────────────
Display vergelijking:
- Origineel artikel (score, leaning, summary)
- Tot 3 gerelateerde bronnen
- Kostprijs in USD
```

---

## Data Model (PostgreSQL)

```
User ─────────────────────────────────────────┐
│ id (PK)                                     │
│ email (unique)                              │
└──────────────────────────────────────────── ┘
         │ 1
         │
         │ N
Article ──────────────────────────────────────┐
│ id (PK)                                     │
│ url                                         │
│ content (Text)                              │
│ userId (FK → User)                          │
└──────────────────────────────────────────── ┘
         │ 1
         │
         │ 0..1
AnalysedResult ───────────────────────────────┐
│ id (PK)                                     │
│ biasScore (0–100)                           │
│ biasedLeaning (left/right/neutral)          │
│ summary (Text)                              │
│ articleId (FK → Article, unique)            │
└──────────────────────────────────────────── ┘

Comparison ───────────────────────────────────┐
│ id (PK)                                     │
│ jobId (unique)                              │
│ url                                         │
│ status (pending/completed/failed)           │
│ result (JSON)                               │
│ userId (FK → User)                          │
│ createdAt                                   │
└──────────────────────────────────────────── ┘
```

---

## Services per Laag

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (React)                 │
│  apiService.js — analyzeArticleStream, compareArticle,
│                  getComparisonStatus, getHistory    │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│                NODE.JS BACKEND (Express)            │
│  controllers/                                       │
│    analyzeController  — bias analyse + SSE          │
│    compareController  — BullMQ job management       │
│    historyController  — geschiedenis + stats        │
│    articleController  — CRUD artikelen              │
│    userController     — CRUD users                  │
│    resultController   — CRUD resultaten             │
│    healthController   — health check                │
│                                                     │
│  services/                                          │
│    biasAnalyzer.js    — scraping + Claude streaming │
│  utils/                                             │
│    userUtils.js       — getUserOrDefault()          │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│              PYTHON SERVICE (FastAPI)               │
│  api/routes.py        — /compare, /run-comparison   │
│  core/                                              │
│    config.py          — pydantic-settings           │
│    limiter.py         — slowapi rate limiting       │
│    cache.py           — in-memory TTL cache         │
│  services/                                          │
│    scraper.py         — WebBaseLoader + splitter    │
│    embeddings.py      — Google GenAI embeddings     │
│    vector_store.py    — Pinecone upsert + query     │
│    analyzer.py        — Claude + PydanticOutputParser
│    rag.py             — RAG pipeline orchestratie   │
│  models/schemas.py    — Pydantic request/response   │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│               EXTERNE SERVICES                      │
│  Anthropic    — claude-sonnet-4-20250514            │
│  Google GenAI — gemini-embedding-001 (1024-dim)     │
│  Pinecone     — vector index "prism"                │
│  PostgreSQL   — via Prisma ORM                      │
│  BullMQ       — job queue (Redis-backed)            │
└─────────────────────────────────────────────────────┘
```
