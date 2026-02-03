# AgentGuard - AI Agent Marketing Review Platform

![AgentGuard](https://img.shields.io/badge/AgentGuard-v1.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-orange)

AgentGuard is a comprehensive AI-powered platform that reviews marketing content through multiple specialized agents. It provides PII detection, compliance checking, audience fit analysis, and actionable content improvement suggestions including rewrites.

## 🌟 Features

### Multi-Agent Review Pipeline
- **AEGIS (PII Detector)**: Detects and redacts sensitive personal information
- **SENTINEL (Compliance Agent)**: Validates content against platform rules and regulations
- **PULSE (Audience Fit Analyzer)**: Analyzes demographic alignment and engagement potential
- **CREATIVE (Enhancement Agent)**: Generates suggestions and improved content versions

### Key Capabilities
- ✅ PII Detection & Redaction (emails, phones, SSN, credit cards, etc.)
- ✅ Platform-specific compliance rules (LinkedIn, Instagram, Twitter, Facebook, TikTok)
- ✅ Audience fit scoring and analysis
- ✅ Hashtag recommendations
- ✅ Optimal posting time suggestions
- ✅ Content rewrite generation (3-5 improved versions)
- ✅ Comprehensive audit logging
- ✅ Modern, responsive UI

## 📋 Prerequisites

- Node.js 18+ and npm
- OpenAI API key (GPT-4 access)
- Modern web browser

## 🚀 Quick Start

### 1. Clone or Navigate to Repository

```bash
cd /Users/yash.sa/Desktop/AgentGuardNew
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=your_key_here
nano .env

# Start backend server
npm start
```

Backend will run on `http://localhost:5000`

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend will run on `http://localhost:3000`

## 📖 Usage

### Using the Web Interface

1. **Load Sample Data**: Click one of the sample buttons to load pre-configured test data
2. **Enter Content**: Fill in your marketing content and campaign details
3. **Configure Options**: 
   - Enable/disable content rewrites
   - Adjust rewrite count
   - Toggle strict mode
4. **Submit**: Click "Submit for Review"
5. **Review Results**: Explore results across multiple tabs:
   - Overview: Summary and critical issues
   - PII Detection: Detected sensitive information
   - Compliance: Platform rule violations
   - Audience Fit: Demographic analysis
   - Suggestions: Improvements and recommendations
   - Rewrites: AI-generated improved versions

### Using the API

#### Review Content

```bash
curl -X POST http://localhost:5000/api/review \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_name": "Q1 2026 Launch",
    "content": {
      "text": "Your marketing content here",
      "image_url": "https://example.com/image.jpg"
    },
    "metadata": {
      "platform": "LinkedIn"
    },
    "target_audience": {
      "age_group": "25-45",
      "region": "North America",
      "interests": ["technology", "business"]
    },
    "options": {
      "request_rewrites": true,
      "rewrite_count": 3
    }
  }'
```

#### Get Supported Platforms

```bash
curl http://localhost:5000/api/platforms
```

#### Health Check

```bash
curl http://localhost:5000/api/health
```

## 📁 Project Structure

```
AgentGuardNew/
├── ARCHITECTURE.md          # Detailed system architecture
├── README.md               # This file
├── backend/
│   ├── index.js           # Main server file
│   ├── logger.js          # Winston logging configuration
│   ├── package.json       # Backend dependencies
│   ├── .env.example       # Environment variables template
│   ├── agents/
│   │   ├── pii-detector.js      # AEGIS - PII detection
│   │   ├── compliance-agent.js  # SENTINEL - Compliance
│   │   ├── audience-agent.js    # PULSE - Audience fit
│   │   └── creative-agent.js    # CREATIVE - Suggestions
│   ├── config/
│   │   ├── compliance-rules.json    # Platform rules
│   │   └── sample-inputs.json       # Test data
│   └── logs/              # Auto-generated logs
└── frontend/
    ├── package.json       # Frontend dependencies
    ├── public/
    └── src/
        ├── App.js         # Main React component
        ├── App.css        # Styling
        ├── sample-inputs.json  # Sample data for UI
        └── index.js       # React entry point
```

## 🔧 Configuration

### Environment Variables

Backend `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=5000
NODE_ENV=development
LOG_LEVEL=info
```

### Platform Rules

Edit `backend/config/compliance-rules.json` to customize:
- Character limits
- Prohibited words
- Hashtag requirements
- Best practices
- Posting times

## 🧪 Testing

### Sample Test Cases

The platform includes 4 sample inputs:

1. **Sample 1**: Clean SaaS launch (but with PII issues)
2. **Sample 2**: Fashion campaign for Instagram
3. **Sample 3**: Problematic content (multiple violations)
4. **Sample 4**: Tech conference announcement

Load these via the UI or use the JSON in `backend/config/sample-inputs.json`

### Manual Testing

```bash
# Test PII detection
curl -X POST http://localhost:5000/api/review \
  -H "Content-Type: application/json" \
  -d @backend/config/sample-inputs.json
```

## 📊 API Response Example

```json
{
  "review_id": "rev_20260203_abc123",
  "timestamp": "2026-02-03T10:30:00Z",
  "status": "completed",
  "overall_score": 7.5,
  "recommendation": "approve_with_changes",
  "pii_detection": {
    "detected": true,
    "items": [...]
  },
  "compliance": {
    "status": "warning",
    "score": 6.5,
    "violations": [...],
    "warnings": [...]
  },
  "audience_fit": {
    "score": 8.2,
    "analysis": {...}
  },
  "suggestions": {
    "hashtags": ["#Innovation", "#Tech"],
    "posting_time": {...},
    "improvements": [...],
    "content_rewrites": [...]
  }
}
```

## 🎯 Use Cases

1. **Marketing Team Review**: Validate all content before posting
2. **AI Agent Output Validation**: Ensure AI-generated content meets standards
3. **Campaign Audit**: Batch review multiple pieces of content
4. **Content Creation Tool**: Get real-time feedback while writing
5. **Training**: Learn best practices through suggestions

## 🔐 Security & Privacy

- PII is detected but **never stored** in logs
- Redacted versions provided for safe review
- All API calls are audited (without sensitive data)
- Environment variables for API keys
- CORS enabled for frontend access

## 🚧 Limitations & Future Enhancements

### Current Limitations
- Requires OpenAI API key (costs apply)
- Text-only analysis (no image content analysis)
- English language only
- No historical performance data integration

### Planned Features (Phase 2)
- [ ] Historical performance analytics
- [ ] A/B testing suggestions
- [ ] Image content analysis (OCR, safety)
- [ ] Multi-language support
- [ ] Custom ML models for engagement prediction
- [ ] Team collaboration features
- [ ] Webhooks for external integrations

## 🤝 Contributing

This is a demonstration project. For production use:
1. Add comprehensive error handling
2. Implement rate limiting
3. Add authentication/authorization
4. Set up database for persistent storage
5. Add unit and integration tests
6. Implement caching for API calls

## 📝 License

MIT License - See LICENSE file for details

## 📞 Support

For issues or questions:
- Check `ARCHITECTURE.md` for detailed system design
- Review logs in `backend/logs/`
- Ensure OpenAI API key is valid and has GPT-4 access
- Verify Node.js version (18+)

## 🎓 Documentation

- **Architecture**: See `ARCHITECTURE.md`
- **API Endpoints**: See `ARCHITECTURE.md` → API Endpoints section
- **Input Schema**: See `ARCHITECTURE.md` → Input Schema section
- **Output Schema**: See `ARCHITECTURE.md` → Output Schema section

---

**Built with ❤️ using Node.js, React, and OpenAI GPT-4**
