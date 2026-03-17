/**
 * Analysed Result Controller
 * Handles all bias analysis result CRUD operations
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * CREATE AnalysedResult
 * POST /articles/:id/results
 */
async function createResult(req, res) {
  try {
    const { biasScore, biasedLeaning, summary } = req.body;
    
    if (biasScore === undefined || !biasedLeaning || !summary) {
      return res.status(400).json({ error: 'biasScore, biasedLeaning, summary required' });
    }
    
    const result = await prisma.analysedResult.create({
      data: {
        biasScore: parseInt(biasScore),
        biasedLeaning,
        summary,
        articleId: parseInt(req.params.id)
      },
      include: { article: true }
    });
    
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * READ Result by Article ID
 * GET /articles/:id/results
 */
async function getResultByArticleId(req, res) {
  try {
    const result = await prisma.analysedResult.findUnique({
      where: { articleId: parseInt(req.params.id) },
      include: { article: true }
    });
    
    if (!result) {
      return res.status(404).json({ error: 'No result for this article' });
    }
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * UPDATE Result
 * PUT /results/:id
 */
async function updateResult(req, res) {
  try {
    const { biasScore, biasedLeaning, summary } = req.body;
    
    const result = await prisma.analysedResult.update({
      where: { id: parseInt(req.params.id) },
      data: { 
        biasScore: parseInt(biasScore), 
        biasedLeaning, 
        summary 
      },
      include: { article: true }
    });
    
    res.json(result);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.status(400).json({ error: error.message });
  }
}

/**
 * DELETE Result
 * DELETE /results/:id
 */
async function deleteResult(req, res) {
  try {
    const result = await prisma.analysedResult.delete({
      where: { id: parseInt(req.params.id) }
    });
    
    res.json({ 
      message: 'Analysis result deleted', 
      result 
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  createResult,
  getResultByArticleId,
  updateResult,
  deleteResult
};
