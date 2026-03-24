# Workflow Orchestration — RabbitMQ + Temporal

## Wat is RabbitMQ?

Een **message broker**: een tussenlaag die berichten ontvangt, opslaat en doorstuurt.

```
Node.js ──► [comparison.requests queue] ──► Python service
Node.js ◄── [comparison.results queue] ◄── Python service
```

**Waarom?**
- Node.js hoeft niet te wachten tot Python klaar is (fire-and-forget)
- Als Python even down is, blijven jobs in de wachtrij
- Je leert het "async job pattern": submit → jobId terug → later ophalen

**Zonder RabbitMQ:** Node.js blokkeert 30-60 seconden op Python
**Met RabbitMQ:** Node.js antwoordt in < 100ms met een jobId, Python verwerkt op de achtergrond

---

## Wat is Temporal?

Een **workflow engine**: maakt lange multi-stap processen duurzaam en zichtbaar.

```
CompareArticleWorkflow
  ├── Activity: scrape_and_chunk      (30s timeout, auto-retry)
  ├── Activity: embed_chunks          (60s timeout, auto-retry)
  ├── Activity: upsert_to_pinecone    (30s timeout, auto-retry)
  ├── Activity: search_similar        (10s timeout, auto-retry)
  └── Activity: analyze_bias          (60s timeout, auto-retry)
```

**Waarom?**
- Als één stap crasht, hervat Temporal vanaf die stap (niet opnieuw beginnen)
- Je ziet elke stap live in de Temporal UI (localhost:8080)
- Je leert het verschil tussen een workflow en een hardcoded pipeline

**Zonder Temporal:** crash halverwege = alles weg
**Met Temporal:** crash halverwege = hervat bij de gefaalde stap

---

## Context

Prism heeft een werkende RAG pipeline in `PythonService/services/rag.py`.
Het doel is die pipeline te upgraden naar een productieklaar async systeem:
- Node.js submits een job via RabbitMQ → geeft meteen een jobId terug
- Python ontvangt de job, draait het als een Temporal workflow
- Node.js kan de status opvragen via `GET /compare-article/:jobId`

---

## Stap 0: Docker Desktop installeren

Docker is nodig om RabbitMQ en Temporal lokaal te draaien.

1. Download Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Installeer en herstart
3. Verifieer: `docker --version` in terminal

---

## Stap 1: Docker Compose (infrastructuur)

**Nieuw bestand:** `Prism/docker-compose.yml`

Draait alleen de infrastructuur (niet de app zelf):
- PostgreSQL (voor de DB)
- RabbitMQ + Management UI (port 5672 + 15672)
- Temporal server (port 7233)
- Temporal UI (port 8080)

**Verifieer:**
- `docker compose up -d`
- RabbitMQ UI: http://localhost:15672 (prism/prism)
- Temporal UI: http://localhost:8080

---

## Stap 2: Prisma — Comparison model

**Bestand:** `Backend/prisma/schema.prisma`

Voeg `Comparison` model toe (additief — bestaande modellen onveranderd):
- `jobId` (String, unique) — koppelt RabbitMQ message aan DB record
- `status` ("pending" | "completed" | "failed")
- `url`, `userId`, `createdAt`, `completedAt`
- Resultaatvelden: `originalScore`, `originalLeaning`, `originalSummary`, `relatedArticles` (Json)
- `costUsd`, `errorMessage`

Voeg back-relation toe aan `User`: `comparisons Comparison[]`

**Commands:**
```bash
npx prisma migrate dev --name add_comparison_model
npx prisma generate
```

---

## Stap 3: RabbitMQ in Node.js

### Nieuw bestand: `Backend/services/messageBroker.js`
- `connect()` — verbinding met RabbitMQ, 2 queues aanmaken
- `publishJob({ jobId, url, userId })` — stuurt job naar `comparison.requests`
- `consumeResults(handler)` — luistert op `comparison.results`, roept handler aan

### Nieuw bestand: `Backend/controllers/compareController.js`
- `compareArticle(req, res)`:
  1. Maak `Comparison` record aan met `status: "pending"`
  2. Publiceer job naar RabbitMQ
  3. Antwoord HTTP 202 `{ jobId, status: "pending" }` — binnen < 100ms
- `getComparisonStatus(req, res)`:
  1. Zoek Comparison op `jobId`
  2. Stuur huidige status terug

### Wijziging: `Backend/server.js`
- Registreer 2 nieuwe routes: `POST /compare-article`, `GET /compare-article/:jobId`
- Initialiseer RabbitMQ bij startup: verbind + start `consumeResults` listener
- Listener updatet de Comparison in de DB als Python een resultaat publiceert

---

## Stap 4: Temporal Workflow in Python

### Nieuw bestand: `PythonService/workflows/compare_workflow.py`
- `CompareArticleWorkflow` — Temporal workflow definitie
- Roept de bestaande services aan als activities (hergebruik van `rag.py` services):
  - `scrape_and_chunk` → hergebruikt `services/scraper.py`
  - `embed_chunks` → hergebruikt `services/embeddings.py`
  - `upsert_to_pinecone` → hergebruikt `services/vector_store.py`
  - `search_similar` → hergebruikt `services/vector_store.py`
  - `analyze_bias` → hergebruikt `services/analyzer.py`

### Nieuw bestand: `PythonService/worker.py`
- Verbindt met Temporal (localhost:7233)
- Registreert workflow + activities
- Draait als apart process naast `uvicorn`

### Wijziging: `PythonService/main.py`
- Start bij opstart een background task die:
  1. Verbindt met RabbitMQ, luistert op `comparison.requests`
  2. Per bericht: start `CompareArticleWorkflow` via Temporal client
  3. Publiceert resultaat naar `comparison.results`

### Nieuwe dependencies:
```
temporalio>=1.7.0
aio-pika>=9.4.0
```

---

## Stap 5: History & Stats uitbreiden

**Bestand:** `Backend/controllers/historyController.js`

- `getStats`: voeg `totalComparisons` toe (count van completed Comparisons)
- `getHistory`: voeg `?type=comparison` branch toe die Comparisons ophaalt

---

## Stap 6: Frontend API

**Bestand:** `Frontend/Frontend/src/services/apiService.js`

- `compareArticle(url)` → POST /compare-article, geeft `{ jobId }` terug
- `getComparisonStatus(jobId)` → GET /compare-article/:jobId, poll elke 3s

---

## Kritieke bestanden

| Bestand | Actie |
|---|---|
| `docker-compose.yml` | Nieuw |
| `Backend/prisma/schema.prisma` | Uitbreiden |
| `Backend/services/messageBroker.js` | Nieuw |
| `Backend/controllers/compareController.js` | Nieuw |
| `Backend/server.js` | 2 routes + RabbitMQ init |
| `PythonService/workflows/compare_workflow.py` | Nieuw |
| `PythonService/worker.py` | Nieuw |
| `PythonService/main.py` | RabbitMQ consumer toevoegen |
| `Backend/controllers/historyController.js` | Uitbreiden |
| `Frontend/Frontend/src/services/apiService.js` | 2 functies toevoegen |

---

## Verificatie end-to-end

1. `docker compose up -d` → RabbitMQ UI + Temporal UI bereikbaar
2. Start Node.js + Python service + Python worker
3. `POST /compare-article { "url": "..." }` → `{ jobId, status: "pending" }` in < 100ms
4. Temporal UI (localhost:8080) → workflow verschijnt, activities lopen één voor één
5. `GET /compare-article/:jobId` → `status: "completed"` na ~30-60s
6. RabbitMQ UI → queues `comparison.requests` + `comparison.results` zichtbaar
7. `GET /stats` → `totalComparisons: 1`
