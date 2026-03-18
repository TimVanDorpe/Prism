/**
 * Prism Backend Server
 * Real-time AI Article Bias Analyzer
 * NOW WITH COMPLETE CRUD + DATABASE PERSISTENCE! 💾
 * 
 * Stack: Node.js + Express + PostgreSQL + Prisma + Claude AI
 * 
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         email:
 *           type: string
 *           format: email
 *         articles:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Article'
 *     Article:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         url:
 *           type: string
 *           format: uri
 *         content:
 *           type: string
 *         userId:
 *           type: integer
 *         user:
 *           $ref: '#/components/schemas/User'
 *         result:
 *           $ref: '#/components/schemas/AnalysedResult'
 *     AnalysedResult:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         biasScore:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Bias score from 0 (neutral) to 100 (extremely biased)
 *         biasedLeaning:
 *           type: string
 *           enum: [left, right, neutral]
 *         summary:
 *           type: string
 *         articleId:
 *           type: integer
 *         article:
 *           $ref: '#/components/schemas/Article'
 *     BiasAnalysisRequest:
 *       type: object
 *       required:
 *         - url
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *           example: "https://www.bbc.com/news/articles/c4gplne4pvyo"
 *         userId:
 *           type: integer
 *           description: Optional user ID (defaults to system user)
 *         skipCache:
 *           type: boolean
 *           description: Skip cache and force new analysis
 *     BiasAnalysisResult:
 *       type: object
 *       properties:
 *         biasScore:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         biasedLeaning:
 *           type: string
 *           enum: [left, right, neutral]
 *         summary:
 *           type: string
 *         emotionalLanguage:
 *           type: array
 *           items:
 *             type: string
 *         cherryPickedFacts:
 *           type: array
 *           items:
 *             type: string
 *         loadedWords:
 *           type: array
 *           items:
 *             type: string
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger setup
const { swaggerUi, swaggerSpec } = require('./swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==================== IMPORT CONTROLLERS ====================
const { getHealth } = require('./controllers/healthController');
const { createUser, getAllUsers, getUserById, updateUser, deleteUser } = require('./controllers/userController');
const { createArticle, getAllArticles, getArticleById, updateArticle, deleteArticle } = require('./controllers/articleController');
const { createResult, getResultByArticleId, updateResult, deleteResult } = require('./controllers/resultController');
const { analyzeArticle } = require('./controllers/analyzeController');
const { getHistory, getAnalysisById, getStats } = require('./controllers/historyController');
const { register, login } = require('./controllers/authController');
const { requireAuth } = require('./middleware/authMiddleware');

// ==================== ROUTES ====================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running
 */
app.get('/health', getHealth);

// ==================== AUTH ROUTES ====================
app.post('/auth/register', register);
app.post('/auth/login', login);

// ==================== USER ROUTES (COMPLETE CRUD) ====================
/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 */
app.post('/users', createUser);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 */
app.get('/users', getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 */
app.get('/users/:id', getUserById);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 */
app.put('/users/:id', updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user (CASCADE deletes articles & results!)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
app.delete('/users/:id', deleteUser);

// ==================== ARTICLE ROUTES (COMPLETE CRUD) ====================
/**
 * @swagger
 * /articles:
 *   post:
 *     summary: Create a new article
 *     tags: [Articles]
 */
app.post('/articles', createArticle);

/**
 * @swagger
 * /articles:
 *   get:
 *     summary: Get all articles
 *     tags: [Articles]
 */
app.get('/articles', getAllArticles);

/**
 * @swagger
 * /articles/{id}:
 *   get:
 *     summary: Get article by ID
 *     tags: [Articles]
 */
app.get('/articles/:id', getArticleById);

/**
 * @swagger
 * /articles/{id}:
 *   put:
 *     summary: Update an article
 *     tags: [Articles]
 */
app.put('/articles/:id', updateArticle);

/**
 * @swagger
 * /articles/{id}:
 *   delete:
 *     summary: Delete an article
 *     tags: [Articles]
 */
app.delete('/articles/:id', deleteArticle);

// ==================== RESULT ROUTES (COMPLETE CRUD) ====================
/**
 * @swagger
 * /articles/{id}/results:
 *   post:
 *     summary: Create analysis result for an article
 *     tags: [Results]
 */
app.post('/articles/:id/results', createResult);

/**
 * @swagger
 * /articles/{id}/results:
 *   get:
 *     summary: Get analysis result for an article
 *     tags: [Results]
 */
app.get('/articles/:id/results', getResultByArticleId);

/**
 * @swagger
 * /results/{id}:
 *   put:
 *     summary: Update an analysis result
 *     tags: [Results]
 */
app.put('/results/:id', updateResult);

/**
 * @swagger
 * /results/{id}:
 *   delete:
 *     summary: Delete an analysis result
 *     tags: [Results]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
app.delete('/results/:id', deleteResult);

// ==================== ANALYSIS ROUTES (MAIN FEATURE) ====================
/**
 * @swagger
 * /analyze-article:
 *   post:
 *     summary: Analyze article bias with AI (SSE streaming + Database save)
 *     tags: [Analysis]
 *     description: |
 *       Real-time bias analysis using Claude AI with:
 *       - Server-Sent Events (SSE) streaming
 *       - Automatic database persistence
 *       - Smart caching (returns existing analysis if URL was analyzed before)
 *       
 *       Cost per NEW analysis: ~$0.07 USD
 *       Cached analysis: FREE! ♻️
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: "https://www.bbc.com/news"
 *               userId:
 *                 type: integer
 *                 description: Optional - defaults to system user
 *               skipCache:
 *                 type: boolean
 *                 description: Force new analysis even if URL exists
 */
app.post('/analyze-article', requireAuth, analyzeArticle);

// ==================== HISTORY & STATS ROUTES ====================
/**
 * @swagger
 * /history:
 *   get:
 *     summary: Get analysis history
 *     tags: [History]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of past analyses
 */
app.get('/history', requireAuth, getHistory);

/**
 * @swagger
 * /history/{id}:
 *   get:
 *     summary: Get single analysis by ID
 *     tags: [History]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
app.get('/history/:id', requireAuth, getAnalysisById);

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Get system statistics
 *     tags: [History]
 *     responses:
 *       200:
 *         description: Statistics about analyses
 */
app.get('/stats', requireAuth, getStats);

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`✅ Prism backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
  console.log(`🔍 Analysis endpoint: POST http://localhost:${PORT}/analyze-article`);
  console.log(`📜 History endpoint: GET http://localhost:${PORT}/history`);
  console.log(`📈 Stats endpoint: GET http://localhost:${PORT}/stats`);
  console.log('');
  console.log('✅ COMPLETE CRUD OPERATIONS AVAILABLE:');
  console.log('   Users: CREATE, READ, UPDATE, DELETE');
  console.log('   Articles: CREATE, READ, UPDATE, DELETE');
  console.log('   Results: CREATE, READ, UPDATE, DELETE');
});
