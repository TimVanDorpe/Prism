# 🎉 DATABASE PERSISTENCE - COMPLETE UPGRADE

## ✅ Wat is er NIEUW?

Je backend slaat nu **automatisch alles op** in de database! Elke analyse wordt permanent opgeslagen.

---

## 📋 **Wat ik heb gedaan:**

### **1. ✨ Nieuwe Features**

#### **Auto-Save Analyses** 💾
- Elke `/analyze-article` request slaat nu automatisch op:
  - Article (URL + content)
  - AnalysedResult (bias score, leaning, summary)
  - User koppeling (automatisch of via userId parameter)

#### **Smart Caching** ♻️
- Als je dezelfde URL opnieuw analyseert → geeft cached result terug (GRATIS!)
- Voeg `skipCache: true` toe om cache te omzeilen

#### **User Management** 👤
- Default "system@prism.local" user wordt automatisch aangemaakt
- Je kunt optioneel een `userId` meesturen
- Geen user? → Gebruikt automatisch system user

#### **History Endpoints** 📜
- `GET /history` - Bekijk alle analyses
- `GET /history/:id` - Bekijk specifieke analyse
- `GET /stats` - Systeem statistieken

---

### **2. 📁 Nieuwe Bestanden**

```
Backend/
├── utils/                          ✨ NEW
│   └── userUtils.js               → User management helpers
├── controllers/
│   └── historyController.js       ✨ NEW → History & stats endpoints
├── services/
│   └── biasAnalyzer.js            🔄 UPDATED → Now saves to DB!
└── server.js                       🔄 UPDATED → New routes added
```

---

### **3. 🔄 Updated Bestanden**

#### **`services/biasAnalyzer.js`**
**TOEGEVOEGD:**
- ✅ `checkExistingAnalysis()` - Check voor cached results
- ✅ `saveAnalysisToDatabase()` - Sla analyse op in DB
- ✅ Database opslag na succesvolle Claude response
- ✅ Cache checking (tenzij `skipCache: true`)
- ✅ User management integratie

**RESULTAAT:**
```javascript
// Streamt response + slaat op in DB
res.write(`data: ${JSON.stringify({ 
  type: 'complete', 
  result: analysisResult,
  articleId: 123,        // 💾 Database ID!
  resultId: 456,         // 💾 Result ID!
  saved: true            // ✅ Opgeslagen!
})}\n\n`);
```

#### **`server.js`**
**TOEGEVOEGD:**
- ✅ Import `historyController`
- ✅ Route: `GET /history`
- ✅ Route: `GET /history/:id`
- ✅ Route: `GET /stats`
- ✅ Swagger documentatie updates
- ✅ Console logs voor nieuwe endpoints

---

### **4. 🆕 Nieuwe API Endpoints**

| Endpoint | Method | Beschrijving |
|----------|--------|--------------|
| `/history` | GET | Lijst van alle analyses |
| `/history?limit=10` | GET | Laatste 10 analyses |
| `/history?userId=1` | GET | Analyses voor specific user |
| `/history/:id` | GET | Specifieke analyse ophalen |
| `/stats` | GET | Systeem statistieken |

---

## 🎯 **Hoe het nu werkt:**

### **VOOR (zonder database):**
```javascript
POST /analyze-article { "url": "..." }
→ Claude analyseert
→ Stuurt resultaat via SSE
→ KLAAR (niks opgeslagen!) ❌
```

### **NA (met database):**
```javascript
POST /analyze-article { "url": "..." }
→ Check cache: bestaat URL al? ♻️
→ Zo ja: return cached result (FREE!)
→ Zo nee: 
    → Claude analyseert
    → Stuurt via SSE
    → SLAAT OP in database 💾
    → Returnt met articleId + resultId
```

---

## 🧪 **Test het NU:**

### **1. Start server:**
```bash
npm start
```

### **2. Analyseer een artikel:**
```bash
curl.exe -X POST http://localhost:5000/analyze-article `
  -H "Content-Type: application/json" `
  -d "{\"url\": \"https://www.bbc.com/news\"}"
```

**Response bevat nu:**
```json
{
  "type": "complete",
  "result": { 
    "biasScore": 45,
    "biasedLeaning": "neutral",
    ...
  },
  "articleId": 1,      // 💾 DB ID!
  "resultId": 1,       // 💾 DB ID!
  "saved": true        // ✅
}
```

### **3. Bekijk history:**
```bash
curl http://localhost:5000/history
```

**Response:**
```json
{
  "total": 1,
  "articles": [
    {
      "id": 1,
      "url": "https://www.bbc.com/news",
      "user": { "id": 1, "email": "system@prism.local" },
      "result": {
        "biasScore": 45,
        "biasedLeaning": "neutral",
        "summary": "..."
      },
      "analyzed": true
    }
  ]
}
```

### **4. Bekijk stats:**
```bash
curl http://localhost:5000/stats
```

**Response:**
```json
{
  "totalArticles": 1,
  "totalAnalyses": 1,
  "totalUsers": 1,
  "avgBiasScore": 45,
  "byLeaning": {
    "neutral": 1,
    "left": 0,
    "right": 0
  }
}
```

---

## 🎨 **Nieuwe Request Parameters**

### **`POST /analyze-article`**

```json
{
  "url": "https://...",      // Required
  "userId": 123,              // Optional - defaults to system user
  "skipCache": true           // Optional - force new analysis
}
```

**Voorbeelden:**

```javascript
// Basic (gebruikt cache, system user)
{ "url": "https://bbc.com/news" }

// Met specifieke user
{ "url": "https://bbc.com/news", "userId": 2 }

// Force nieuwe analyse (skip cache)
{ "url": "https://bbc.com/news", "skipCache": true }
```

---

## 📊 **Database Schema (reminder)**

```prisma
model User {
  id       Int       @id @default(autoincrement())
  email    String    @unique
  articles Article[]
}

model Article {
  id       Int               @id @default(autoincrement())
  url      String
  content  String            @db.Text
  userId   Int
  user     User              @relation(...)
  result   AnalysedResult?   // ✨ One-to-one relation
}

model AnalysedResult {
  id           Int     @id @default(autoincrement())
  biasScore    Int     // 0-100
  biasedLeaning String // "left", "right", "neutral"
  summary      String  @db.Text
  articleId    Int     @unique
  article      Article @relation(...)
}
```

---

## 🔍 **Logging**

Je ziet nu in console:

```
[ANALYZER] Starting analysis for: https://...
[ANALYZER] User ID: 1 (system@prism.local)
[DB] Found existing analysis for URL (Article ID: 1)
[ANALYZER] ♻️ Returning cached analysis
```

Of bij nieuwe analyse:
```
[ANALYZER] Starting Claude stream...
[ANALYZER] ✅ JSON parsed successfully
[DB] Saving analysis to database...
[DB] ✅ Saved Article ID: 2, Result ID: 2
[DB] Bias Score: 35, Leaning: neutral
```

---

## 💡 **Tips**

### **Cache Management**
```javascript
// Eerste keer: Claude analyse (~$0.07)
POST /analyze-article { "url": "https://bbc.com/news" }

// Tweede keer: Cached result (GRATIS! ♻️)
POST /analyze-article { "url": "https://bbc.com/news" }

// Force nieuwe analyse:
POST /analyze-article { 
  "url": "https://bbc.com/news",
  "skipCache": true  // Betaal weer $0.07 maar krijg verse analyse
}
```

### **History filteren**
```javascript
// Laatste 5 analyses
GET /history?limit=5

// Analyses voor user 2
GET /history?userId=2

// Specifieke analyse
GET /history/123
```

---

## 🚀 **Volgende Stappen**

Nu je database persistence hebt:

1. ✅ **React Frontend** bouwen die history toont
2. ✅ **Dashboard** maken met stats visualisatie
3. ✅ **User authentication** toevoegen (JWT)
4. ✅ **Export functie** (download als CSV/PDF)
5. ✅ **Duplicate detection** verfijnen

---

## 📝 **Samenvatting**

### **Wat werkt NU:**
✅ Auto-save alle analyses naar database  
✅ Smart caching (gratis herhaalde analyses)  
✅ Default user management  
✅ History endpoints (lijst + details)  
✅ Statistieken endpoint  
✅ Volledige Swagger docs  
✅ VS Code debugging  

### **Wat je KUNT doen:**
✅ Analyseer artikelen → automatisch opgeslagen  
✅ Bekijk history → `/history`  
✅ Bekijk stats → `/stats`  
✅ Cached results → bespaar kosten!  
✅ Filter op user → `/history?userId=X`  

---

**JE HEBT NU EEN VOLLEDIGE CRUD + AI BACKEND MET DATABASE PERSISTENCE!** 🎉

Test het uit en laat me weten wat je ervan vindt! 💪
