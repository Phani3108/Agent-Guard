import { describe, it, expect } from 'vitest';
import { Snapshot } from '../../src/domain/snapshot/snapshot.types';
import { Segment } from '../../src/domain/segment/segment.types';
import { SizeJumpDetector } from '../../src/domain/drift/detectors/size_jump';

describe('SizeJumpDetector', () => {
  const detector = new SizeJumpDetector();

  const createMockSegment = (): Segment => ({
    id: 'test-segment',
    name: 'Test Segment',
    definition: {
      rules: [{ field: 'test', operator: '=', value: 'test' }],
    },
    owner: 'test-owner',
    baseline: {
      monitoringEnabled: true,
      alertThresholds: {
        sizeChangePercent: 0.15,
      },
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const createMockSnapshot = (size: number): Snapshot => ({
    id: 'test-snapshot',
    segmentId: 'test-segment',
    timestamp: new Date(),
    size,
    attributeDistributions: {},
    velocityIn: 100,
    velocityOut: 50,
  });

  it('should detect drift when size change exceeds threshold', async () => {
    const segment = createMockSegment();
    const previous = createMockSnapshot(10000);
    const current = createMockSnapshot(12000); // 20% increase

    const result = await detector.detect(segment, current, previous);

    expect(result.isDrift).toBe(true);
    expect(result.evidence).toBeDefined();
    expect(result.evidence?.type).toBe('size_jump');
    expect(result.evidence?.changePercent).toBe(0.2);
    expect(result.severity).toBeDefined();
  });

  it('should not detect drift when size change is below threshold', async () => {
    const segment = createMockSegment();
    const previous = createMockSnapshot(10000);
    const current = createMockSnapshot(10500); // 5% increase

    const result = await detector.detect(segment, current, previous);

    expect(result.isDrift).toBe(false);
  });

  it('should detect drift on size decrease', async () => {
    const segment = createMockSegment();
    const previous = createMockSnapshot(10000);
    const current = createMockSnapshot(8000); // 20% decrease

    const result = await detector.detect(segment, current, previous);

    expect(result.isDrift).toBe(true);
    expect(result.evidence?.currentValue).toBe(8000);
    expect(result.evidence?.previousValue).toBe(10000);
  });

  it('should use custom threshold from segment baseline', async () => {
    const segment = createMockSegment();
    segment.baseline!.alertThresholds!.sizeChangePercent = 0.25; // 25% threshold

    const previous = createMockSnapshot(10000);
    const current = createMockSnapshot(12000); // 20% increase

    const result = await detector.detect(segment, current, previous);

    // Should not drift because 20% < 25%
    expect(result.isDrift).toBe(false);
  });

  it('should calculate correct severity levels', async () => {
    const segment = createMockSegment();

    // Test critical severity (3x threshold)
    const previous1 = createMockSnapshot(10000);
    const current1 = createMockSnapshot(15500); // 55% increase (3.67x threshold of 15%)

    const result1 = await detector.detect(segment, current1, previous1);
    expect(result1.severity).toBe('critical');

    // Test high severity (2x threshold)
    const previous2 = createMockSnapshot(10000);
    const current2 = createMockSnapshot(13500); // 35% increase (2.33x threshold)

    const result2 = await detector.detect(segment, current2, previous2);
    expect(result2.severity).toBe('high');

    // Test medium severity (1.5x threshold)
    const previous3 = createMockSnapshot(10000);
    const current3 = createMockSnapshot(12300); // 23% increase (1.53x threshold)

    const result3 = await detector.detect(segment, current3, previous3);
    expect(result3.severity).toBe('medium');
  });
});
