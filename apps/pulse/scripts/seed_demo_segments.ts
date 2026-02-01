import 'dotenv/config';
import { Pool } from 'pg';

const segments = [
  {
    name: 'High-Value Active Users',
    definition: {
      rules: [
        { field: 'ltv', operator: '>', value: 1000 },
        { field: 'last_active_days', operator: '<=', value: 7 },
      ],
      logicalOperator: 'AND',
    },
    owner: 'growth-team',
    baseline: {
      monitoringEnabled: true,
      expectedSize: { min: 8000, max: 12000 },
      criticalAttributes: ['platform', 'tier'],
      alertThresholds: {
        sizeChangePercent: 0.15,
        distributionShift: 0.20,
      },
    },
  },
  {
    name: 'Premium Trial Users',
    definition: {
      rules: [
        { field: 'subscription_status', operator: '=', value: 'trial' },
        { field: 'tier', operator: '=', value: 'premium' },
      ],
      logicalOperator: 'AND',
    },
    owner: 'revenue-team',
    baseline: {
      monitoringEnabled: true,
      expectedSize: { min: 2000, max: 5000 },
      expectedConversionRate: { min: 0.20, max: 0.35 },
    },
  },
  {
    name: 'Churned Users - Last 30 Days',
    definition: {
      rules: [
        { field: 'status', operator: '=', value: 'churned' },
        { field: 'churned_days_ago', operator: '<=', value: 30 },
      ],
      logicalOperator: 'AND',
    },
    owner: 'retention-team',
    baseline: {
      monitoringEnabled: true,
      alertThresholds: {
        sizeChangePercent: 0.25,
      },
    },
  },
  {
    name: 'Mobile App Power Users',
    definition: {
      rules: [
        { field: 'platform', operator: 'in', value: ['ios', 'android'] },
        { field: 'sessions_last_week', operator: '>=', value: 10 },
      ],
      logicalOperator: 'AND',
    },
    owner: 'product-team',
    baseline: {
      monitoringEnabled: true,
      criticalAttributes: ['platform', 'app_version'],
    },
  },
  {
    name: 'Enterprise Customers',
    definition: {
      rules: [
        { field: 'tier', operator: '=', value: 'enterprise' },
        { field: 'is_active', operator: '=', value: true },
      ],
      logicalOperator: 'AND',
    },
    owner: 'enterprise-team',
    baseline: {
      monitoringEnabled: true,
      expectedSize: { min: 100, max: 500 },
      alertThresholds: {
        sizeChangePercent: 0.10, // More sensitive for enterprise
        conversionAnomaly: 0.15,
      },
    },
  },
];

async function seed() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🌱 Seeding demo segments...');

    for (const segment of segments) {
      const result = await db.query(
        `INSERT INTO segments (name, definition, owner, baseline, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, name`,
        [
          segment.name,
          JSON.stringify(segment.definition),
          segment.owner,
          JSON.stringify(segment.baseline),
        ]
      );

      console.log(`✅ Created segment: ${result.rows[0].name} (${result.rows[0].id})`);
    }

    console.log('\n🎉 Successfully seeded', segments.length, 'demo segments!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Take snapshots: curl -X POST http://localhost:3000/api/snapshots/take');
    console.log('   3. View segments: curl http://localhost:3000/api/segments');
  } catch (error) {
    console.error('❌ Failed to seed segments:', error);
    throw error;
  } finally {
    await db.end();
  }
}

seed();
