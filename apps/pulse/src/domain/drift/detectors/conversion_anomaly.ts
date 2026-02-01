import { DriftDetector, DriftDetectorResult } from './base.detector';
import { Snapshot } from '../../snapshot/snapshot.types';
import { Segment } from '../../segment/segment.types';
import { DriftEvidence } from '../drift.types';

export class ConversionAnomalyDetector extends DriftDetector {
  private readonly DEFAULT_THRESHOLD = parseFloat(
    process.env.DRIFT_CONVERSION_THRESHOLD || '0.25'
  );

  async detect(
    segment: Segment,
    current: Snapshot,
    previous: Snapshot
  ): Promise<DriftDetectorResult> {
    // Skip if conversion rate is not tracked
    if (current.conversionRate === undefined || previous.conversionRate === undefined) {
      return { isDrift: false };
    }

    const threshold = this.getThreshold(segment, this.DEFAULT_THRESHOLD, 'conversionAnomaly');

    // Calculate conversion rate change
    const conversionChange = Math.abs(current.conversionRate - previous.conversionRate);
    const changePercent =
      previous.conversionRate > 0 ? conversionChange / previous.conversionRate : 0;

    // Check if change exceeds threshold
    if (changePercent >= threshold) {
      const evidence: DriftEvidence = {
        type: 'conversion_anomaly',
        currentValue: current.conversionRate,
        previousValue: previous.conversionRate,
        changePercent,
        threshold,
        details: {
          absoluteChange: current.conversionRate - previous.conversionRate,
          direction: current.conversionRate > previous.conversionRate ? 'increase' : 'decrease',
          previousTimestamp: previous.timestamp,
          currentTimestamp: current.timestamp,
          currentSegmentSize: current.size,
          previousSegmentSize: previous.size,
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
