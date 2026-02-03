require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { detectPII, redactPII } = require('./agents/pii-detector');
const { checkCompliance } = require('./agents/compliance-agent');
const { analyzeAudienceFit } = require('./agents/audience-agent');
const { generateSuggestions } = require('./agents/creative-agent');
const { generateContentImage } = require('./agents/image-generator');
const { getAIClient } = require('./config/ai-config');
const complianceRules = require('./config/compliance-rules.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize AI Client (supports both OpenAI and Azure OpenAI)
const openai = getAIClient();

// Middleware to log requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    body: req.method === 'POST' ? req.body : undefined,
    query: req.query,
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get supported platforms
app.get('/api/platforms', (req, res) => {
  const platforms = Object.keys(complianceRules.platforms).map(name => ({
    name,
    rules: complianceRules.platforms[name],
  }));
  res.json({ platforms });
});

// Main review endpoint
app.post('/api/review', async (req, res) => {
  const startTime = Date.now();
  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Validate input
    const { campaign_name, content, metadata, target_audience, schedule, options } = req.body;
    
    if (!content || !content.text) {
      return res.status(400).json({ 
        status: 'error', 
        error: 'Content text is required' 
      });
    }

    const platform = metadata?.platform || 'LinkedIn';
    const requestRewrites = options?.request_rewrites !== false;
    const rewriteCount = options?.rewrite_count || 3;
    const strictMode = options?.strict_mode || false;

    logger.info(`Starting review ${reviewId}`, { campaign_name, platform });

    // AGENT 1: PII Detection (AEGIS)
    logger.info('Running PII Detection Agent (AEGIS)');
    const piiDetection = detectPII(content.text);
    const redactedContent = redactPII(content.text, piiDetection.items);

    // AGENT 2: Compliance Check (SENTINEL)
    logger.info('Running Compliance Agent (SENTINEL)');
    const compliance = await checkCompliance(
      content,
      platform,
      target_audience,
      piiDetection,
      openai
    );

    // AGENT 3: Audience Fit Analysis (PULSE)
    logger.info('Running Audience Fit Agent (PULSE)');
    const audienceFit = await analyzeAudienceFit(
      content,
      target_audience,
      platform,
      openai
    );

    // AGENT 4: Content Enhancement Suggestions (CREATIVE)
    logger.info('Running Creative Enhancement Agent');
    const suggestions = await generateSuggestions(
      content,
      metadata,
      target_audience,
      schedule,
      platform,
      compliance,
      audienceFit,
      requestRewrites,
      rewriteCount,
      openai
    );

    // AGENT 5: Image Generation (VISUAL)
    logger.info('Running Image Generator Agent (VISUAL)');
    let suggestedImage;
    try {
      suggestedImage = await generateContentImage(
        content.text,
        platform,
        openai
      );
      logger.info('Image generation completed', { success: suggestedImage.success });
    } catch (error) {
      logger.error('Image generation failed', { error: error.message });
      suggestedImage = {
        success: false,
        error: 'Image generation service failed',
        details: error.message
      };
    }

    // Calculate overall score
    const overallScore = calculateOverallScore(
      piiDetection,
      compliance,
      audienceFit
    );

    // Determine recommendation
    const recommendation = determineRecommendation(
      overallScore,
      piiDetection,
      compliance,
      strictMode
    );

    // Build response
    const response = {
      review_id: reviewId,
      timestamp: new Date().toISOString(),
      status: 'completed',
      overall_score: overallScore,
      recommendation,
      pii_detection: {
        detected: piiDetection.detected,
        items: piiDetection.items,
        redacted_content: redactedContent,
      },
      compliance,
      audience_fit: audienceFit,
      suggestions,
      suggested_image: suggestedImage,
      audit: {
        campaign_name: campaign_name || 'Unnamed Campaign',
        reviewed_by: 'AgentGuard v1.0',
        processing_time_ms: Date.now() - startTime,
      },
    };

    // Log audit trail (without storing PII values)
    const auditLog = {
      ...response,
      pii_detection: {
        detected: piiDetection.detected,
        item_count: piiDetection.items.length,
        types: piiDetection.items.map(i => i.type),
        // Don't store actual PII values
      },
    };
    
    const auditLogPath = path.join(__dirname, 'logs', 'audit.log');
    fs.appendFileSync(auditLogPath, JSON.stringify(auditLog) + '\n');

    logger.info(`Review ${reviewId} completed`, { 
      score: overallScore, 
      recommendation,
      processing_time: Date.now() - startTime 
    });

    res.json(response);

  } catch (error) {
    logger.error('Review failed', { 
      reviewId, 
      error: error.message, 
      stack: error.stack 
    });
    
    res.status(500).json({
      status: 'error',
      error: error.message,
      review_id: reviewId,
    });
  }
});

// Validate input schema
app.post('/api/validate-schema', (req, res) => {
  const errors = [];
  const { content, metadata } = req.body;

  if (!content) errors.push('content is required');
  if (content && !content.text) errors.push('content.text is required');
  if (metadata && metadata.platform) {
    const supportedPlatforms = Object.keys(complianceRules.platforms);
    if (!supportedPlatforms.includes(metadata.platform)) {
      errors.push(`platform must be one of: ${supportedPlatforms.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ valid: false, errors });
  }

  res.json({ valid: true, message: 'Schema is valid' });
});

// Get audit log by review ID
app.get('/api/audit/:review_id', (req, res) => {
  const { review_id } = req.params;
  const auditLogPath = path.join(__dirname, 'logs', 'audit.log');
  
  if (!fs.existsSync(auditLogPath)) {
    return res.status(404).json({ error: 'No audit logs found' });
  }

  const logs = fs.readFileSync(auditLogPath, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
    .filter(log => log.review_id === review_id);

  if (logs.length === 0) {
    return res.status(404).json({ error: 'Review not found' });
  }

  res.json(logs[0]);
});

// Helper functions
function calculateOverallScore(piiDetection, compliance, audienceFit) {
  let score = 10.0;

  // Deduct for PII
  if (piiDetection.detected) {
    const highSeverityPII = piiDetection.items.filter(i => i.severity === 'high').length;
    score -= highSeverityPII * 1.5;
    score -= (piiDetection.items.length - highSeverityPII) * 0.5;
  }

  // Compliance score impact
  score = score * (compliance.score / 10);

  // Audience fit impact
  score = (score * 0.7) + (audienceFit.score * 0.3);

  return Math.max(0, Math.min(10, parseFloat(score.toFixed(1))));
}

function determineRecommendation(overallScore, piiDetection, compliance, strictMode) {
  if (strictMode) {
    if (piiDetection.detected || compliance.violations.length > 0) {
      return 'reject';
    }
  }

  if (overallScore >= 8.5) return 'approve';
  if (overallScore >= 6.0) return 'approve_with_changes';
  if (overallScore >= 4.0) return 'review_required';
  return 'reject';
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ status: 'error', error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`AgentGuard backend running on port ${PORT}`);
  console.log(`🚀 AgentGuard backend running on http://localhost:${PORT}`);
  console.log(`📊 API Documentation: See ARCHITECTURE.md`);
});

module.exports = app;
