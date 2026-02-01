import { Segment } from '../segment/segment.types';
import { SnapshotMetrics, AttributeDistribution } from './snapshot.types';

/**
 * Compute snapshot metrics for a segment.
 * In a real implementation, this would query your data warehouse/analytics DB
 * to calculate actual metrics based on the segment definition.
 * 
 * For MVP/demo purposes, this returns synthetic data.
 */
export class SnapshotComputer {
  /**
   * Compute snapshot metrics for a segment
   * @param segment - The segment to compute metrics for
   * @returns Snapshot metrics
   */
  async computeMetrics(segment: Segment): Promise<SnapshotMetrics> {
    // TODO: Real implementation would:
    // 1. Execute segment.definition rules against data warehouse
    // 2. Count matching users
    // 3. Calculate attribute distributions
    // 4. Measure conversion rates
    // 5. Track entry/exit velocity

    // For now, return synthetic/demo data
    return this.generateSyntheticMetrics(segment);
  }

  /**
   * Generate synthetic metrics for demo purposes
   */
  private generateSyntheticMetrics(segment: Segment): SnapshotMetrics {
    // Generate a stable but varied size based on segment name
    const baseSize = this.hashString(segment.name) % 50000 + 10000;
    const variance = Math.random() * 0.1 - 0.05; // ±5% variance
    const size = Math.floor(baseSize * (1 + variance));

    // Generate synthetic attribute distributions
    const attributeDistributions: AttributeDistribution = {
      platform: {
        ios: Math.floor(size * 0.45),
        android: Math.floor(size * 0.40),
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

    // Calculate conversion rate with some variance
    const baseConversionRate = 0.15;
    const conversionRate = Math.max(0, Math.min(1, baseConversionRate + (Math.random() * 0.1 - 0.05)));

    // Velocity metrics
    const velocityIn = Math.floor(size * 0.05); // 5% new entries
    const velocityOut = Math.floor(size * 0.03); // 3% exits

    return {
      size,
      attributeDistributions,
      conversionRate,
      velocityIn,
      velocityOut,
    };
  }

  /**
   * Simple hash function for consistent demo data
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
