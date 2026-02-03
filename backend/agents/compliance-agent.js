/**
 * Compliance Agent (SENTINEL)
 * Checks content against platform rules and regulatory requirements
 */

const complianceRules = require('../config/compliance-rules.json');

/**
 * Check content compliance
 * @param {Object} content - Content to check
 * @param {string} platform - Target platform
 * @param {Object} targetAudience - Audience details
 * @param {Object} piiDetection - PII detection results
 * @param {Object} openai - OpenAI client
 * @returns {Object} Compliance check results
 */
async function checkCompliance(content, platform, targetAudience, piiDetection, openai) {
  const violations = [];
  const warnings = [];
  const passedChecks = [];
  
  // Get platform-specific rules
  const rules = complianceRules.platforms[platform] || complianceRules.default;
  
  // Check 1: Character limit
  if (rules.character_limit && content.text.length > rules.character_limit) {
    violations.push({
      rule: 'character_limit',
      severity: 'high',
      message: `Content exceeds ${rules.character_limit} character limit (${content.text.length} chars)`,
    });
  } else {
    passedChecks.push('character_limit');
  }
  
  // Check 2: Prohibited words
  const textLower = content.text.toLowerCase();
  for (const word of rules.prohibited_words || []) {
    if (textLower.includes(word.toLowerCase())) {
      violations.push({
        rule: 'prohibited_words',
        severity: 'high',
        message: `Prohibited word detected: "${word}"`,
      });
    }
  }
  if (violations.filter(v => v.rule === 'prohibited_words').length === 0) {
    passedChecks.push('prohibited_words');
  }
  
  // Check 3: Required image
  if (rules.image_required && !content.image_url) {
    violations.push({
      rule: 'image_required',
      severity: 'medium',
      message: `${platform} requires an image for this content type`,
    });
  } else if (rules.image_required) {
    passedChecks.push('image_required');
  }
  
  // Check 4: PII in content (warning)
  if (piiDetection.detected) {
    const highSeverityPII = piiDetection.items.filter(i => i.severity === 'high');
    if (highSeverityPII.length > 0) {
      violations.push({
        rule: 'no_pii',
        severity: 'high',
        message: `Sensitive PII detected: ${highSeverityPII.map(i => i.type).join(', ')}`,
      });
    } else {
      warnings.push({
        rule: 'pii_warning',
        severity: 'low',
        message: 'Low-severity PII detected, review recommended',
      });
    }
  } else {
    passedChecks.push('no_pii');
  }
  
  // Check 5: Call to action
  const hasCallToAction = content.call_to_action || 
    /\b(click|learn more|sign up|register|download|buy now|get started|contact us|visit|join)\b/i.test(content.text);
  
  if (!hasCallToAction && rules.cta_recommended) {
    warnings.push({
      rule: 'call_to_action',
      severity: 'low',
      message: 'No clear call-to-action detected',
    });
  } else if (hasCallToAction) {
    passedChecks.push('call_to_action');
  }
  
  // Check 6: Hashtag usage
  const hashtagCount = (content.text.match(/#\w+/g) || []).length;
  if (rules.hashtag_limits) {
    if (hashtagCount > rules.hashtag_limits.max) {
      violations.push({
        rule: 'hashtag_limit',
        severity: 'medium',
        message: `Too many hashtags: ${hashtagCount} (max: ${rules.hashtag_limits.max})`,
      });
    } else if (hashtagCount < rules.hashtag_limits.min) {
      warnings.push({
        rule: 'hashtag_minimum',
        severity: 'low',
        message: `Consider adding hashtags (current: ${hashtagCount}, recommended: ${rules.hashtag_limits.min}-${rules.hashtag_limits.max})`,
      });
    } else {
      passedChecks.push('hashtag_usage');
    }
  }
  
  // Check 7: AI-powered compliance check
  let aiCompliance = null;
  try {
    const prompt = `You are a compliance expert. Analyze this marketing content for ${platform} targeting ${JSON.stringify(targetAudience)}.

Content: "${content.text}"

Check for:
1. Misleading claims or false advertising
2. Cultural insensitivity
3. Age-inappropriate content
4. Regulatory compliance (GDPR, CCPA mentions if collecting data)
5. Brand safety concerns

Respond in JSON format:
{
  "issues": [{"type": "issue_type", "severity": "high|medium|low", "description": "..."}],
  "overall_assessment": "brief assessment"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a compliance and brand safety expert.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    aiCompliance = JSON.parse(response.choices[0].message.content);
    
    // Add AI-detected issues to violations/warnings
    if (aiCompliance.issues && aiCompliance.issues.length > 0) {
      for (const issue of aiCompliance.issues) {
        if (issue.severity === 'high') {
          violations.push({
            rule: 'ai_compliance',
            severity: issue.severity,
            message: issue.description,
          });
        } else {
          warnings.push({
            rule: 'ai_compliance',
            severity: issue.severity,
            message: issue.description,
          });
        }
      }
    } else {
      passedChecks.push('ai_compliance_check');
    }
  } catch (error) {
    console.error('AI compliance check failed:', error.message);
  }
  
  // Calculate compliance score
  const totalChecks = passedChecks.length + violations.length + warnings.length;
  const score = totalChecks > 0 
    ? ((passedChecks.length + (warnings.length * 0.5)) / totalChecks) * 10 
    : 5.0;
  
  return {
    status: violations.length > 0 ? 'fail' : (warnings.length > 0 ? 'warning' : 'pass'),
    score: parseFloat(score.toFixed(1)),
    violations,
    warnings,
    passed_checks: passedChecks,
    ai_assessment: aiCompliance?.overall_assessment || null,
  };
}

module.exports = {
  checkCompliance,
};
