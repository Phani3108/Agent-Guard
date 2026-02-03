/**
 * PII Detection Agent (AEGIS)
 * Detects personally identifiable information in content
 */

const PII_PATTERNS = {
  email: {
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    severity: 'high',
    description: 'Email address detected',
  },
  phone: {
    // Enhanced to detect various formats:
    // - US: (555) 123-4567, 555-123-4567, 555.123.4567, 5551234567
    // - International: +1-555-123-4567, +91 98765 43210, +44 20 7946 0958
    // - Mobile: 9876543210 (10 digits), +919876543210
    regex: /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?){1,3}\d{3,4}[-.\s]?\d{3,4}\b/g,
    severity: 'high',
    description: 'Phone/Mobile number detected',
  },
  mobile: {
    // Additional pattern for common mobile formats (10 digits without separators)
    regex: /\b[6-9]\d{9}\b/g,
    severity: 'high',
    description: 'Indian mobile number detected',
  },
  ssn: {
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    severity: 'high',
    description: 'Social Security Number detected',
  },
  credit_card: {
    regex: /\b(?:\d[ -]*?){13,16}\b/g,
    severity: 'high',
    description: 'Potential credit card number detected',
  },
  ip_address: {
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    severity: 'medium',
    description: 'IP address detected',
  },
  postal_code: {
    regex: /\b\d{5}(-\d{4})?\b/g,
    severity: 'low',
    description: 'Postal code detected',
  },
  address: {
    regex: /\b\d+\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way)\b/gi,
    severity: 'medium',
    description: 'Street address detected',
  },
};

/**
 * Detect PII in text content
 * @param {string} text - Content to scan
 * @returns {Object} Detection results
 */
function detectPII(text) {
  const items = [];
  
  for (const [type, config] of Object.entries(PII_PATTERNS)) {
    const matches = text.matchAll(config.regex);
    
    for (const match of matches) {
      items.push({
        type,
        value: match[0],
        position: match.index,
        severity: config.severity,
        description: config.description,
      });
    }
  }

  return {
    detected: items.length > 0,
    count: items.length,
    items,
  };
}

/**
 * Redact PII from text
 * @param {string} text - Original text
 * @param {Array} piiItems - Detected PII items
 * @returns {string} Redacted text
 */
function redactPII(text, piiItems) {
  let redacted = text;
  
  // Sort by position in reverse order to maintain correct indices
  const sorted = [...piiItems].sort((a, b) => b.position - a.position);
  
  for (const item of sorted) {
    const placeholder = `[${item.type.toUpperCase()}_REDACTED]`;
    redacted = 
      redacted.substring(0, item.position) + 
      placeholder + 
      redacted.substring(item.position + item.value.length);
  }
  
  return redacted;
}

module.exports = {
  detectPII,
  redactPII,
  PII_PATTERNS,
};
