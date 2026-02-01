import { Snapshot } from '../../snapshot/snapshot.types';
import { Segment } from '../../segment/segment.types';
import { DriftEvidence, DriftSeverity } from '../drift.types';

export interface DriftDetectorResult {
  isDrift: boolean;
  evidence?: DriftEvidence;
  severity?: DriftSeverity;
}

export abstract class DriftDetector {
  abstract detect(
    segment: Segment,
    current: Snapshot,
    previous: Snapshot
  ): Promise<DriftDetectorResult>;

  protected calculateSeverity(changePercent: number, threshold: number): DriftSeverity {
    const ratio = Math.abs(changePercent) / threshold;

    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  protected getThreshold(
    segment: Segment,
    defaultThreshold: number,
    thresholdKey: string
  ): number {
    if (segment.baseline?.alertThresholds) {
      const customThreshold = (segment.baseline.alertThresholds as any)[thresholdKey];
      if (customThreshold !== undefined) {
        return customThreshold;
      }
    }
    return defaultThreshold;
  }
}
