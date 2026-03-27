# Workflow Orchestration — BullMQ + Temporal

## Wat is BullMQ?

Een **job queue library voor Node.js** gebouwd op Redis. Simpler dan RabbitMQ: geen aparte broker-server met eigen protocol, gewoon Redis als opslag.

```
POST /compare-article
       │
       ▼
  BullMQ Queue (Redis)
       │
       ▼
  BullMQ Worker (Node.js)
       │
       ▼
  HTTP call naar Python/Temporal
```

**Waarom BullMQ i.p.v. RabbitMQ?**
- Node.js hoeft niet te wachten tot Python klaar is (fire-and-forget)
- Ingebouwde retry, delay en prioriteit — geen boilerplate
- Eén Redis container i.p.v. een volledige RabbitMQ broker
- BullMQ is Node.js-native: producer én worker in hetzelfde ecosysteem

**Zonder BullMQ:** Node.js blokkeert 30-60 seconden op Python
**Met BullMQ:** Node.js antwoordt in < 100ms met een jobId, Worker verwerkt op de achtergrond

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

Docker is nodig om Redis en Temporal lokaal te draaien.

1. Download Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Installeer en herstart
3. Verifieer: `docker --version` in terminal

---

## Stap 1: Docker Compose (infrastructuur)

**Nieuw bestand:** `Prism/docker-compose.yml`

Draait alleen de infrastructuur (niet de app zelf):
- PostgreSQL (voor de DB)
- Redis (port 6379) — gebruikt door BullMQ
- Temporal server (port 7233)
- Temporal UI (port 8080)

**Verifieer:**
- `docker compose up -d`
- Redis bereikbaar: `docker exec -it redis redis-cli ping` → `PONG`
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

## Stap 3: BullMQ in Node.js

### Nieuwe dependency
```bash
npm install bullmq
```
Geen RabbitMQ nodig — BullMQ gebruikt de Redis container uit Stap 1.

### Nieuw bestand: `Backend/services/queue.js`
- Exporteert een BullMQ `Queue` instantie (`comparisonQueue`) verbonden met Redis
- `addComparisonJob({ jobId, url, userId })` — voegt job toe aan de queue

### Nieuw bestand: `Backend/services/worker.js`
- BullMQ `Worker` die jobs van `comparisonQueue` verwerkt
- Per job:
  1. Roept de Python service aan via HTTP (`POST /run-comparison`)
  2. Updatet de `Comparison` in de DB met het resultaat (`status: "completed"`)
  3. Bij fout: updatet `status: "failed"` + `errorMessage`

### Nieuw bestand: `Backend/controllers/compareController.js`
- `compareArticle(req, res)`:
  1. Maak `Comparison` record aan met `status: "pending"`
  2. Voeg job toe aan BullMQ queue via `addComparisonJob()`
  3. Antwoord HTTP 202 `{ jobId, status: "pending" }` — binnen < 100ms
- `getComparisonStatus(req, res)`:
  1. Zoek Comparison op `jobId`
  2. Stuur huidige status terug

### Wijziging: `Backend/server.js`
- Registreer 2 nieuwe routes: `POST /compare-article`, `GET /compare-article/:jobId`
- Importeer en start de BullMQ worker bij opstart

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
- Voeg een nieuw endpoint toe: `POST /run-comparison`
  1. Ontvangt `{ jobId, url, userId }` van de Node.js BullMQ worker
  2. Start `CompareArticleWorkflow` via Temporal client
  3. Wacht op resultaat en geeft het terug als HTTP response

### Nieuwe dependencies:
```
temporalio>=1.7.0
```
_(geen `aio-pika` meer nodig — Python communiceert nu via HTTP, niet via een queue)_

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
| `Backend/services/queue.js` | Nieuw — BullMQ Queue |
| `Backend/services/worker.js` | Nieuw — BullMQ Worker |
| `Backend/controllers/compareController.js` | Nieuw |
| `Backend/server.js` | 2 routes + BullMQ worker init |
| `PythonService/workflows/compare_workflow.py` | Nieuw |
| `PythonService/worker.py` | Nieuw |
| `PythonService/main.py` | RabbitMQ consumer toevoegen |
| `Backend/controllers/historyController.js` | Uitbreiden |
| `Frontend/Frontend/src/services/apiService.js` | 2 functies toevoegen |

---

## Verificatie end-to-end

1. `docker compose up -d` → Redis + Temporal UI bereikbaar
2. Start Node.js + Python service + Python worker
3. `POST /compare-article { "url": "..." }` → `{ jobId, status: "pending" }` in < 100ms
4. BullMQ Worker pikt job op → roept Python aan via HTTP
5. Temporal UI (localhost:8080) → workflow verschijnt, activities lopen één voor één
6. `GET /compare-article/:jobId` → `status: "completed"` na ~30-60s
7. `GET /stats` → `totalComparisons: 1`
