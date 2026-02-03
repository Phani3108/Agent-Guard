/**
 * Test script to validate AgentGuard API with sample inputs
 */

const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api/review';

async function testReview(sampleName, sampleData) {
  console.log(`\n🧪 Testing: ${sampleName}`);
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ Review ID: ${result.review_id}`);
      console.log(`📊 Overall Score: ${result.overall_score}/10`);
      console.log(`🎯 Recommendation: ${result.recommendation}`);
      console.log(`🔍 PII Detected: ${result.pii_detection.detected ? 'Yes (' + result.pii_detection.items.length + ')' : 'No'}`);
      console.log(`✓ Compliance Score: ${result.compliance.score}/10`);
      console.log(`👥 Audience Fit: ${result.audience_fit.score}/10`);
      
      if (result.compliance.violations.length > 0) {
        console.log(`\n⚠️  Violations (${result.compliance.violations.length}):`);
        result.compliance.violations.forEach(v => {
          console.log(`   - ${v.message}`);
        });
      }
      
      if (result.suggestions?.content_rewrites?.length > 0) {
        console.log(`\n📝 Generated ${result.suggestions.content_rewrites.length} content rewrites`);
      }
      
      console.log(`\n⏱️  Processing Time: ${result.audit.processing_time_ms}ms`);
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Failed to connect: ${error.message}`);
    console.log(`\n💡 Make sure the backend is running:`);
    console.log(`   cd backend && npm start`);
  }
}

async function runTests() {
  console.log('\n🛡️  AgentGuard API Test Suite');
  console.log('='.repeat(60));
  
  // Load sample inputs
  const samplesPath = path.join(__dirname, 'config', 'sample-inputs.json');
  const samples = JSON.parse(fs.readFileSync(samplesPath, 'utf-8'));
  
  // Test each sample
  for (const [key, sampleData] of Object.entries(samples)) {
    await testReview(sampleData.campaign_name, sampleData);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between tests
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
  console.log('\n💡 Check backend/logs/audit.log for detailed audit trail');
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ Node.js 18+ required for fetch API');
  console.error('   Current version:', process.version);
  process.exit(1);
}

// Run tests
runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
