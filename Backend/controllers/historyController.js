/**
 * History Controller
 * Retrieve past analyses and statistics
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get analysis history
 * GET /history?limit=10&userId=1
 */
async function getHistory(req, res) {
  try {
    const { limit = 20, userId } = req.query;
    
    const where = userId ? { userId: parseInt(userId) } : {};
    
    const articles = await prisma.article.findMany({
      where,
      include: {
        result: true,
        user: {
          select: { id: true, email: true }
        }
      },
      orderBy: { id: 'desc' },
      take: parseInt(limit)
    });
    
    console.log(`[HISTORY] Retrieved ${articles.length} analyses`);
    
    res.json({
      total: articles.length,
      articles: articles.map(a => ({
        id: a.id,
        url: a.url,
        user: a.user,
        result: a.result ? {
          biasScore: a.result.biasScore,
          biasedLeaning: a.result.biasedLeaning,
          summary: a.result.summary
        } : null,
        analyzed: !!a.result
      }))
    });
  } catch (error) {
    console.error('[HISTORY] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get single analysis by ID
 * GET /history/:id
 */
async function getAnalysisById(req, res) {
  try {
    const { id } = req.params;
    
    const article = await prisma.article.findUnique({
      where: { id: parseInt(id) },
      include: {
        result: true,
        user: {
          select: { id: true, email: true }
        }
      }
    });
    
    if (!article) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    console.log(`[HISTORY] Retrieved analysis ID ${id}`);
    
    res.json({
      id: article.id,
      url: article.url,
      content: article.content,
      user: article.user,
      result: article.result
    });
  } catch (error) {
    console.error('[HISTORY] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get statistics
 * GET /stats
 */
async function getStats(req, res) {
  try {
    const totalArticles = await prisma.article.count();
    const totalResults = await prisma.analysedResult.count();
    const totalUsers = await prisma.user.count();
    
    // Average bias score
    const results = await prisma.analysedResult.findMany({
      select: { biasScore: true, biasedLeaning: true }
    });
    
    const avgBiasScore = results.length > 0
      ? results.reduce((sum, r) => sum + r.biasScore, 0) / results.length
      : 0;
    
    // Count by leaning
    const leaningCounts = results.reduce((acc, r) => {
      acc[r.biasedLeaning] = (acc[r.biasedLeaning] || 0) + 1;
      return acc;
    }, {});
    
    console.log('[STATS] Generated statistics');
    
    res.json({
      totalArticles,
      totalAnalyses: totalResults,
      totalUsers,
      avgBiasScore: Math.round(avgBiasScore * 10) / 10,
      byLeaning: leaningCounts
    });
  } catch (error) {
    console.error('[STATS] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getHistory,
  getAnalysisById,
  getStats
};
