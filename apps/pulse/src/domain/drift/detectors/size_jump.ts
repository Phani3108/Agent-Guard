import { DriftDetector, DriftDetectorResult } from './base.detector';
import { Snapshot } from '../../snapshot/snapshot.types';
import { Segment } from '../../segment/segment.types';
import { DriftEvidence } from '../drift.types';

export class SizeJumpDetector extends DriftDetector {
  private readonly DEFAULT_THRESHOLD = parseFloat(
    process.env.DRIFT_SIZE_CHANGE_THRESHOLD || '0.15'
  );

  async detect(
    segment: Segment,
    current: Snapshot,
    previous: Snapshot
  ): Promise<DriftDetectorResult> {
    const threshold = this.getThreshold(segment, this.DEFAULT_THRESHOLD, 'sizeChangePercent');

    // Calculate size change
    const sizeChange = current.size - previous.size;
    const changePercent = previous.size > 0 ? Math.abs(sizeChange) / previous.size : 0;

    // Check if change exceeds threshold
    if (changePercent >= threshold) {
      const evidence: DriftEvidence = {
        type: 'size_jump',
        currentValue: current.size,
        previousValue: previous.size,
        changePercent,
        threshold,
        details: {
          absoluteChange: sizeChange,
          direction: sizeChange > 0 ? 'increase' : 'decrease',
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
