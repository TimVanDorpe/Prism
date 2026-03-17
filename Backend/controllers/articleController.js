/**
 * Article Controller
 * Handles all article-related CRUD operations
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * CREATE Article
 * POST /articles
 */
async function createArticle(req, res) {
  try {
    const { url, content, userId } = req.body;
    
    if (!url || !content || !userId) {
      return res.status(400).json({ error: 'url, content, userId required' });
    }
    
    const article = await prisma.article.create({
      data: {
        url,
        content,
        userId: parseInt(userId)
      },
      include: { user: true }
    });
    
    res.status(201).json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * READ all Articles
 * GET /articles
 */
async function getAllArticles(req, res) {
  try {
    const articles = await prisma.article.findMany({
      include: { user: true, result: true }
    });
    res.json(articles);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * READ Article by ID
 * GET /articles/:id
 */
async function getArticleById(req, res) {
  try {
    const article = await prisma.article.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: true, result: true }
    });
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    res.json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * UPDATE Article
 * PUT /articles/:id
 */
async function updateArticle(req, res) {
  try {
    const { url, content } = req.body;
    
    const article = await prisma.article.update({
      where: { id: parseInt(req.params.id) },
      data: { url, content },
      include: { user: true, result: true }
    });
    
    res.json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * DELETE Article
 * DELETE /articles/:id
 */
async function deleteArticle(req, res) {
  try {
    const article = await prisma.article.delete({
      where: { id: parseInt(req.params.id) }
    });
    
    res.json({ message: 'Article deleted', article });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  createArticle,
  getAllArticles,
  getArticleById,
  updateArticle,
  deleteArticle
};
