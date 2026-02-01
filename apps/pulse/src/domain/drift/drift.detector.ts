import { Snapshot } from '../snapshot/snapshot.types';
import { Segment } from '../segment/segment.types';
import { SizeJumpDetector } from './detectors/size_jump';
import { DistributionShiftDetector } from './detectors/distribution_shift';
import { ConversionAnomalyDetector } from './detectors/conversion_anomaly';
import { InactivityCreepDetector } from './detectors/inactivity_creep';
import { DriftDetectorResult } from './detectors/base.detector';
import { logger } from '../../observability/logger';

export class DriftDetectorService {
  private detectors = [
    new SizeJumpDetector(),
    new DistributionShiftDetector(),
    new ConversionAnomalyDetector(),
    new InactivityCreepDetector(),
  ];

  /**
   * Run all drift detectors on a segment's snapshots
   */
  async detectDrift(
    segment: Segment,
    current: Snapshot,
    previous: Snapshot
  ): Promise<DriftDetectorResult[]> {
    logger.info(
      {
        segmentId: segment.id,
        currentTimestamp: current.timestamp,
        previousTimestamp: previous.timestamp,
      },
      'Running drift detection'
    );

    const results: DriftDetectorResult[] = [];

    for (const detector of this.detectors) {
      try {
        const result = await detector.detect(segment, current, previous);
        if (result.isDrift) {
          results.push(result);
          logger.info(
            {
              segmentId: segment.id,
              driftType: result.evidence?.type,
              severity: result.severity,
            },
            'Drift detected'
          );
        }
      } catch (error) {
        logger.error(
          { error, segmentId: segment.id, detector: detector.constructor.name },
          'Drift detector failed'
        );
      }
    }

    return results;
  }

  /**
   * Check if monitoring is enabled for a segment
   */
  isMonitoringEnabled(segment: Segment): boolean {
    return segment.baseline?.monitoringEnabled !== false && segment.isActive;
  }
}
