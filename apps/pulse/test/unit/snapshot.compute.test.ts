import { describe, it, expect } from 'vitest';
import { SnapshotComputer } from '../../src/domain/snapshot/snapshot.compute';
import { Segment } from '../../src/domain/segment/segment.types';

describe('SnapshotComputer', () => {
  const computer = new SnapshotComputer();

  const createMockSegment = (name: string): Segment => ({
    id: 'test-segment',
    name,
    definition: {
      rules: [{ field: 'test', operator: '=', value: 'test' }],
    },
    owner: 'test-owner',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('should compute metrics for a segment', async () => {
    const segment = createMockSegment('Test Segment');
    const metrics = await computer.computeMetrics(segment);

    expect(metrics.size).toBeGreaterThan(0);
    expect(metrics.attributeDistributions).toBeDefined();
    expect(metrics.conversionRate).toBeGreaterThanOrEqual(0);
    expect(metrics.conversionRate).toBeLessThanOrEqual(1);
    expect(metrics.velocityIn).toBeGreaterThanOrEqual(0);
    expect(metrics.velocityOut).toBeGreaterThanOrEqual(0);
  });

  it('should generate consistent metrics for same segment name', async () => {
    const segment1 = createMockSegment('Consistent Segment');
    const segment2 = createMockSegment('Consistent Segment');

    const metrics1 = await computer.computeMetrics(segment1);
    const metrics2 = await computer.computeMetrics(segment2);

    // Base size should be similar (with variance)
    const sizeDiff = Math.abs(metrics1.size - metrics2.size);
    const avgSize = (metrics1.size + metrics2.size) / 2;
    const variance = sizeDiff / avgSize;

    expect(variance).toBeLessThan(0.2); // Less than 20% variance
  });

  it('should include standard attribute distributions', async () => {
    const segment = createMockSegment('Test Segment');
    const metrics = await computer.computeMetrics(segment);

    expect(metrics.attributeDistributions.platform).toBeDefined();
    expect(metrics.attributeDistributions.status).toBeDefined();
    expect(metrics.attributeDistributions.tier).toBeDefined();

    // Check platform distribution
    const platformDist = metrics.attributeDistributions.platform;
    expect(platformDist.ios).toBeGreaterThan(0);
    expect(platformDist.android).toBeGreaterThan(0);
    expect(platformDist.web).toBeGreaterThan(0);
  });

  it('should have velocity metrics proportional to size', async () => {
    const segment = createMockSegment('Test Segment');
    const metrics = await computer.computeMetrics(segment);

    // Velocity should be a small percentage of total size
    const velocityInRatio = metrics.velocityIn / metrics.size;
    const velocityOutRatio = metrics.velocityOut / metrics.size;

    expect(velocityInRatio).toBeLessThan(0.1); // Less than 10%
    expect(velocityOutRatio).toBeLessThan(0.1); // Less than 10%
  });
});
