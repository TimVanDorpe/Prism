# Prism Backend - AI Article Bias Analyzer

Real-time article bias analysis using Claude AI, Node.js, PostgreSQL, and Prisma.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
npm install swagger-ui-express swagger-jsdoc --save
```

### 2. Setup Environment
Create `.env` file:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:admin@localhost:5432/Prism?schema=public"
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 3. Setup Database
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Start Server
```bash
npm start
```

## 📚 API Documentation

**Swagger UI:** http://localhost:5000/api-docs

Visual, interactive API documentation with:
- Try-it-out functionality
- Request/response examples
- Schema definitions
- Authentication (wanneer toegevoegd)

## 🔍 Testing Options

### 1. **Swagger UI** (http://localhost:5000/api-docs)
- Visual interface
- Try endpoints directly
- See request/response formats

### 2. **HTML Test Tool** (test-analyzer.html)
- Real-time SSE streaming visualization
- Best for `/analyze-article` endpoint
- Shows bias analysis as it happens

### 3. **VS Code REST Client** (test-api.http)
- Fast testing from VS Code
- Install "REST Client" extension
- Click "Send Request" above each endpoint

### 4. **cURL** (Command Line)
```bash
# Health check
curl http://localhost:5000/health

# Analyze article
curl -X POST http://localhost:5000/analyze-article \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.bbc.com/news/articles/c4gplne4pvyo"}'
```

## 📁 Project Structure

```
Backend/
├── controllers/          # Route handlers (thin layer)
│   ├── analyzeController.js
│   ├── articleController.js
│   ├── healthController.js
│   ├── resultController.js
│   └── userController.js
├── services/            # Business logic (thick layer)
│   └── biasAnalyzer.js
├── prisma/
│   └── schema.prisma
├── swagger.js           # Swagger/OpenAPI config
├── test-analyzer.html   # Visual test tool
├── test-api.http        # VS Code REST Client tests
├── .env                 # Environment variables
├── package.json
└── server.js           # Main entry point
```

## 💰 API Costs

**Claude Sonnet 4 Pricing:**
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens

**Per Article Analysis:**
- ~12.5k input tokens + ~2k output tokens
- **Cost: ~$0.07 USD per article**

## 🔧 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **AI:** Claude API (Anthropic)
- **Scraping:** Cheerio + Axios
- **Docs:** Swagger/OpenAPI

## 📖 API Endpoints

### Health
- `GET /health` - Server health check

### Users
- `POST /users` - Create user
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID

### Articles
- `POST /articles` - Create article
- `GET /articles` - Get all articles
- `GET /articles/:id` - Get article by ID
- `PUT /articles/:id` - Update article
- `DELETE /articles/:id` - Delete article

### Results
- `POST /articles/:id/results` - Create analysis result
- `GET /articles/:id/results` - Get result by article ID
- `PUT /results/:id` - Update result

### Analysis (Main Feature)
- `POST /analyze-article` - Real-time bias analysis with SSE streaming

## 🎯 Next Steps

1. **Frontend:** Build React frontend with SSE client
2. **Python Service:** Optional LangChain integration
3. **Caching:** Add Redis for repeated analyses
4. **Rate Limiting:** Protect against abuse
5. **Authentication:** Add JWT tokens

## 📝 Notes

- Swagger UI doesn't visualize SSE streams well
- Use `test-analyzer.html` for best SSE experience
- Database must be running before starting server
- API key required for `/analyze-article` endpoint
