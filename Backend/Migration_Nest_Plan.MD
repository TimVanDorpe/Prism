# Migration Plan: Express → NestJS

## Context

The current Express 5 backend is functional but has structural issues that compound as the project grows: 7+ separate `new PrismaClient()` instances, no input validation, monolithic `server.js` with all routes, and JSDoc-based Swagger that drifts from the code. NestJS solves all of this with built-in dependency injection, class-validator DTOs, and decorator-based Swagger that stays in sync automatically. The Prisma schema, env vars, database, frontend, and Python service are **completely unchanged** — only the Node.js HTTP layer is replaced.

---

## Approach: Full rewrite in parallel, then swap

Build a fresh NestJS project alongside `Backend/`, run both on different ports to verify parity, then cut over.

- `Backend/` stays untouched until the NestJS version is verified
- `prisma/schema.prisma` is copied as-is — zero DB changes
- All endpoint paths remain identical (frontend requires no changes)
- Worker runs in the **same process** initially (matches current behavior)

---

## Target File Structure

```
Backend-Nest/
├── src/
│   ├── main.ts                           # Bootstrap, Swagger, ValidationPipe, CORS
│   ├── app.module.ts                     # Root module
│   ├── prisma/
│   │   ├── prisma.module.ts              # @Global() module
│   │   └── prisma.service.ts             # extends PrismaClient, connect/disconnect lifecycle
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts            # POST /auth/register, POST /auth/login
│   │   ├── auth.service.ts               # bcrypt + JWT sign
│   │   ├── auth.guard.ts                 # CanActivate: replaces authMiddleware.js
│   │   └── dto/register.dto.ts, login.dto.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts           # CRUD /users, /users/:id
│   │   ├── users.service.ts              # includes findOrCreateDefault() (replaces userUtils.js)
│   │   └── dto/create-user.dto.ts, update-user.dto.ts
│   ├── articles/
│   │   ├── articles.module.ts
│   │   ├── articles.controller.ts        # CRUD /articles, /articles/:id
│   │   ├── articles.service.ts
│   │   └── dto/create-article.dto.ts, update-article.dto.ts
│   ├── results/
│   │   ├── results.module.ts
│   │   ├── results.controller.ts         # CRUD /articles/:id/results, /results/:id
│   │   ├── results.service.ts
│   │   └── dto/create-result.dto.ts, update-result.dto.ts
│   ├── analyze/
│   │   ├── analyze.module.ts
│   │   ├── analyze.controller.ts         # POST /analyze-article with @Sse() + @UseGuards
│   │   ├── analyze.service.ts            # scrape + Claude stream wrapped in Observable
│   │   └── dto/analyze-article.dto.ts
│   ├── history/
│   │   ├── history.module.ts
│   │   ├── history.controller.ts         # GET /history, /history/:id, /stats
│   │   └── history.service.ts
│   └── compare/
│       ├── compare.module.ts             # registers BullMQ queue + processor
│       ├── compare.controller.ts         # POST /compare-article, GET /compare-article/:jobId
│       ├── compare.service.ts            # enqueue job, get status
│       ├── dto/compare-article.dto.ts
│       └── worker/
│           └── comparison.processor.ts  # @Processor('comparisons'), calls Python service
├── prisma/
│   └── schema.prisma                     # Copied from Backend/prisma/ — unchanged
├── .env                                  # Same vars as Backend/.env
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## Route Mapping (all paths stay identical)

| Method | Path | Module | Auth |
|---|---|---|---|
| GET | `/health` | AppModule | No |
| POST | `/auth/register` | AuthModule | No |
| POST | `/auth/login` | AuthModule | No |
| CRUD | `/users`, `/users/:id` | UsersModule | No |
| CRUD | `/articles`, `/articles/:id` | ArticlesModule | No |
| CRUD | `/articles/:id/results`, `/results/:id` | ResultsModule | No |
| POST | `/analyze-article` | AnalyzeModule | Yes |
| GET | `/history`, `/history/:id`, `/stats` | HistoryModule | Yes |
| POST | `/compare-article` | CompareModule | Yes |
| GET | `/compare-article/:jobId` | CompareModule | Yes |

---

## Implementation Steps

### Phase 1 — Scaffold & Infrastructure
1. `npx @nestjs/cli new prism-backend-nest` in Prism root
2. Install all packages (see below)
3. Copy `Backend/prisma/` into `Backend-Nest/prisma/`
4. Create `PrismaModule` (`@Global()`) + `PrismaService` (extends PrismaClient, onModuleInit/Destroy)
5. Create `AuthGuard` (CanActivate, reads Bearer token, calls `jwtService.verify`, attaches `req.user`)
6. Set up `main.ts`: `ValidationPipe`, `enableCors()`, Swagger at `/api-docs`, port 5001 temporarily

### Phase 2 — Simple CRUD Modules
7. `UsersModule` — add `findOrCreateDefault()` to service (replaces `userUtils.js`)
8. `ArticlesModule`
9. `ResultsModule`

### Phase 3 — Auth Routes
10. `AuthService`: `bcrypt.hash`, `bcrypt.compare`, `jwtService.sign` (7d expiry)
11. `AuthController`: register + login
12. Apply `@UseGuards(AuthGuard)` to protected controllers/routes

### Phase 4 — SSE Streaming (hardest part)
13. `AnalyzeService.analyzeArticle()` returns `Observable<MessageEvent>`
14. Wrap Anthropic stream in `new Observable(subscriber => { ... })`
15. Emit `{ data: { type: 'status'|'chunk'|'complete'|'error', ... } }` — same shape as current SSE events
16. `AnalyzeController` uses `@Sse()` decorator + `@UseGuards(AuthGuard)`

### Phase 5 — Async Jobs
17. `CompareModule` registers `BullModule.registerQueue({ name: 'comparisons' })`
18. `CompareService` uses `@InjectQueue('comparisons')` to enqueue jobs
19. `ComparisonProcessor` extends `WorkerHost` with `@Processor('comparisons')` — calls Python service, updates DB

### Phase 6 — History
20. `HistoryModule` with all 3 endpoints (direct Prisma queries, no complex logic)

### Phase 7 — Verify & Cut Over
21. Run NestJS on port 5001 alongside Express on port 5000
22. Test all endpoints (compare responses)
23. Verify SSE stream works with frontend `EventSource`
24. Verify BullMQ job flow end-to-end
25. Switch NestJS to port 5000, retire `Backend/`
26. Update `CLAUDE.md` dev commands

---

## Key Implementation Details

### SSE in NestJS

NestJS has a built-in `@Sse()` decorator that sets `Content-Type: text/event-stream` automatically.
The Anthropic event emitter is wrapped in an RxJS `Observable` — this is the critical pattern.

```typescript
// analyze.controller.ts
@Post('analyze-article')
@UseGuards(AuthGuard)
@Sse()
analyzeArticle(@Body() dto: AnalyzeArticleDto, @Request() req): Observable<MessageEvent> {
  return this.analyzeService.analyzeArticle(dto, req.user.userId);
}
```

```typescript
// analyze.service.ts
analyzeArticle(dto, userId): Observable<MessageEvent> {
  return new Observable((subscriber) => {
    (async () => {
      subscriber.next({ data: { type: 'status', message: 'Extracting article...' } });
      const content = await this.extractArticleText(dto.url);
      const stream = await this.anthropic.messages.stream({ ... });
      stream.on('text', (text) => subscriber.next({ data: { type: 'chunk', content: text } }));
      stream.on('end', async () => {
        // save to DB, emit complete event
        subscriber.next({ data: { type: 'complete', result, articleId } });
        subscriber.complete();
      });
      stream.on('error', (err) => {
        subscriber.next({ data: { type: 'error', message: err.message } });
        subscriber.complete();
      });
    })();
  });
}
```

### Auth Guard (replaces `middleware/authMiddleware.js`)

```typescript
// auth.guard.ts
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException();
    req.user = this.jwtService.verify(token); // attaches { userId }
    return true;
  }
}
```

### BullMQ Worker (replaces `services/worker.js`)

```typescript
// comparison.processor.ts
@Processor('comparisons')
export class ComparisonProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) { super(); }

  async process(job: Job): Promise<void> {
    const { data } = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/run-comparison`,
      job.data
    );
    await this.prisma.comparison.update({
      where: { jobId: job.data.jobId },
      data: { status: 'completed', completedAt: new Date(), ...data },
    });
  }
}
```

### Prisma Singleton (replaces 7× `new PrismaClient()`)

```typescript
// prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

---

## Packages to Install

```bash
# Production
npm install @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/jwt \
  @nestjs/bullmq @nestjs/swagger @prisma/client prisma @anthropic-ai/sdk \
  bullmq bcryptjs axios cheerio class-validator class-transformer uuid \
  rxjs reflect-metadata

# Dev
npm install --save-dev @nestjs/cli @nestjs/testing @types/bcryptjs \
  @types/uuid @types/node typescript ts-node
```

### Package mapping vs current `Backend/`

| Current | NestJS equivalent | Notes |
|---|---|---|
| `express` | `@nestjs/platform-express` | NestJS wraps Express internally |
| `swagger-jsdoc` + `swagger-ui-express` | `@nestjs/swagger` | Decorator-based, auto-synced |
| `jsonwebtoken` | `@nestjs/jwt` | Wraps jsonwebtoken |
| `cors` middleware | `app.enableCors()` | Built into NestJS |
| `amqplib` (messageBroker.js) | **Dropped** | Unused RabbitMQ code |
| `bullmq` | `bullmq` + `@nestjs/bullmq` | Same Redis connection |
| Everything else | Same | No change |

---

## Reference Files During Implementation

| File | Used for |
|---|---|
| `Backend/services/biasAnalyzer.js` | `extractArticleText()`, Claude stream, SSE events, DB save → `analyze/analyze.service.ts` |
| `Backend/services/worker.js` | Job processing logic → `compare/worker/comparison.processor.ts` |
| `Backend/middleware/authMiddleware.js` | JWT logic → `auth/auth.guard.ts` |
| `Backend/controllers/historyController.js` | Query shapes for history/stats → `history/history.service.ts` |
| `Backend/prisma/schema.prisma` | Copy as-is — no changes |
| `Backend/server.js` | Authoritative list of all routes, which are protected, body/query shapes |

---

## Verification Checklist

- [ ] `npm run dev` in `Backend-Nest/` — server starts on port 5001
- [ ] `GET /health` → `{ status: 'ok', timestamp: ... }`
- [ ] `POST /auth/register` + `POST /auth/login` → JWT token returned
- [ ] CRUD on `/users`, `/articles`, `/results` — responses match Express on port 5000
- [ ] `POST /analyze-article` with JWT → SSE stream emits status/chunk/complete events
- [ ] Frontend `EventSource` receives SSE events correctly
- [ ] `GET /history` with JWT → returns past analyses
- [ ] `POST /compare-article` → `{ jobId, status: 'pending' }`; `GET /compare-article/:jobId` updates
- [ ] `GET /api-docs` → Swagger UI loads with all endpoints and Bearer auth
- [ ] Switch to port 5000, run frontend → everything works unchanged
