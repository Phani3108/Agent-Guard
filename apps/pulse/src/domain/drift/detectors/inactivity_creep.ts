import { DriftDetector, DriftDetectorResult } from './base.detector';
import { Snapshot } from '../../snapshot/snapshot.types';
import { Segment } from '../../segment/segment.types';
import { DriftEvidence } from '../drift.types';

export class InactivityCreepDetector extends DriftDetector {
  private readonly DEFAULT_THRESHOLD = parseFloat(
    process.env.DRIFT_INACTIVITY_THRESHOLD || '0.30'
  );

  async detect(
    segment: Segment,
    current: Snapshot,
    previous: Snapshot
  ): Promise<DriftDetectorResult> {
    const threshold = this.getThreshold(segment, this.DEFAULT_THRESHOLD, 'inactivityCreep');

    // Check for inactivity patterns:
    // 1. High exit velocity relative to entry velocity
    // 2. Shrinking segment with low entry rate

    const currentNetVelocity = current.velocityIn - current.velocityOut;
    const previousNetVelocity = previous.velocityIn - previous.velocityOut;

    // Calculate churn rate
    const currentChurnRate = current.size > 0 ? current.velocityOut / current.size : 0;
    const previousChurnRate = previous.size > 0 ? previous.velocityOut / previous.size : 0;

    const churnChange = currentChurnRate - previousChurnRate;
    const changePercent = previousChurnRate > 0 ? Math.abs(churnChange) / previousChurnRate : 0;

    // Detect inactivity creep if churn increased significantly
    if (changePercent >= threshold && churnChange > 0) {
      const evidence: DriftEvidence = {
        type: 'inactivity_creep',
        currentValue: currentChurnRate,
        previousValue: previousChurnRate,
        changePercent,
        threshold,
        details: {
          currentVelocityIn: current.velocityIn,
          currentVelocityOut: current.velocityOut,
          previousVelocityIn: previous.velocityIn,
          previousVelocityOut: previous.velocityOut,
          currentNetVelocity,
          previousNetVelocity,
          netVelocityChange: currentNetVelocity - previousNetVelocity,
          previousTimestamp: previous.timestamp,
          currentTimestamp: current.timestamp,
        },
      };

      const severity = this.calculateSeverity(changePercent, threshold);

      return {
        isDrift: true,
        evidence,
        severity,
      };
    }

    return { isDrift: false };
  }
}
