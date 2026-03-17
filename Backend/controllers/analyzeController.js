/**
 * Analyze Controller
 * Handles real-time article bias analysis with SSE streaming
 */

const { analyzeArticleBias } = require('../services/biasAnalyzer');

/**
 * Analyze Article Bias (with SSE streaming)
 * POST /analyze-article
 * 
 * Expected body: { url: "https://example.com/article" }
 * 
 * Returns: Server-Sent Events stream with analysis progress
 * Cost per analysis: ~$0.07 (50k chars ≈ 12.5k tokens input @ $3/1M + 2k tokens output @ $15/1M)
 */
async function analyzeArticle(req, res) {
  return analyzeArticleBias(req, res);
}

module.exports = {
  analyzeArticle
};
