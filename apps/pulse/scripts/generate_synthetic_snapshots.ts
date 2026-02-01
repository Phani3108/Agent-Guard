import 'dotenv/config';
import { Pool } from 'pg';

interface Segment {
  id: string;
  name: string;
}

async function generateSyntheticSnapshots() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('📸 Generating synthetic snapshots with drift...');

    // Get all segments
    const segmentsResult = await db.query('SELECT id, name FROM segments WHERE is_active = true');
    const segments: Segment[] = segmentsResult.rows;

    if (segments.length === 0) {
      console.log('⚠️  No segments found. Run: npm run seed');
      return;
    }

    console.log(`Found ${segments.length} segments`);

    for (const segment of segments) {
      // Generate 7 days of snapshots with gradual drift
      const days = 7;
      const baseSize = 10000 + Math.floor(Math.random() * 20000);

      for (let day = days; day >= 0; day--) {
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - day);

        // Introduce drift on day 2
        let driftFactor = 1.0;
        if (day <= 2) {
          // Simulate sudden size drop (42% erosion as per demo narrative)
          driftFactor = 0.58; // 42% drop
        }

        const size = Math.floor(baseSize * driftFactor);

        // Generate attribute distributions with drift
        const platformDrift = day <= 2 ? 0.7 : 1.0; // Android drops
        const attrDistributions = {
          platform: {
            ios: Math.floor(size * 0.45),
            android: Math.floor(size * 0.40 * platformDrift),
            web: Math.floor(size * 0.15),
          },
          status: {
            active: Math.floor(size * 0.70),
            dormant: Math.floor(size * 0.20),
            churned: Math.floor(size * 0.10),
          },
          tier: {
            free: Math.floor(size * 0.60),
            premium: Math.floor(size * 0.30),
            enterprise: Math.floor(size * 0.10),
          },
        };

        const convRate = day <= 2 ? 0.10 : 0.15; // Conversion drops too
        const velocityIn = Math.floor(size * (day <= 2 ? 0.03 : 0.05));
        const velocityOut = Math.floor(size * (day <= 2 ? 0.08 : 0.03)); // More exits

        await db.query(
          `INSERT INTO snapshots (segment_id, ts, size, attr_distributions, conv_rate, velocity_in, velocity_out)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            segment.id,
            timestamp,
            size,
            JSON.stringify(attrDistributions),
            convRate,
            velocityIn,
            velocityOut,
          ]
        );
      }

      console.log(`✅ Generated snapshots for: ${segment.name}`);
    }

    console.log('\n🎉 Synthetic snapshots generated successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check for drift: curl http://localhost:3000/api/drift/incidents');
    console.log('   2. Or trigger drift detection manually via the API');
  } catch (error) {
    console.error('❌ Failed to generate snapshots:', error);
    throw error;
  } finally {
    await db.end();
  }
}

generateSyntheticSnapshots();
