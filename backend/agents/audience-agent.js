/**
 * Audience Fit Agent (PULSE)
 * Analyzes if content matches target demographic
 */

const { getChatModel } = require('../config/ai-config');

/**
 * Analyze audience fit
 * @param {Object} content - Content to analyze
 * @param {Object} targetAudience - Target audience details
 * @param {string} platform - Platform name
 * @param {Object} openai - OpenAI client
 * @returns {Object} Audience fit analysis
 */
async function analyzeAudienceFit(content, targetAudience, platform, openai) {
  try {
    const prompt = `You are an audience targeting and demographic expert. Analyze if this marketing content is appropriate and engaging for the target audience.

Content: "${content.text}"
${content.image_url ? `Image URL: ${content.image_url}` : ''}

Target Audience:
- Age Group: ${targetAudience?.age_group || 'Not specified'}
- Region: ${targetAudience?.region || 'Not specified'}
- Interests: ${targetAudience?.interests ? JSON.stringify(targetAudience.interests) : 'Not specified'}
- Industry: ${targetAudience?.industry || 'Not specified'}

Platform: ${platform}

Analyze the following and respond in JSON format:
{
  "score": 0-10 (how well content matches audience),
  "tone": "professional|casual|enthusiastic|formal|etc",
  "language_complexity": "simple|moderate|advanced",
  "cultural_sensitivity": "pass|concern",
  "engagement_prediction": "low|medium|high|very_high",
  "concerns": ["list any mismatches or concerns"],
  "strengths": ["list what works well for this audience"],
  "recommendations": ["specific suggestions to improve audience fit"]
}`;

    const response = await openai.chat.completions.create({
      model: getChatModel(openai),  // Uses Azure deployment or OpenAI model
      messages: [
        { role: 'system', content: 'You are an expert in audience targeting and content personalization.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    
    return {
      score: parseFloat(analysis.score) || 5.0,
      analysis: {
        tone: analysis.tone || 'unknown',
        language_complexity: analysis.language_complexity || 'moderate',
        cultural_sensitivity: analysis.cultural_sensitivity || 'pass',
        engagement_prediction: analysis.engagement_prediction || 'medium',
      },
      concerns: analysis.concerns || [],
      strengths: analysis.strengths || [],
      recommendations: analysis.recommendations || [],
    };
  } catch (error) {
    console.error('Audience fit analysis failed:', error.message);
    
    // Return basic analysis if AI fails
    return {
      score: 5.0,
      analysis: {
        tone: 'unknown',
        language_complexity: 'moderate',
        cultural_sensitivity: 'unknown',
        engagement_prediction: 'medium',
      },
      concerns: ['AI analysis unavailable'],
      strengths: [],
      recommendations: ['Enable AI analysis for detailed insights'],
    };
  }
}

module.exports = {
  analyzeAudienceFit,
};
