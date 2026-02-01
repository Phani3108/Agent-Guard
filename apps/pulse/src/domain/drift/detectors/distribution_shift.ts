import { DriftDetector, DriftDetectorResult } from './base.detector';
import { Snapshot } from '../../snapshot/snapshot.types';
import { Segment } from '../../segment/segment.types';
import { DriftEvidence } from '../drift.types';
import { AttributeDistribution } from '../../snapshot/snapshot.types';

export class DistributionShiftDetector extends DriftDetector {
  private readonly DEFAULT_THRESHOLD = parseFloat(
    process.env.DRIFT_DISTRIBUTION_THRESHOLD || '0.20'
  );

  async detect(
    segment: Segment,
    current: Snapshot,
    previous: Snapshot
  ): Promise<DriftDetectorResult> {
    const threshold = this.getThreshold(segment, this.DEFAULT_THRESHOLD, 'distributionShift');

    // Get critical attributes to monitor
    const criticalAttributes =
      segment.baseline?.criticalAttributes || Object.keys(current.attributeDistributions);

    const affectedAttributes: string[] = [];
    let maxShift = 0;

    // Check each critical attribute for distribution shift
    for (const attribute of criticalAttributes) {
      const currentDist = current.attributeDistributions[attribute];
      const previousDist = previous.attributeDistributions[attribute];

      if (!currentDist || !previousDist) {
        continue;
      }

      // Calculate KL divergence or simpler metric
      const shift = this.calculateDistributionShift(currentDist, previousDist, current.size, previous.size);

      if (shift >= threshold) {
        affectedAttributes.push(attribute);
        maxShift = Math.max(maxShift, shift);
      }
    }

    if (affectedAttributes.length > 0) {
      const evidence: DriftEvidence = {
        type: 'distribution_shift',
        currentValue: maxShift,
        previousValue: 0, // baseline
        changePercent: maxShift,
        threshold,
        affectedAttributes,
        details: {
          attributeCount: affectedAttributes.length,
          previousTimestamp: previous.timestamp,
          currentTimestamp: current.timestamp,
        },
      };

      const severity = this.calculateSeverity(maxShift, threshold);

      return {
        isDrift: true,
        evidence,
        severity,
      };
    }

    return { isDrift: false };
  }

  /**
   * Calculate distribution shift using simplified Jensen-Shannon divergence
   */
  private calculateDistributionShift(
    current: { [value: string]: number },
    previous: { [value: string]: number },
    currentTotal: number,
    previousTotal: number
  ): number {
    // Normalize distributions
    const currentProbs = this.normalize(current, currentTotal);
    const previousProbs = this.normalize(previous, previousTotal);

    // Get all unique values
    const allValues = new Set([...Object.keys(currentProbs), ...Object.keys(previousProbs)]);

    // Calculate total variation distance (simpler than KL divergence)
    let totalDiff = 0;
    for (const value of allValues) {
      const p = currentProbs[value] || 0;
      const q = previousProbs[value] || 0;
      totalDiff += Math.abs(p - q);
    }

    // Total variation distance is half the sum of absolute differences
    return totalDiff / 2;
  }

  private normalize(dist: { [value: string]: number }, total: number): { [value: string]: number } {
    const normalized: { [value: string]: number } = {};
    for (const [value, count] of Object.entries(dist)) {
      normalized[value] = total > 0 ? count / total : 0;
    }
    return normalized;
  }
}
