import { Worker, Job, Queue } from 'bullmq';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { SegmentRepository } from '../domain/segment/segment.repo';
import { SegmentService } from '../domain/segment/segment.service';
import { SnapshotRepository } from '../domain/snapshot/snapshot.repo';
import { SnapshotService } from '../domain/snapshot/snapshot.service';
import { SnapshotComputer } from '../domain/snapshot/snapshot.compute';
import { DriftRepository } from '../domain/drift/drift.repo';
import { DriftService } from '../domain/drift/drift.service';
import { DriftDetectorService } from '../domain/drift/drift.detector';
import { ExplainAgent } from '../domain/explain/explain.agent';
import { logger } from '../observability/logger';

export interface DetectDriftJobData {
  segmentId?: string;
}

export function createDriftDetectionWorker(db: Pool, redis: Redis): Worker {
  const segmentRepo = new SegmentRepository(db);
  const segmentService = new SegmentService(segmentRepo);
  const snapshotRepo = new SnapshotRepository(db);
  const snapshotComputer = new SnapshotComputer();
  const snapshotService = new SnapshotService(snapshotRepo, snapshotComputer);
  const driftRepo = new DriftRepository(db);
  const driftDetector = new DriftDetectorService();
  const driftService = new DriftService(driftRepo, driftDetector);
  const explainAgent = new ExplainAgent();

  const worker = new Worker(
    'drift-detection',
    async (job: Job<DetectDriftJobData>) => {
      logger.info({ jobId: job.id, data: job.data }, 'Processing drift detection job');

      try {
        let segments;

        if (job.data.segmentId) {
          const segment = await segmentService.getSegment(job.data.segmentId);
          if (!segment) {
            throw new Error(`Segment ${job.data.segmentId} not found`);
          }
          segments = [segment];
        } else {
          segments = await segmentService.listSegments(true);
        }

        logger.info({ segmentCount: segments.length }, 'Checking for drift');

        const results = [];

        for (const segment of segments) {
          try {
            // Get latest two snapshots
            const snapshots = await snapshotService.getSegmentSnapshots(segment.id, 2);

            if (snapshots.length < 2) {
              logger.debug({ segmentId: segment.id }, 'Not enough snapshots for drift detection');
              continue;
            }

            const [current, previous] = snapshots;

            // Analyze drift
            const incidents = await driftService.analyzeDrift(segment, current, previous);

            if (incidents.length > 0) {
              // Generate explanations for each incident
              for (const incident of incidents) {
                try {
                  const { explanation, recommendations } = await explainAgent.explainDrift(
                    incident,
                    segment
                  );

                  // Update incident with explanation
                  await driftService.updateIncident(incident.id, {
                    explanationText: explanation,
                    recommendations,
                  });

                  logger.info(
                    { incidentId: incident.id, segmentId: segment.id },
                    'Drift explanation added'
                  );
                } catch (error) {
                  logger.error(
                    { error, incidentId: incident.id },
                    'Failed to generate explanation'
                  );
                }
              }

              results.push({
                segmentId: segment.id,
                driftDetected: true,
                incidentCount: incidents.length,
              });
            } else {
              results.push({
                segmentId: segment.id,
                driftDetected: false,
              });
            }
          } catch (error) {
            logger.error({ error, segmentId: segment.id }, 'Failed to detect drift');
            results.push({
              segmentId: segment.id,
              error: String(error),
            });
          }
        }

        logger.info(
          {
            total: results.length,
            withDrift: results.filter((r) => r.driftDetected).length,
          },
          'Drift detection job completed'
        );

        return results;
      } catch (error) {
        logger.error({ error, jobId: job.id }, 'Drift detection job failed');
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 3,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Drift detection job completed successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err }, 'Drift detection job failed');
  });

  return worker;
}

export function createDriftDetectionQueue(redis: Redis): Queue {
  return new Queue('drift-detection', {
    connection: redis,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
    },
  });
}
