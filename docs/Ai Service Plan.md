 Ready to code?
                                                                       
 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Plan: Python Microservice — Article Comparison (Ground News Style)    
                                                                       
 Context

 Prism currently analyzes a single article for bias. This microservice
  adds a "compare sources" layer: given one URL, it finds other news
 sources covering the same story and returns side-by-side bias
 comparisons — like Ground News.

 The goal is pedagogical: every step introduces exactly one new AI
 tooling technology. The user can stop after any step and have
 something running.

 ---
 Directory: Prism/PythonService/

 PythonService/
 ├── main.py                  # FastAPI app, route registration,       
 uvicorn entry
 ├── requirements.txt
 ├── .env.example
 ├── api/
 │   └── routes.py            # POST /compare  (rate-limited)
 ├── core/
 │   ├── config.py            # pydantic-settings: all env vars as     
 typed fields
 │   ├── limiter.py           # slowapi Limiter instance (10/minute)   
 │   └── cache.py             # In-memory TTL cache (dict + timestamp) 
 ├── models/
 │   └── schemas.py           # CompareRequest, ArticleComparison,     
 CompareResponse
 ├── services/
 │   ├── scraper.py           # LangChain WebBaseLoader +
 RecursiveCharacterTextSplitter
 │   ├── embeddings.py        # OpenAI text-embedding-3-small wrapper  
 │   ├── vector_store.py      # Pinecone upsert + query
 │   ├── analyzer.py          # ChatAnthropic + LCEL chain +
 PydanticOutputParser
 │   └── agent.py             # ReAct agent (Extra Step A)
 └── utils/
     └── cost_tracker.py      # tiktoken token counting + USD cost     
 math

 ---
 Fast Lane Track — Touch All Core Technologies

 Each step = one new technology. Stop any time.

 Step 1 — Skeleton (FastAPI + Pydantic + Rate Limiting)

 - main.py: FastAPI app, mount router, uvicorn on port 8000
 - core/config.py: pydantic-settings Settings class — all API keys     
 typed
 - core/limiter.py: slowapi.Limiter keyed on IP
 - models/schemas.py: CompareRequest(url), ArticleComparison(url,      
 source, biasScore, biasedLeaning, summary), CompareResponse(original, 
  related: list, costUsd)
 - api/routes.py: stub POST /compare decorated with
 @limiter.limit("10/minute")
 - Verify: uvicorn main:app --reload → open http://localhost:8000/docs 

 Step 2 — Document Loading & Chunking (LangChain)

 - services/scraper.py:
   - load_article(url) -> str via WebBaseLoader([url])
   - chunk_article(text) -> list[str] via
 RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)    
 - Verify: Print first 3 chunks from a real BBC URL

 Step 3 — Embeddings (Google Generative AI — free)

 - services/embeddings.py:
   - embed_text(text) -> list[float] — single embedding
   - embed_chunks(chunks) -> list[list[float]] — batch (cheaper)
   - Uses GoogleGenerativeAIEmbeddings(model="models/embedding-001")
 - Verify: Embed two similar sentences, print cosine similarity vs. an
  unrelated one

 Step 4 — Vector Database (Pinecone)

 - services/vector_store.py:
   - get_index() — connect/create index (dimension=1536,
 metric=cosine)
   - upsert_article(url, chunks, embeddings) — store with metadata     
 {url, chunk_index, text}
   - search_similar(query_embedding, top_k=10) -> list[dict]
 - Verify: Upsert 2 articles, query, check Pinecone dashboard

 Step 5 — Structured Output Parsing (LangChain LCEL + Pydantic)        

 - services/analyzer.py:
   - Pydantic model: BiasAnalysis(biasScore: int, biasedLeaning:       
 Literal['left','right','neutral'], summary: str)
   - analyze_bias(text) -> BiasAnalysis — chain: prompt |
 ChatAnthropic(model="claude-sonnet-4-20250514") |
 PydanticOutputParser
 - Verify: Call with a paragraph, get a typed Python object (not raw   
 string)

 Step 6 — In-Memory Cache

 - core/cache.py: dict-based {url_hash: (timestamp, result)} with TTL  
 - get_cached(url), set_cached(url, result), clear_expired()
 - Verify: Call /compare twice with same URL — second call returns     
 instantly

 Step 7 — Wire Everything (Full RAG Pipeline)

 - api/routes.py — replace stub with real flow:
   a. Check cache → return early if hit
   b. scraper.load_article → scraper.chunk_article
   c. embeddings.embed_text on first 1000 chars
   d. vector_store.upsert_article (store for future searches)
   e. vector_store.search_similar (find existing related articles)     
   f. analyzer.analyze_bias on original + each unique related URL      
   g. Build CompareResponse, store in cache, return
 - Verify: Submit same story from CNN + BBC one at a time — second     
 shows first as "related"

 Step 8 — LangSmith Tracing (zero code changes)

 - Set env vars only:
 LANGCHAIN_TRACING_V2=true
 LANGCHAIN_API_KEY=ls__...
 LANGCHAIN_PROJECT=prism-comparison
 - Open smith.langchain.com → see full trace: prompt sent, response,   
 token counts, timing
 - Verify: Submit an article, find the trace in LangSmith dashboard

 Step 9 — Cost Tracking

 - Geen tiktoken nodig — Anthropic stuurt token counts mee in elke response
   via usage_metadata (exact, niet geschat)
 - services/analyzer.py:
   - AnalysisResult dataclass: analysis + input_tokens + output_tokens
   - analyze_bias() geeft AnalysisResult terug i.p.v. BiasAnalysis
 - services/rag.py:
   - Telt input/output tokens op over alle analyze_bias() calls
   - _tokens_to_usd(): $3/1M input, $15/1M output
   - Vult costUsd in CompareResponse
 - Verify: /compare response bevat costUsd > 0.0 (~$0.07 per nieuw artikel)

 ---
 Extra Steps — Go Deeper After MVP

 A — ReAct Agent (Agentic Pattern)

 - services/agent.py: AgentExecutor with ReAct prompt + 4 tools:       
   - ScrapeArticleTool, EmbedAndStoreTool, SearchSimilarArticlesTool,  
 AnalyzeBiasTool
 - Watch in LangSmith as agent reasons step-by-step. Learn when agents 
  are unreliable vs. hardcoded pipelines.

 B — Web Search with Tavily (Cold Start Fix)

 - When Pinecone returns < 3 results, query Tavily for news URLs on    
 the same headline
 - Auto-scrape and index each result → immediate comparison even for   
 new topics

 C — Cohere Reranker (Two-Stage Retrieval)

 - After search_similar(top_k=20), pass chunks through
 cohere.rerank("rerank-english-v3.0")
 - Keep top 5 only — precision vs. recall lesson

 D — Redis Cache (Production Caching)

 - Replace in-memory dict in core/cache.py with redis-py
 - TTL set directly on Redis key (ex=3600) — survives restarts

 E — SSE Streaming Response (Match Node.js Protocol)

 - Replace JSON response with FastAPI StreamingResponse emitting:      
 data: {"type": "status", "message": "Scraping article..."}
 data: {"type": "complete", "result": {...}}
 - Exactly matches the format apiService.js already consumes —
 frontend works with zero changes

 ---
 Integration with Existing Node.js Backend

 Python service runs on port 8000 (internal). Node.js acts as the      
 gateway.

 Add to Backend/server.js — new endpoint proxying to Python:
 app.post('/compare-article', requireAuth, async (req, res) => {       
   const response = await fetch('http://localhost:8000/compare', {     
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ url: req.body.url })
   });
   const data = await response.json();
   res.json(data);
 });

 Frontend (apiService.js) — add:
 export async function compareArticle(url) {
   const res = await fetch(`${API_BASE_URL}/compare-article`, {        
     method: 'POST',
     headers: { 'Content-Type': 'application/json', Authorization:     
 `Bearer ${authService.getToken()}` },
     body: JSON.stringify({ url })
   });
   return res.json();
 }

 ---
 Environment Variables (PythonService/.env)

 ANTHROPIC_API_KEY=sk-ant-...   # same key as Backend/.env
 GOOGLE_API_KEY=AIza...          # embeddings only (free via aistudio.google.com)
 PINECONE_API_KEY=pcsk-...
 PINECONE_INDEX_NAME=prism-articles
 LANGCHAIN_TRACING_V2=true       # enable after Step 7
 LANGCHAIN_API_KEY=ls__...
 LANGCHAIN_PROJECT=prism-comparison
 PORT=8000
 CACHE_TTL_MINUTES=60
 RATE_LIMIT=10/minute
 # Extra Steps:
 # COHERE_API_KEY=...
 # TAVILY_API_KEY=tvly-...
 # REDIS_URL=redis://localhost:6379

 ---
 Key requirements.txt

 fastapi>=0.115.0
 uvicorn[standard]>=0.32.0
 slowapi>=0.1.9
 langchain>=0.3.0
 langchain-anthropic>=0.3.0
 langchain-google-genai>=2.0.0
 langchain-community>=0.3.0
 pinecone-client>=5.0.0
 langchain-pinecone>=0.2.0
 beautifulsoup4>=4.12.0
 requests>=2.32.0
 tiktoken>=0.8.0
 pydantic-settings>=2.6.0
 # cohere>=5.11.0          # Extra C
 # tavily-python>=0.5.0    # Extra B
 # redis>=5.2.0            # Extra D
 # langchain-cohere>=0.3.0 # Extra C

 ---
 Technology Map

 ┌──────┬──────────────────────────┬──────────────────────────────┐    
 │ Step │        Technology        │         Core Concept         │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ 1    │ FastAPI + Pydantic +     │ Type-safe APIs, auto-docs,   │    
 │      │ slowapi                  │ rate limiting                │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ 2    │ LangChain loaders +      │ Document loading, chunking   │    
 │      │ splitter                 │                              │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ 3    │ OpenAI embeddings        │ What a vector is, semantic   │    
 │      │                          │ similarity                   │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ 4    │ Pinecone                 │ Vector indexing,             │    
 │      │                          │ upsert/query                 │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ 5    │ LCEL +                   │ Chain composition,           │    
 │      │ PydanticOutputParser     │ structured output            │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ 6    │ In-memory cache          │ TTL caching                  │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ 7    │ Full RAG pipeline        │ Emergent RAG behavior        │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ 8    │ LangSmith                │ Tracing, AI observability    │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ 9    │ tiktoken                 │ Cost awareness               │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ A    │ ReAct agent              │ Agentic loops, tool calling  │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ B    │ Tavily                   │ Web search in RAG            │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ C    │ Cohere reranker          │ Two-stage retrieval          │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ D    │ Redis                    │ Production caching           │    
 ├──────┼──────────────────────────┼──────────────────────────────┤    
 │ E    │ SSE streaming            │ Match Node.js SSE protocol   │    
 └──────┴──────────────────────────┴──────────────────────────────┘    

 ---
 Critical Reference Files

 - Backend/services/biasAnalyzer.js — prompt structure + result shape  
 to stay compatible with
 - Frontend/Frontend/src/services/apiService.js — SSE consumption      
 format (Extra Step E must match)
 - Backend/server.js — where to register /compare-article proxy route  
 - Backend/prisma/schema.prisma — extend with Comparison model if      
 persistence is added later