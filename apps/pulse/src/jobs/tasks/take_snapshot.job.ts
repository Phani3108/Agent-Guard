import { Worker, Job, Queue } from 'bullmq';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { SegmentRepository } from '../domain/segment/segment.repo';
import { SegmentService } from '../domain/segment/segment.service';
import { SnapshotRepository } from '../domain/snapshot/snapshot.repo';
import { SnapshotService } from '../domain/snapshot/snapshot.service';
import { SnapshotComputer } from '../domain/snapshot/snapshot.compute';
import { logger } from '../observability/logger';

export interface TakeSnapshotJobData {
  segmentId?: string; // If not provided, snapshot all segments
}

export function createSnapshotWorker(db: Pool, redis: Redis): Worker {
  const segmentRepo = new SegmentRepository(db);
  const segmentService = new SegmentService(segmentRepo);
  const snapshotRepo = new SnapshotRepository(db);
  const snapshotComputer = new SnapshotComputer();
  const snapshotService = new SnapshotService(snapshotRepo, snapshotComputer);

  const worker = new Worker(
    'snapshots',
    async (job: Job<TakeSnapshotJobData>) => {
      logger.info({ jobId: job.id, data: job.data }, 'Processing snapshot job');

      try {
        let segments;

        if (job.data.segmentId) {
          // Snapshot specific segment
          const segment = await segmentService.getSegment(job.data.segmentId);
          if (!segment) {
            throw new Error(`Segment ${job.data.segmentId} not found`);
          }
          segments = [segment];
        } else {
          // Snapshot all active segments
          segments = await segmentService.listSegments(true);
        }

        logger.info({ segmentCount: segments.length }, 'Taking snapshots');

        const results = [];
        for (const segment of segments) {
          try {
            const snapshot = await snapshotService.takeSnapshot(segment);
            results.push({ segmentId: segment.id, snapshotId: snapshot.id, success: true });
          } catch (error) {
            logger.error({ error, segmentId: segment.id }, 'Failed to take snapshot');
            results.push({ segmentId: segment.id, success: false, error: String(error) });
          }
        }

        logger.info(
          {
            total: results.length,
            successful: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
          },
          'Snapshot job completed'
        );

        return results;
      } catch (error) {
        logger.error({ error, jobId: job.id }, 'Snapshot job failed');
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Snapshot job completed successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err }, 'Snapshot job failed');
  });

  return worker;
}

export function createSnapshotQueue(redis: Redis): Queue {
  return new Queue('snapshots', {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  });
}
