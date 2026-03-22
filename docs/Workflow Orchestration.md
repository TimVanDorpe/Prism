# Workflow Orchestration Plan: RabbitMQ + Docker + Temporal

## Context

Prism currently analyzes a single article for bias. The Python FastAPI microservice (Steps 1–9 per `Ai Service Plan.MD`) adds multi-source comparison (like Ground News). This document covers:
1. Integrating the Python service into the Node.js backend
2. Adding **RabbitMQ** for async inter-service messaging
3. **Dockerizing** all services with Docker Compose
4. Using **Temporal** to orchestrate the multi-step comparison workflow in Python

**Architecture overview:**
```
Frontend → Node.js (port 5000) → RabbitMQ → Python service (port 8000)
                                                 └→ Temporal Workflow
                                                       ├→ Scrape
                                                       ├→ Embed
                                                       ├→ Search Pinecone
                                                       └→ Analyze Bias
```
Node.js acts as the **gateway** (auth + DB persistence + message publisher).
Python is the **worker** (Temporal workflow executor + activity runner).
RabbitMQ **decouples** them — Node.js submits jobs async, Python consumes and processes.
Temporal **orchestrates** the pipeline steps with retries, timeouts, and visibility.

---

## Technology Map

| Technology | Role | Where |
|------------|------|--------|
| **Docker Compose** | Run all services in containers | Root `docker-compose.yml` |
| **RabbitMQ** | Async job queue between Node.js ↔ Python | `comparison.requests` + `comparison.results` queues |
| **Temporal** | Workflow orchestration for the multi-step pipeline | Python service |
| LangChain | Document loading, chunking, LCEL chains | Python service (per AI Service Plan) |
| Pinecone | Vector search for related articles | Python service (per AI Service Plan) |

---

## Step 1 — Docker Compose (All Services)

**File to create:** `docker-compose.yml` (at project root)

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: Prism
      POSTGRES_USER: prism
      POSTGRES_PASSWORD: prism
    ports: ["5432:5432"]
    volumes: ["postgres_data:/var/lib/postgresql/data"]

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"     # AMQP
      - "15672:15672"   # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: prism
      RABBITMQ_DEFAULT_PASS: prism

  temporal:
    image: temporalio/auto-setup:latest
    ports: ["7233:7233"]
    environment:
      DB: postgresql
      DB_PORT: 5432
      POSTGRES_USER: prism
      POSTGRES_PWD: prism
      POSTGRES_SEEDS: postgres
    depends_on: [postgres]

  temporal-ui:
    image: temporalio/ui:latest
    ports: ["8080:8080"]
    environment:
      TEMPORAL_ADDRESS: temporal:7233
    depends_on: [temporal]

  node-backend:
    build: ./Backend
    ports: ["5000:5000"]
    env_file: ./Backend/.env
    environment:
      RABBITMQ_URL: amqp://prism:prism@rabbitmq:5672
      DATABASE_URL: postgresql://prism:prism@postgres:5432/Prism
    depends_on: [postgres, rabbitmq]

  python-service:
    build: ./PythonService
    ports: ["8000:8000"]
    env_file: ./PythonService/.env
    environment:
      RABBITMQ_URL: amqp://prism:prism@rabbitmq:5672
      TEMPORAL_HOST: temporal:7233
    depends_on: [rabbitmq, temporal]

volumes:
  postgres_data:
```

**Backend/Dockerfile:**
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx prisma generate
CMD ["node", "server.js"]
```

**PythonService/Dockerfile:**
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Verify:**
- `docker compose up -d` → all containers healthy
- RabbitMQ UI: `http://localhost:15672` (prism/prism)
- Temporal UI: `http://localhost:8080`
- Node.js: `http://localhost:5000/health`
- Python: `http://localhost:8000/docs`

---

## Step 2 — Prisma Schema Extension

**File:** `Backend/prisma/schema.prisma`

Add `Comparison` model (additive — no changes to existing models):

```prisma
model Comparison {
  id               Int       @id @default(autoincrement())
  jobId            String    @unique   // RabbitMQ correlationId
  url              String
  userId           Int
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  status           String    @default("pending")  // "pending" | "completed" | "failed"
  createdAt        DateTime  @default(now())
  completedAt      DateTime?
  originalSource   String?
  originalScore    Int?
  originalLeaning  String?   // "left" | "right" | "neutral"
  originalSummary  String?   @db.Text
  relatedArticles  Json?     // Array of ArticleComparison (null until completed)
  costUsd          Float?
  errorMessage     String?   // Populated if status = "failed"
}
```

Also add back-relation on `User`:
```prisma
model User {
  // ... existing fields ...
  comparisons Comparison[]  // ADD THIS
}
```

The `jobId` field links the RabbitMQ message back to the DB record.

Run:
```bash
npx prisma migrate dev --name add_comparison_model
npx prisma generate
```

**Verify:** `npx prisma studio` shows `Comparison` table.

---

## Step 3 — RabbitMQ in Node.js Backend

**New file:** `Backend/services/messageBroker.js`

New npm dependency: `npm install amqplib`

```js
const amqp = require('amqplib');

const RABBITMQ_URL   = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const REQUEST_QUEUE  = 'comparison.requests';
const RESULTS_QUEUE  = 'comparison.results';

let channel = null;

async function connect() {
  const conn = await amqp.connect(RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertQueue(REQUEST_QUEUE, { durable: true });
  await channel.assertQueue(RESULTS_QUEUE, { durable: true });
  console.log('[RabbitMQ] Connected');
}

async function publishJob(payload) {
  // payload: { jobId, url, userId }
  channel.sendToQueue(
    REQUEST_QUEUE,
    Buffer.from(JSON.stringify(payload)),
    { persistent: true, correlationId: payload.jobId }
  );
}

async function consumeResults(handler) {
  // handler(result) called when Python publishes to comparison.results
  channel.consume(RESULTS_QUEUE, async (msg) => {
    if (!msg) return;
    const result = JSON.parse(msg.content.toString());
    await handler(result);
    channel.ack(msg);
  });
}

module.exports = { connect, publishJob, consumeResults };
```

**In `Backend/server.js`** — initialize on startup (after route registration):
```js
const broker = require('./services/messageBroker');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

broker.connect().then(() => {
  broker.consumeResults(async (result) => {
    // result from Python: { jobId, status, original, related, costUsd, error }
    await prisma.comparison.update({
      where: { jobId: result.jobId },
      data: {
        status:          result.status,
        completedAt:     new Date(),
        originalSource:  result.original?.source,
        originalScore:   result.original?.biasScore,
        originalLeaning: result.original?.biasedLeaning,
        originalSummary: result.original?.summary,
        relatedArticles: result.related ?? [],
        costUsd:         result.costUsd ?? null,
        errorMessage:    result.error ?? null
      }
    });
  });
});
```

---

## Step 4 — `compareController.js` (Async Pattern)

**File to create:** `Backend/controllers/compareController.js`

New npm dependency: `npm install uuid`

```js
const { PrismaClient } = require('@prisma/client');
const { publishJob } = require('../services/messageBroker');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function compareArticle(req, res) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  const userId = req.user.userId;
  const jobId  = uuidv4();

  // Create pending record immediately
  const comparison = await prisma.comparison.create({
    data: { jobId, url, userId, status: 'pending' }
  });

  // Publish to RabbitMQ — returns instantly
  await publishJob({ jobId, url, userId });

  // HTTP 202 Accepted (job accepted, not yet complete)
  res.status(202).json({ jobId, comparisonId: comparison.id, status: 'pending' });
}

async function getComparisonStatus(req, res) {
  const { jobId } = req.params;
  const comparison = await prisma.comparison.findUnique({ where: { jobId } });
  if (!comparison) return res.status(404).json({ error: 'Job not found' });
  res.json(comparison);
}

module.exports = { compareArticle, getComparisonStatus };
```

**Routes in `server.js`:**
```js
const { compareArticle, getComparisonStatus } = require('./controllers/compareController');

app.post('/compare-article',         requireAuth, compareArticle);
app.get('/compare-article/:jobId',   requireAuth, getComparisonStatus);
```

**Verify:** `POST /compare-article` returns `{ jobId, status: "pending" }` within < 100ms.

---

## Step 5 — Temporal Workflow in Python Service

Wraps the RAG pipeline from `Ai Service Plan.MD` Step 7 into a durable, observable Temporal workflow.

New Python dependency: `pip install temporalio aio-pika`

**New file: `PythonService/workflows/compare_workflow.py`**

```python
from datetime import timedelta
from dataclasses import dataclass
from temporalio import workflow, activity

@dataclass
class CompareInput:
    job_id: str
    url: str
    user_id: int

@workflow.defn
class CompareArticleWorkflow:
    @workflow.run
    async def run(self, inp: CompareInput) -> dict:
        # Each activity = one step from Ai Service Plan
        chunks = await workflow.execute_activity(
            scrape_and_chunk, inp.url,
            schedule_to_close_timeout=timedelta(seconds=30)
        )
        embeddings = await workflow.execute_activity(
            embed_chunks, chunks,
            schedule_to_close_timeout=timedelta(seconds=60)
        )
        await workflow.execute_activity(
            upsert_to_pinecone, (inp.url, chunks, embeddings),
            schedule_to_close_timeout=timedelta(seconds=30)
        )
        related = await workflow.execute_activity(
            search_similar, embeddings[0],
            schedule_to_close_timeout=timedelta(seconds=10)
        )
        original = await workflow.execute_activity(
            analyze_bias, inp.url,
            schedule_to_close_timeout=timedelta(seconds=60)
        )
        related_analyzed = []
        for r in related:
            result = await workflow.execute_activity(
                analyze_bias, r['url'],
                schedule_to_close_timeout=timedelta(seconds=60)
            )
            related_analyzed.append(result)

        return {
            "jobId":    inp.job_id,
            "status":   "completed",
            "original": original,
            "related":  related_analyzed,
        }
```

**New file: `PythonService/worker.py`**

```python
import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
from workflows.compare_workflow import CompareArticleWorkflow
from services.scraper import scrape_and_chunk
from services.embeddings import embed_chunks
from services.vector_store import upsert_to_pinecone, search_similar
from services.analyzer import analyze_bias

async def main():
    client = await Client.connect("localhost:7233")
    async with Worker(
        client,
        task_queue="comparison-queue",
        workflows=[CompareArticleWorkflow],
        activities=[scrape_and_chunk, embed_chunks, upsert_to_pinecone,
                    search_similar, analyze_bias],
    ):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())
```

**Updated `PythonService/api/routes.py`** — add RabbitMQ consumer on startup:

```python
# On app startup: launch background task that:
#   1. Connects to RabbitMQ, consumes from comparison.requests
#   2. For each message: start CompareArticleWorkflow via Temporal client
#   3. Awaits workflow result handle
#   4. Publishes result to RabbitMQ comparison.results
```

**Verify:** Submit job from Node.js → Temporal UI at `http://localhost:8080` shows workflow running with each activity visible → result published to RabbitMQ → Node.js DB updated to `status: "completed"`.

---

## Step 6 — `/history` and `/stats` Extensions

**File:** `Backend/controllers/historyController.js`

**`getStats`** — additive change only:
```js
const totalComparisons = await prisma.comparison.count({ where: { status: 'completed' } });
// Add to res.json():
totalComparisons,
```

**`getHistory`** — new branch for `?type=comparison`:
```js
if (req.query.type === 'comparison') {
  const comparisons = await prisma.comparison.findMany({
    where: userId ? { userId: parseInt(userId) } : {},
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
    include: { user: { select: { id: true, email: true } } }
  });
  return res.json({
    total: comparisons.length,
    comparisons: comparisons.map(c => ({
      id: c.id, jobId: c.jobId, url: c.url, user: c.user,
      status: c.status, createdAt: c.createdAt,
      originalLeaning: c.originalLeaning,
      originalScore: c.originalScore,
      relatedCount: (c.relatedArticles ?? []).length
    }))
  });
}
// ... existing article history branch unchanged ...
```

---

## Step 7 — Frontend API Service

**File:** `Frontend/Frontend/src/services/apiService.js`

```js
// Submit comparison job — returns immediately with jobId
export async function compareArticle(url) {
  const res = await fetch(`${API_BASE_URL}/compare-article`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ url })
  });
  if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
  return res.json(); // { jobId, comparisonId, status: 'pending' }
}

// Poll for result (call every 3s until status === 'completed' or 'failed')
export async function getComparisonStatus(jobId) {
  const res = await fetch(`${API_BASE_URL}/compare-article/${jobId}`, {
    headers: authHeader()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

Typical UI flow: submit URL → receive `jobId` → poll `getComparisonStatus(jobId)` every 3s → render result when `status === 'completed'`.

---

## New Environment Variables

**`Backend/.env` additions:**
```
RABBITMQ_URL=amqp://prism:prism@localhost:5672
```

**`PythonService/.env` additions:**
```
RABBITMQ_URL=amqp://prism:prism@localhost:5672
TEMPORAL_HOST=localhost:7233
```

---

## New Dependencies

**Backend (npm):**
```
amqplib   — RabbitMQ AMQP client
uuid      — generate jobId (correlationId)
```

**Python:**
```
temporalio>=1.7.0   — Temporal Python SDK
aio-pika>=9.4.0     — Async RabbitMQ client
```

---

## Files Summary

| File | Action |
|------|--------|
| `docker-compose.yml` | **New** — postgres, rabbitmq, temporal, temporal-ui, node-backend, python-service |
| `Backend/Dockerfile` | **New** |
| `PythonService/Dockerfile` | **New** |
| `Backend/prisma/schema.prisma` | Add `Comparison` model with `jobId` + `status` fields |
| `Backend/services/messageBroker.js` | **New** — amqplib connect / publish / consume |
| `Backend/controllers/compareController.js` | **New** — async POST (202) + GET status |
| `Backend/server.js` | Import controller, register 2 routes, init RabbitMQ consumer, Swagger JSDoc |
| `Backend/controllers/historyController.js` | Add `totalComparisons` to stats, `?type=comparison` branch |
| `Frontend/Frontend/src/services/apiService.js` | Add `compareArticle()` + `getComparisonStatus()` |
| `PythonService/workflows/compare_workflow.py` | **New** — Temporal workflow + activities |
| `PythonService/worker.py` | **New** — Temporal worker process |
| `PythonService/api/routes.py` | Add RabbitMQ consumer → triggers Temporal workflow |

---

## End-to-End Verification

1. `docker compose up -d` → all 6 containers healthy
2. RabbitMQ UI (`localhost:15672`) → queues `comparison.requests` and `comparison.results` visible
3. Temporal UI (`localhost:8080`) → namespace `default` ready
4. `POST /compare-article { "url": "https://bbc.com/..." }` → `{ jobId, status: "pending" }` returned in < 100ms
5. Temporal UI → `CompareArticleWorkflow` appears, activities execute one by one
6. `GET /compare-article/:jobId` → `status: "completed"` after workflow finishes (~30–60s)
7. `GET /stats` → `totalComparisons: 1`
8. `GET /history?type=comparison` → shows the stored comparison
9. Stop RabbitMQ container → Node.js logs connection error with clear message, other endpoints still work
