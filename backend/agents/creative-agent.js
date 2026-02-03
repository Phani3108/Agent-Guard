/**
 * Creative Enhancement Agent (CREATIVE)
 * Generates suggestions and content rewrites
 */

const complianceRules = require('../config/compliance-rules.json');

/**
 * Generate suggestions and rewrites
 */
async function generateSuggestions(
  content,
  metadata,
  targetAudience,
  schedule,
  platform,
  compliance,
  audienceFit,
  requestRewrites,
  rewriteCount,
  openai
) {
  const suggestions = {
    hashtags: [],
    posting_time: null,
    improvements: [],
    image_suggestions: null,
    content_rewrites: [],
  };

  try {
    // Build comprehensive prompt for AI
    const prompt = `You are a creative marketing expert and content strategist. Analyze this marketing content and provide comprehensive improvement suggestions.

Original Content: "${content.text}"
Platform: ${platform}
Target Audience: ${JSON.stringify(targetAudience)}
Has Image: ${content.image_url ? 'Yes' : 'No'}

Compliance Issues: ${compliance.violations.length > 0 ? JSON.stringify(compliance.violations) : 'None'}
Audience Fit Score: ${audienceFit.score}/10
Audience Concerns: ${audienceFit.concerns.length > 0 ? JSON.stringify(audienceFit.concerns) : 'None'}

${requestRewrites ? `Generate ${rewriteCount} improved versions of this content.` : ''}

Respond in JSON format:
{
  "hashtags": ["list of 5-8 relevant, trending hashtags for ${platform}"],
  "posting_time": {
    "optimal_time": "ISO timestamp or relative like 'Tuesday 9 AM EST'",
    "reason": "why this time is best"
  },
  "improvements": ["list of 5-7 specific actionable improvements"],
  "image_suggestions": {
    "required": boolean,
    "recommended": boolean,
    "type": "product_photo|infographic|behind_scenes|etc",
    "reason": "why this image type"
  }${requestRewrites ? `,
  "rewrites": [
    {
      "version": 1,
      "text": "improved version 1",
      "changes": ["list key changes made"],
      "focus": "what this version optimizes for"
    }
  ]` : ''}
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert marketing content strategist with deep knowledge of social media best practices and audience engagement.' 
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const aiSuggestions = JSON.parse(response.choices[0].message.content);
    
    // Process hashtags
    suggestions.hashtags = aiSuggestions.hashtags || generateDefaultHashtags(content.text, platform);
    
    // Process posting time
    suggestions.posting_time = aiSuggestions.posting_time || getDefaultPostingTime(platform, targetAudience?.region);
    
    // Process improvements
    suggestions.improvements = aiSuggestions.improvements || [];
    
    // Add compliance-specific improvements
    if (compliance.violations.length > 0) {
      for (const violation of compliance.violations) {
        suggestions.improvements.push(`Fix: ${violation.message}`);
      }
    }
    
    // Add audience fit improvements
    if (audienceFit.recommendations && audienceFit.recommendations.length > 0) {
      suggestions.improvements.push(...audienceFit.recommendations);
    }
    
    // Process image suggestions
    suggestions.image_suggestions = aiSuggestions.image_suggestions || {
      required: false,
      recommended: true,
      type: 'engaging_visual',
      reason: `Visual content performs better on ${platform}`,
    };
    
    // Process rewrites
    if (requestRewrites && aiSuggestions.rewrites) {
      suggestions.content_rewrites = aiSuggestions.rewrites.map((rewrite, idx) => ({
        version: idx + 1,
        text: rewrite.text,
        changes: rewrite.changes || [],
        focus: rewrite.focus || 'General improvement',
        score: calculateRewriteScore(rewrite.text, compliance, audienceFit, platform),
      }));
    }
    
  } catch (error) {
    console.error('Creative suggestions failed:', error.message);
    
    // Provide fallback suggestions
    suggestions.hashtags = generateDefaultHashtags(content.text, platform);
    suggestions.posting_time = getDefaultPostingTime(platform, targetAudience?.region);
    suggestions.improvements = [
      'Enable AI suggestions for detailed recommendations',
      'Review compliance violations',
      'Check audience fit analysis',
    ];
    suggestions.image_suggestions = {
      required: false,
      recommended: true,
      type: 'engaging_visual',
      reason: 'Visual content increases engagement',
    };
  }

  return suggestions;
}

/**
 * Generate default hashtags based on content
 */
function generateDefaultHashtags(text, platform) {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 5);
  
  const hashtags = words.slice(0, 5).map(w => `#${w.charAt(0).toUpperCase() + w.slice(1)}`);
  
  // Add platform-specific hashtags
  const platformTags = {
    'LinkedIn': ['#Business', '#Professional', '#Industry'],
    'Instagram': ['#InstaGood', '#PhotoOfTheDay', '#Trending'],
    'Twitter': ['#News', '#Update', '#Community'],
    'Facebook': ['#Social', '#Community', '#Connect'],
    'TikTok': ['#ForYou', '#Trending', '#Viral'],
  };
  
  hashtags.push(...(platformTags[platform] || []).slice(0, 3));
  
  return [...new Set(hashtags)].slice(0, 8);
}

/**
 * Get default posting time recommendation
 */
function getDefaultPostingTime(platform, region) {
  const timings = {
    'LinkedIn': { day: 'Tuesday-Thursday', time: '9-11 AM', engagement: 'Business hours, professionals checking feed' },
    'Instagram': { day: 'Wednesday-Friday', time: '11 AM - 1 PM', engagement: 'Lunch break browsing' },
    'Twitter': { day: 'Monday-Friday', time: '9 AM - 3 PM', engagement: 'Active news consumption hours' },
    'Facebook': { day: 'Wednesday-Friday', time: '1-3 PM', engagement: 'Afternoon social browsing' },
    'TikTok': { day: 'Tuesday-Thursday', time: '7-9 PM', engagement: 'Evening entertainment time' },
  };
  
  const timing = timings[platform] || timings['LinkedIn'];
  
  return {
    optimal: `${timing.day}, ${timing.time} ${region || 'Local Time'}`,
    reason: timing.engagement,
  };
}

/**
 * Calculate score for rewritten content
 */
function calculateRewriteScore(text, compliance, audienceFit, platform) {
  let score = 8.0;
  
  // Check length appropriateness
  const rules = complianceRules.platforms[platform] || complianceRules.default;
  if (rules.character_limit && text.length > rules.character_limit) {
    score -= 2;
  }
  
  // Bonus for good structure
  const hasHashtags = /#\w+/.test(text);
  const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(text);
  const hasQuestion = /\?/.test(text);
  const hasCallToAction = /\b(click|learn|sign up|register|download|buy|get started|contact|visit|join)\b/i.test(text);
  
  if (hasHashtags) score += 0.3;
  if (hasEmoji && platform !== 'LinkedIn') score += 0.2;
  if (hasQuestion) score += 0.3;
  if (hasCallToAction) score += 0.4;
  
  // Incorporate audience fit
  score = (score * 0.7) + (audienceFit.score * 0.03);
  
  return Math.min(10, parseFloat(score.toFixed(1)));
}

module.exports = {
  generateSuggestions,
};
