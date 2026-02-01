import { SnapshotRepository } from './snapshot.repo';
import { SnapshotComputer } from './snapshot.compute';
import { Segment } from '../segment/segment.types';
import { Snapshot, CreateSnapshotDTO } from './snapshot.types';
import { logger } from '../../observability/logger';

export class SnapshotService {
  constructor(
    private snapshotRepo: SnapshotRepository,
    private snapshotComputer: SnapshotComputer
  ) {}

  async takeSnapshot(segment: Segment): Promise<Snapshot> {
    logger.info({ segmentId: segment.id, segmentName: segment.name }, 'Taking snapshot');

    try {
      // Compute metrics for the segment
      const metrics = await this.snapshotComputer.computeMetrics(segment);

      // Create snapshot DTO
      const dto: CreateSnapshotDTO = {
        segmentId: segment.id,
        metrics,
        metadata: {
          segmentName: segment.name,
          owner: segment.owner,
        },
      };

      // Store snapshot
      const snapshot = await this.snapshotRepo.create(dto);

      logger.info(
        { segmentId: segment.id, snapshotId: snapshot.id, size: snapshot.size },
        'Snapshot created successfully'
      );

      return snapshot;
    } catch (error) {
      logger.error({ error, segmentId: segment.id }, 'Failed to take snapshot');
      throw error;
    }
  }

  async getSegmentSnapshots(segmentId: string, limit: number = 30): Promise<Snapshot[]> {
    return this.snapshotRepo.findBySegmentId(segmentId, limit);
  }

  async getLatestSnapshot(segmentId: string): Promise<Snapshot | null> {
    return this.snapshotRepo.findLatestBySegmentId(segmentId);
  }

  async getPreviousSnapshot(segmentId: string, beforeTimestamp: Date): Promise<Snapshot | null> {
    return this.snapshotRepo.findPreviousSnapshot(segmentId, beforeTimestamp);
  }

  async getAllSnapshots(limit: number = 100): Promise<Snapshot[]> {
    return this.snapshotRepo.findAll(limit);
  }

  /**
   * Calculate snapshot comparison metrics
   */
  async compareSnapshots(current: Snapshot, previous: Snapshot): Promise<{
    sizeChange: number;
    sizeChangePercent: number;
    conversionRateChange?: number;
    velocityInChange: number;
    velocityOutChange: number;
  }> {
    const sizeChange = current.size - previous.size;
    const sizeChangePercent = previous.size > 0 ? sizeChange / previous.size : 0;

    const conversionRateChange =
      current.conversionRate !== undefined && previous.conversionRate !== undefined
        ? current.conversionRate - previous.conversionRate
        : undefined;

    const velocityInChange = current.velocityIn - previous.velocityIn;
    const velocityOutChange = current.velocityOut - previous.velocityOut;

    return {
      sizeChange,
      sizeChangePercent,
      conversionRateChange,
      velocityInChange,
      velocityOutChange,
    };
  }
}
