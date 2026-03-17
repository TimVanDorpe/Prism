/**
 * Bias Analyzer Service
 * Analyzes article bias using Claude AI with real-time streaming
 * NOW WITH DATABASE PERSISTENCE! 💾
 */

const Anthropic = require('@anthropic-ai/sdk');
const cheerio = require('cheerio');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { getUserOrDefault } = require('../utils/userUtils');

const prisma = new PrismaClient();

// Initialize Claude API client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Extract article text from URL with detailed logging
 * @param {string} url - Article URL to scrape
 * @returns {Promise<string>} Cleaned article text
 */
async function extractArticleText(url) {
  console.log(`[SCRAPER] Starting extraction for: ${url}`);
  
  try {
    // Fetch HTML from URL
    console.log('[SCRAPER] Fetching HTML...');
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    console.log(`[SCRAPER] ✅ HTML fetched - Status: ${response.status}, Size: ${response.data.length} bytes`);
    
    // Load HTML into Cheerio (jQuery-like syntax for Node.js)
    const $ = cheerio.load(response.data);
    console.log('[SCRAPER] HTML loaded into Cheerio');
    
    // Remove unwanted elements (ads, scripts, navigation, etc.)
    const removedElements = $('script, style, nav, header, footer, aside, .ad, .advertisement');
    console.log(`[SCRAPER] Removed ${removedElements.length} unwanted elements`);
    removedElements.remove();
    
    // Try to find article content using common selectors
    let content = '';
    const articleSelectors = ['article', 'main', '.article-content', '.post-content', '.entry-content'];
    
    for (const selector of articleSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim().length > 100) {
        content = element.text();
        console.log(`[SCRAPER] ✅ Found content using selector: "${selector}" (${content.length} chars)`);
        break;
      } else if (element.length) {
        console.log(`[SCRAPER] ⚠️ Selector "${selector}" found but too short (${element.text().trim().length} chars)`);
      }
    }
    
    // Fallback to body if no article container found
    if (!content) {
      content = $('body').text();
      console.log(`[SCRAPER] ⚠️ Using fallback: <body> tag (${content.length} chars)`);
    }
    
    // Clean up whitespace
    const originalLength = content.length;
    content = content.replace(/\s+/g, ' ').trim();
    console.log(`[SCRAPER] Cleaned whitespace: ${originalLength} → ${content.length} chars`);
    
    // Limit length (Claude token limits + cost optimization)
    // 50k chars ≈ 12.5k tokens ≈ $0.0375 input cost (Claude Sonnet 4: $3/1M tokens)
    if (content.length > 50000) {
      content = content.substring(0, 50000) + '...';
      console.log(`[SCRAPER] ⚠️ Content truncated to 50,000 chars`);
    }
    
    console.log(`[SCRAPER] ✅ Extraction complete - Final size: ${content.length} chars`);
    console.log(`[SCRAPER] Preview: "${content.substring(0, 100)}..."`);
    
    return content;
  } catch (error) {
    // Enhanced error logging
    console.error('[SCRAPER] ❌ ============ ERROR CAUGHT ============');
    console.error('[SCRAPER] Error Type:', error.constructor.name);
    console.error('[SCRAPER] Error Message:', error.message);
    console.error('[SCRAPER] Stack Trace:');
    console.error(error.stack);
    console.error('[SCRAPER] ======================================');
    
    if (error.code === 'ENOTFOUND') {
      console.error('[SCRAPER] 💡 TIP: DNS lookup failed - check if URL is valid');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('[SCRAPER] 💡 TIP: Request timed out - server too slow or unreachable');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('[SCRAPER] 💡 TIP: Connection refused - server actively rejected connection');
    }
    
    throw new Error(`Failed to extract article: ${error.message}`);
  }
}

/**
 * Clean Claude's response by removing markdown code blocks
 * @param {string} text - Raw response from Claude
 * @returns {string} Clean JSON string
 */
function cleanClaudeResponse(text) {
  // Remove ```json and ``` markers
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  return cleaned.trim();
}

/**
 * Check if URL was already analyzed recently
 * @param {string} url - Article URL
 * @returns {Promise<object|null>} Existing article with result, or null
 */
async function checkExistingAnalysis(url) {
  try {
    const existingArticle = await prisma.article.findFirst({
      where: { url },
      include: { result: true },
      orderBy: { id: 'desc' }
    });
    
    if (existingArticle && existingArticle.result) {
      console.log(`[DB] ✅ Found existing analysis for URL (Article ID: ${existingArticle.id})`);
      return existingArticle;
    }
    
    return null;
  } catch (error) {
    console.error('[DB] ⚠️ Error checking existing analysis:', error.message);
    return null;
  }
}

/**
 * Save article and analysis result to database
 * @param {string} url - Article URL
 * @param {string} content - Article content
 * @param {object} analysisResult - Bias analysis result
 * @param {number} userId - User ID
 * @returns {Promise<object>} Saved article with result
 */
async function saveAnalysisToDatabase(url, content, analysisResult, userId) {
  console.log('[DB] Saving analysis to database...');
  
  try {
    // Create article with result in a transaction
    const article = await prisma.article.create({
      data: {
        url,
        content,
        userId,
        result: {
          create: {
            biasScore: analysisResult.biasScore,
            biasedLeaning: analysisResult.biasedLeaning,
            summary: analysisResult.summary
          }
        }
      },
      include: {
        result: true,
        user: true
      }
    });
    
    console.log(`[DB] ✅ Saved Article ID: ${article.id}, Result ID: ${article.result.id}`);
    console.log(`[DB] Bias Score: ${article.result.biasScore}, Leaning: ${article.result.biasedLeaning}`);
    
    return article;
  } catch (error) {
    console.error('[DB] ❌ Failed to save to database:', error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * Analyze article bias with Claude AI
 * Streams response via Server-Sent Events (SSE)
 * NOW SAVES TO DATABASE! 💾
 * 
 * Cost per analysis:
 * - Input: ~12.5k tokens @ $3/1M = $0.0375
 * - Output: ~2k tokens @ $15/1M = $0.03
 * - Total: ~$0.07 per article
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object (will be used for SSE streaming)
 */
async function analyzeArticleBias(req, res) {
  try {
    const { url, userId, skipCache } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log(`[ANALYZER] Starting analysis for: ${url}`);
    console.log(`[ANALYZER] User ID: ${userId || 'default'}, Skip Cache: ${skipCache || false}`);
    
    // Get or create user
    const user = await getUserOrDefault(userId);
    console.log(`[ANALYZER] Using User ID: ${user.id} (${user.email})`);
    
    // Setup Server-Sent Events (SSE) streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Check for existing analysis (unless skipCache is true)
    if (!skipCache) {
      const existing = await checkExistingAnalysis(url);
      if (existing) {
        console.log('[ANALYZER] ♻️ Returning cached analysis');
        res.write(`data: ${JSON.stringify({ 
          type: 'status', 
          message: 'Found cached analysis!' 
        })}\n\n`);
        
        res.write(`data: ${JSON.stringify({ 
          type: 'complete', 
          result: {
            biasScore: existing.result.biasScore,
            biasedLeaning: existing.result.biasedLeaning,
            summary: existing.result.summary,
            emotionalLanguage: [],
            cherryPickedFacts: [],
            loadedWords: []
          },
          articleId: existing.id,
          cached: true
        })}\n\n`);
        
        return res.end();
      }
    }
    
    // Send status update to frontend
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Extracting article...' })}\n\n`);
    
    // Extract article content from URL
    const articleContent = await extractArticleText(url);
    
    if (!articleContent || articleContent.length < 100) {
      console.error('[ANALYZER] ❌ Insufficient content extracted');
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Could not extract meaningful content from URL' })}\n\n`);
      return res.end();
    }
    
    console.log(`[ANALYZER] ✅ Article extracted - ${articleContent.length} chars`);
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Analyzing bias with Claude AI...' })}\n\n`);
    
    // Build prompt for Claude
    const prompt = `You are a media bias analyzer. Analyze the following article for political bias, emotional language, and cherry-picked facts.

Article content:
${articleContent}

IMPORTANT: Respond with ONLY the JSON object below. Do NOT wrap it in markdown code blocks or any other formatting. Just pure JSON.

{
  "biasScore": <number 0-100, where 0 is completely neutral and 100 is extremely biased>,
  "biasedLeaning": <"left" | "right" | "neutral">,
  "summary": "<brief summary of bias indicators>",
  "emotionalLanguage": ["<example 1>", "<example 2>"],
  "cherryPickedFacts": ["<example 1>", "<example 2>"],
  "loadedWords": ["<word 1>", "<word 2>"]
}

Be objective and cite specific examples from the text.`;
    
    // Stream Claude's response
    console.log('[ANALYZER] Starting Claude stream...');
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    let fullResponse = '';
    
    // Event: New text chunk from Claude
    stream.on('text', (text) => {
      fullResponse += text;
      // Send chunk to frontend in real-time
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
    });
    
    // Event: Claude finished responding
    stream.on('end', async () => {
      console.log('[ANALYZER] Claude stream complete');
      console.log(`[ANALYZER] Raw response length: ${fullResponse.length} chars`);
      
      try {
        // Clean and parse the response
        const cleanedResponse = cleanClaudeResponse(fullResponse);
        const analysisResult = JSON.parse(cleanedResponse);
        console.log('[ANALYZER] ✅ JSON parsed successfully');
        console.log(`[ANALYZER] Bias Score: ${analysisResult.biasScore}, Leaning: ${analysisResult.biasedLeaning}`);
        
        // 💾 SAVE TO DATABASE
        try {
          const savedArticle = await saveAnalysisToDatabase(
            url,
            articleContent,
            analysisResult,
            user.id
          );
          
          // Send final result with database ID
          res.write(`data: ${JSON.stringify({ 
            type: 'complete', 
            result: analysisResult,
            articleId: savedArticle.id,
            resultId: savedArticle.result.id,
            saved: true
          })}\n\n`);
        } catch (dbError) {
          console.error('[DB] ⚠️ Failed to save, but analysis succeeded');
          // Still send result even if save failed
          res.write(`data: ${JSON.stringify({ 
            type: 'complete', 
            result: analysisResult,
            saved: false,
            saveError: dbError.message
          })}\n\n`);
        }
        
        res.end();
      } catch (error) {
        console.error('[ANALYZER] ❌ JSON Parse Error:', error.message);
        console.error(error.stack);
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: `Failed to parse analysis result: ${error.message}` 
        })}\n\n`);
        res.end();
      }
    });
    
    // Event: Error occurred
    stream.on('error', (error) => {
      console.error('[ANALYZER] ❌ Claude API error:', error.message);
      console.error(error.stack);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    });
    
  } catch (error) {
    console.error('[ANALYZER] ❌ Analysis error:', error.message);
    console.error(error.stack);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
}

module.exports = {
  analyzeArticleBias,
  extractArticleText,
  checkExistingAnalysis
};
