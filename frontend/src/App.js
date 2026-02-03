import React, { useState } from 'react';
import './App.css';
import sampleInputs from './sample-inputs.json';

function App() {
  const [formData, setFormData] = useState({
    campaign_name: '',
    content: {
      text: '',
      image_url: '',
      video_url: '',
      call_to_action: ''
    },
    metadata: {
      platform: 'LinkedIn',
      content_type: 'post',
      campaign_id: ''
    },
    target_audience: {
      age_group: '',
      region: '',
      interests: [],
      industry: ''
    },
    schedule: {
      preferred_time: null,
      timezone: 'America/New_York'
    },
    options: {
      request_rewrites: true,
      rewrite_count: 3,
      strict_mode: false
    }
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('LinkedIn');
  const [expandedSection, setExpandedSection] = useState(null);

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleInterestsChange = (value) => {
    const interests = value.split(',').map(i => i.trim()).filter(i => i);
    setFormData(prev => ({
      ...prev,
      target_audience: {
        ...prev.target_audience,
        interests
      }
    }));
  };

  const loadSample = (sampleKey) => {
    const sample = sampleInputs[sampleKey];
    if (sample) {
      setFormData(sample);
      setResult(null);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('http://localhost:5000/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        setSelectedPlatform(formData.metadata.platform);
      } else {
        setError(data.error || 'Review failed');
      }
    } catch (err) {
      setError('Failed to connect to backend. Make sure the server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8.5) return '#22c55e';
    if (score >= 6.0) return '#f59e0b';
    if (score >= 4.0) return '#ef4444';
    return '#dc2626';
  };

  const getRecommendationBadge = (recommendation) => {
    const badges = {
      'approve': { text: '✓ Approved', color: '#22c55e' },
      'approve_with_changes': { text: '⚠ Approve with Changes', color: '#f59e0b' },
      'review_required': { text: '⚡ Review Required', color: '#ef4444' },
      'reject': { text: '✗ Rejected', color: '#dc2626' }
    };
    return badges[recommendation] || badges['review_required'];
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Get the best rewrite or use original
  const getAfterContent = () => {
    if (!result) return formData.content.text;
    
    if (result.suggestions?.content_rewrites?.length > 0) {
      // Use the highest scored rewrite
      const bestRewrite = result.suggestions.content_rewrites.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      return bestRewrite.text;
    }
    
    // If PII was detected, use redacted content
    if (result.pii_detection?.detected && result.pii_detection?.redacted_content) {
      return result.pii_detection.redacted_content;
    }
    
    return formData.content.text;
  };

  const getAfterImage = () => {
    if (!result) return formData.content.image_url;
    
    // Use AI-generated image if available and successful
    if (result.suggested_image?.success && result.suggested_image?.image_url) {
      return result.suggested_image.image_url;
    }
    
    return formData.content.image_url;
  };

  const getHashtags = () => {
    if (!result?.suggestions?.hashtags) return [];
    return result.suggestions.hashtags;
  };

  // Platform-specific preview components
  const LinkedInPreview = ({ content, image, hashtags, isAfter }) => (
    <div className="linkedin-preview">
      <div className="linkedin-header">
        <div className="linkedin-avatar">🏢</div>
        <div className="linkedin-user-info">
          <div className="linkedin-name">Your Company</div>
          <div className="linkedin-meta">1,234 followers • 1h • 🌐</div>
        </div>
        <button className="linkedin-follow-btn">+ Follow</button>
      </div>
      <div className="linkedin-content">
        {content}
        {isAfter && hashtags.length > 0 && (
          <div className="linkedin-hashtags">
            {hashtags.map((tag, i) => (
              <span key={i} className="linkedin-hashtag">{tag}</span>
            ))}
          </div>
        )}
      </div>
      {image && (
        <div className="linkedin-image">
          <img src={image} alt="Post content" />
        </div>
      )}
      <div className="linkedin-engagement">
        <div className="linkedin-reactions">
          <div className="linkedin-reaction-icons">
            <span className="reaction-icon like">👍</span>
            <span className="reaction-icon love">❤️</span>
            <span className="reaction-icon insightful">💡</span>
          </div>
          <span className="reaction-count">47</span>
        </div>
        <div className="linkedin-counts">
          <span>12 comments • 8 reposts</span>
        </div>
      </div>
      <div className="linkedin-actions">
        <button>👍 Like</button>
        <button>💬 Comment</button>
        <button>🔄 Repost</button>
        <button>📤 Send</button>
      </div>
    </div>
  );

  const InstagramPreview = ({ content, image, hashtags, isAfter }) => (
    <div className="instagram-preview">
      <div className="instagram-header">
        <div className="instagram-avatar">📷</div>
        <div className="instagram-username">your_brand</div>
        <button className="instagram-more">•••</button>
      </div>
      {image && (
        <div className="instagram-image">
          <img src={image} alt="Post content" />
        </div>
      )}
      <div className="instagram-actions">
        <div className="instagram-action-left">
          <button>❤️</button>
          <button>💬</button>
          <button>📤</button>
        </div>
        <button>🔖</button>
      </div>
      <div className="instagram-likes">1,234 likes</div>
      <div className="instagram-caption">
        <span className="instagram-username-bold">your_brand</span> {content}
        {isAfter && hashtags.length > 0 && (
          <div className="instagram-hashtags">
            {hashtags.map((tag, i) => (
              <span key={i} className="instagram-hashtag">{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div className="instagram-time">2 HOURS AGO</div>
    </div>
  );

  const EmailPreview = ({ content, image, isAfter }) => (
    <div className="email-preview">
      <div className="email-header">
        <div className="email-field">
          <span className="email-label">From:</span>
          <span className="email-value">marketing@yourcompany.com</span>
        </div>
        <div className="email-field">
          <span className="email-label">To:</span>
          <span className="email-value">customer@example.com</span>
        </div>
        <div className="email-field">
          <span className="email-label">Subject:</span>
          <span className="email-value">{formData.campaign_name || 'Marketing Campaign'}</span>
        </div>
      </div>
      <div className="email-body">
        {image && (
          <div className="email-image">
            <img src={image} alt="Email content" />
          </div>
        )}
        <div className="email-content">
          <p>{content}</p>
        </div>
        {formData.content.call_to_action && (
          <div className="email-cta">
            <button className="email-cta-button">{formData.content.call_to_action}</button>
          </div>
        )}
        <div className="email-footer">
          <p>© 2026 Your Company. All rights reserved.</p>
          <a href="#">Unsubscribe</a>
        </div>
      </div>
    </div>
  );

  const renderPlatformPreview = (isAfter = false) => {
    const content = isAfter ? getAfterContent() : formData.content.text;
    const image = isAfter ? getAfterImage() : formData.content.image_url;
    const hashtags = isAfter ? getHashtags() : [];

    switch (selectedPlatform) {
      case 'LinkedIn':
        return <LinkedInPreview content={content} image={image} hashtags={hashtags} isAfter={isAfter} />;
      case 'Instagram':
        return <InstagramPreview content={content} image={image} hashtags={hashtags} isAfter={isAfter} />;
      case 'Email':
        return <EmailPreview content={content} image={image} isAfter={isAfter} />;
      default:
        return <LinkedInPreview content={content} image={image} hashtags={hashtags} isAfter={isAfter} />;
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>🛡️ AgentGuard</h1>
          <p>AI-Powered Marketing Content Review Platform</p>
        </div>
      </header>

      <div className="app-container">
        <div className="input-section">
          <div className="section-header">
            <h2>Content Review Input</h2>
            <div className="sample-buttons">
              <button onClick={() => loadSample('sample_input_1')} className="sample-btn">
                Sample 1: SaaS Launch
              </button>
              <button onClick={() => loadSample('sample_input_2')} className="sample-btn">
                Sample 2: Fashion
              </button>
              <button onClick={() => loadSample('sample_input_4_problematic')} className="sample-btn error">
                Sample 3: Problematic
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="review-form">
            <div className="form-group">
              <label>Campaign Name</label>
              <input
                type="text"
                value={formData.campaign_name}
                onChange={(e) => setFormData({...formData, campaign_name: e.target.value})}
                placeholder="e.g., Q1 2026 Product Launch"
                required
              />
            </div>

            <div className="form-group">
              <label>Platform</label>
              <select
                value={formData.metadata.platform}
                onChange={(e) => handleInputChange('metadata', 'platform', e.target.value)}
              >
                <option value="LinkedIn">LinkedIn</option>
                <option value="Instagram">Instagram</option>
                <option value="Email">Email</option>
              </select>
            </div>

            <div className="form-group">
              <label>Content Text *</label>
              <textarea
                value={formData.content.text}
                onChange={(e) => handleInputChange('content', 'text', e.target.value)}
                placeholder="Enter your marketing content here..."
                rows={6}
                required
              />
              <small>{formData.content.text.length} characters</small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="url"
                  value={formData.content.image_url}
                  onChange={(e) => handleInputChange('content', 'image_url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="form-group">
                <label>Call to Action</label>
                <input
                  type="text"
                  value={formData.content.call_to_action}
                  onChange={(e) => handleInputChange('content', 'call_to_action', e.target.value)}
                  placeholder="e.g., Learn More, Sign Up"
                />
              </div>
            </div>

            <div className="form-section-title">Target Audience</div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Age Group</label>
                <input
                  type="text"
                  value={formData.target_audience.age_group}
                  onChange={(e) => handleInputChange('target_audience', 'age_group', e.target.value)}
                  placeholder="e.g., 25-45"
                />
              </div>
              <div className="form-group">
                <label>Region</label>
                <input
                  type="text"
                  value={formData.target_audience.region}
                  onChange={(e) => handleInputChange('target_audience', 'region', e.target.value)}
                  placeholder="e.g., North America"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Industry</label>
                <input
                  type="text"
                  value={formData.target_audience.industry}
                  onChange={(e) => handleInputChange('target_audience', 'industry', e.target.value)}
                  placeholder="e.g., B2B SaaS, E-commerce"
                />
              </div>
              <div className="form-group">
                <label>Interests (comma-separated)</label>
                <input
                  type="text"
                  value={formData.target_audience.interests.join(', ')}
                  onChange={(e) => handleInterestsChange(e.target.value)}
                  placeholder="e.g., technology, innovation, startups"
                />
              </div>
            </div>

            <div className="form-section-title">Options</div>
            
            <div className="form-row checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.options.request_rewrites}
                  onChange={(e) => handleInputChange('options', 'request_rewrites', e.target.checked)}
                />
                <span>Request content rewrites</span>
              </label>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.options.strict_mode}
                  onChange={(e) => handleInputChange('options', 'strict_mode', e.target.checked)}
                />
                <span>Strict mode (reject on any violation)</span>
              </label>
            </div>

            {formData.options.request_rewrites && (
              <div className="form-group">
                <label>Number of rewrites: {formData.options.rewrite_count}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.options.rewrite_count}
                  onChange={(e) => handleInputChange('options', 'rewrite_count', parseInt(e.target.value))}
                />
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '🔄 Reviewing...' : '🚀 Submit for Review'}
            </button>
          </form>

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {result && (
          <div className="results-section">
            <div className="results-header">
              <h2>Campaign Preview</h2>
              <div className="review-meta">
                <span>Review ID: {result.review_id}</span>
                <span>Processed in: {result.audit.processing_time_ms}ms</span>
              </div>
            </div>

            {/* Score and Recommendation */}
            <div className="score-card">
              <div className="score-main" style={{ borderColor: getScoreColor(result.overall_score) }}>
                <div className="score-value" style={{ color: getScoreColor(result.overall_score) }}>
                  {result.overall_score}/10
                </div>
                <div className="score-label">Overall Score</div>
              </div>
              <div className="recommendation-badge" style={{ backgroundColor: getRecommendationBadge(result.recommendation).color }}>
                {getRecommendationBadge(result.recommendation).text}
              </div>
            </div>

            {/* Platform Selector */}
            <div className="platform-selector">
              <button 
                className={selectedPlatform === 'LinkedIn' ? 'platform-btn active' : 'platform-btn'}
                onClick={() => setSelectedPlatform('LinkedIn')}
              >
                💼 LinkedIn
              </button>
              <button 
                className={selectedPlatform === 'Instagram' ? 'platform-btn active' : 'platform-btn'}
                onClick={() => setSelectedPlatform('Instagram')}
              >
                📸 Instagram
              </button>
              <button 
                className={selectedPlatform === 'Email' ? 'platform-btn active' : 'platform-btn'}
                onClick={() => setSelectedPlatform('Email')}
              >
                📧 Email
              </button>
            </div>

            {/* BEFORE and AFTER Preview */}
            <div className="preview-container">
              <div className="preview-column">
                <h3 className="preview-title before">BEFORE</h3>
                <div className="preview-box">
                  {renderPlatformPreview(false)}
                </div>
              </div>

              <div className="preview-divider">
                <div className="arrow-icon">→</div>
              </div>

              <div className="preview-column">
                <h3 className="preview-title after">AFTER</h3>
                <div className="preview-box">
                  {renderPlatformPreview(true)}
                </div>
              </div>
            </div>

            {/* Collapsible Details Sections */}
            <div className="details-sections">
              <h3 className="details-header">Review Details</h3>

              {/* Quick Stats */}
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-label">PII Detection</div>
                  <div className={`stat-value ${result.pii_detection.detected ? 'warning' : 'success'}`}>
                    {result.pii_detection.detected ? `${result.pii_detection.items.length} found` : 'None'}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Compliance Score</div>
                  <div className="stat-value" style={{ color: getScoreColor(result.compliance.score) }}>
                    {result.compliance.score}/10
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Audience Fit</div>
                  <div className="stat-value" style={{ color: getScoreColor(result.audience_fit.score) }}>
                    {result.audience_fit.score}/10
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Violations</div>
                  <div className={`stat-value ${result.compliance.violations.length > 0 ? 'error' : 'success'}`}>
                    {result.compliance.violations.length}
                  </div>
                </div>
              </div>

              {/* PII Detection Section */}
              {result.pii_detection.detected && (
                <div className="collapsible-section">
                  <button 
                    className="collapsible-header"
                    onClick={() => toggleSection('pii')}
                  >
                    <span>🚨 PII Detection - {result.pii_detection.items.length} Issues Found</span>
                    <span className="toggle-icon">{expandedSection === 'pii' ? '▼' : '▶'}</span>
                  </button>
                  {expandedSection === 'pii' && (
                    <div className="collapsible-content">
                      <div className="pii-items">
                        {result.pii_detection.items.map((item, i) => (
                          <div key={i} className={`pii-item severity-${item.severity}`}>
                            <div className="pii-type">{item.type.toUpperCase()}</div>
                            <div className="pii-desc">{item.description}</div>
                            <div className="pii-severity">Severity: {item.severity}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Compliance Section */}
              <div className="collapsible-section">
                <button 
                  className="collapsible-header"
                  onClick={() => toggleSection('compliance')}
                >
                  <span>⚖️ Compliance Analysis - Score: {result.compliance.score}/10</span>
                  <span className="toggle-icon">{expandedSection === 'compliance' ? '▼' : '▶'}</span>
                </button>
                {expandedSection === 'compliance' && (
                  <div className="collapsible-content">
                    {result.compliance.ai_assessment && (
                      <div className="ai-assessment">
                        <h4>AI Assessment</h4>
                        <p>{result.compliance.ai_assessment}</p>
                      </div>
                    )}

                    {result.compliance.violations.length > 0 && (
                      <div className="violations">
                        <h4>❌ Violations</h4>
                        {result.compliance.violations.map((v, i) => (
                          <div key={i} className={`violation-item severity-${v.severity}`}>
                            <strong>{v.rule}:</strong> {v.message}
                          </div>
                        ))}
                      </div>
                    )}

                    {result.compliance.warnings.length > 0 && (
                      <div className="warnings">
                        <h4>⚠️ Warnings</h4>
                        {result.compliance.warnings.map((w, i) => (
                          <div key={i} className="warning-item">
                            <strong>{w.rule}:</strong> {w.message}
                          </div>
                        ))}
                      </div>
                    )}

                    {result.compliance.passed_checks.length > 0 && (
                      <div className="passed-checks">
                        <h4>✅ Passed Checks</h4>
                        <div className="check-tags">
                          {result.compliance.passed_checks.map((check, i) => (
                            <span key={i} className="check-tag success">{check}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Audience Fit Section */}
              <div className="collapsible-section">
                <button 
                  className="collapsible-header"
                  onClick={() => toggleSection('audience')}
                >
                  <span>🎯 Audience Fit Analysis - Score: {result.audience_fit.score}/10</span>
                  <span className="toggle-icon">{expandedSection === 'audience' ? '▼' : '▶'}</span>
                </button>
                {expandedSection === 'audience' && (
                  <div className="collapsible-content">
                    <div className="audience-analysis">
                      <h4>Analysis</h4>
                      <div className="analysis-grid">
                        <div className="analysis-item">
                          <label>Tone:</label>
                          <span>{result.audience_fit.analysis.tone}</span>
                        </div>
                        <div className="analysis-item">
                          <label>Language Complexity:</label>
                          <span>{result.audience_fit.analysis.language_complexity}</span>
                        </div>
                        <div className="analysis-item">
                          <label>Cultural Sensitivity:</label>
                          <span>{result.audience_fit.analysis.cultural_sensitivity}</span>
                        </div>
                        <div className="analysis-item">
                          <label>Engagement Prediction:</label>
                          <span>{result.audience_fit.analysis.engagement_prediction}</span>
                        </div>
                      </div>
                    </div>

                    {result.audience_fit.strengths.length > 0 && (
                      <div className="strengths">
                        <h4>💪 Strengths</h4>
                        <ul>
                          {result.audience_fit.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.audience_fit.concerns.length > 0 && (
                      <div className="concerns">
                        <h4>⚠️ Concerns</h4>
                        <ul>
                          {result.audience_fit.concerns.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.audience_fit.recommendations.length > 0 && (
                      <div className="recommendations">
                        <h4>📋 Recommendations</h4>
                        <ul>
                          {result.audience_fit.recommendations.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content Suggestions Section */}
              <div className="collapsible-section">
                <button 
                  className="collapsible-header"
                  onClick={() => toggleSection('suggestions')}
                >
                  <span>💡 Content Suggestions & Improvements</span>
                  <span className="toggle-icon">{expandedSection === 'suggestions' ? '▼' : '▶'}</span>
                </button>
                {expandedSection === 'suggestions' && (
                  <div className="collapsible-content">
                    {result.suggestions.posting_time && (
                      <div className="posting-time">
                        <h4>⏰ Optimal Posting Time</h4>
                        <p><strong>{result.suggestions.posting_time.optimal}</strong></p>
                        <small>{result.suggestions.posting_time.reason}</small>
                      </div>
                    )}

                    {result.suggestions.improvements.length > 0 && (
                      <div className="improvements">
                        <h4>✨ Improvement Suggestions</h4>
                        <ul>
                          {result.suggestions.improvements.map((imp, i) => (
                            <li key={i}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content Rewrites Section */}
              {result.suggestions?.content_rewrites?.length > 0 && (
                <div className="collapsible-section">
                  <button 
                    className="collapsible-header"
                    onClick={() => toggleSection('rewrites')}
                  >
                    <span>📝 Alternative Content Versions ({result.suggestions.content_rewrites.length})</span>
                    <span className="toggle-icon">{expandedSection === 'rewrites' ? '▼' : '▶'}</span>
                  </button>
                  {expandedSection === 'rewrites' && (
                    <div className="collapsible-content">
                      {result.suggestions.content_rewrites.map((rewrite, i) => (
                        <div key={i} className="rewrite-card">
                          <div className="rewrite-header">
                            <h4>Version {rewrite.version}</h4>
                            <div className="rewrite-score" style={{ color: getScoreColor(rewrite.score) }}>
                              Score: {rewrite.score}/10
                            </div>
                          </div>
                          <div className="rewrite-content">
                            <pre>{rewrite.text}</pre>
                          </div>
                          {rewrite.focus && (
                            <div className="rewrite-focus">
                              <strong>Focus:</strong> {rewrite.focus}
                            </div>
                          )}
                          <div className="rewrite-changes">
                            <strong>Changes:</strong>
                            <ul>
                              {rewrite.changes.map((change, j) => (
                                <li key={j}>{change}</li>
                              ))}
                            </ul>
                          </div>
                          <button 
                            className="copy-btn"
                            onClick={() => {
                              navigator.clipboard.writeText(rewrite.text);
                              alert('Content copied to clipboard!');
                            }}
                          >
                            📋 Copy to Clipboard
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AI-Generated Image Section */}
              {result.suggested_image?.success && (
                <div className="collapsible-section">
                  <button 
                    className="collapsible-header"
                    onClick={() => toggleSection('image')}
                  >
                    <span>🎨 AI-Generated Image Details</span>
                    <span className="toggle-icon">{expandedSection === 'image' ? '▼' : '▶'}</span>
                  </button>
                  {expandedSection === 'image' && (
                    <div className="collapsible-content">
                      <div className="image-details">
                        <div className="detail-item">
                          <strong>Model:</strong> {result.suggested_image.model}
                        </div>
                        <div className="detail-item">
                          <strong>Size:</strong> {result.suggested_image.size}
                        </div>
                        <div className="detail-item">
                          <strong>Generated:</strong> {new Date(result.suggested_image.generated_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="image-prompt">
                        <h4>💡 Prompt Used</h4>
                        <p className="prompt-text">{result.suggested_image.prompt_used}</p>
                        {result.suggested_image.revised_prompt && result.suggested_image.revised_prompt !== result.suggested_image.prompt_used && (
                          <>
                            <h5>✨ AI-Refined Prompt</h5>
                            <p className="prompt-text revised">{result.suggested_image.revised_prompt}</p>
                          </>
                        )}
                      </div>

                      <div className="image-actions">
                        <a 
                          href={result.suggested_image.image_url} 
                          download="suggested-image.png"
                          className="download-btn"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          💾 Download Image
                        </a>
                        <button 
                          className="copy-url-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(result.suggested_image.image_url);
                            alert('Image URL copied to clipboard!');
                          }}
                        >
                          🔗 Copy URL
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
