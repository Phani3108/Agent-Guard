import { Worker, Job, Queue } from 'bullmq';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { DriftRepository } from '../domain/drift/drift.repo';
import { DriftService } from '../domain/drift/drift.service';
import { DriftDetectorService } from '../domain/drift/drift.detector';
import { SegmentRepository } from '../domain/segment/segment.repo';
import { SegmentService } from '../domain/segment/segment.service';
import { AlertService } from '../domain/alerts/alert.service';
import { logger } from '../observability/logger';

export interface SendAlertsJobData {
  incidentId: string;
}

export function createAlertsWorker(db: Pool, redis: Redis): Worker {
  const driftRepo = new DriftRepository(db);
  const driftDetector = new DriftDetectorService();
  const driftService = new DriftService(driftRepo, driftDetector);
  const segmentRepo = new SegmentRepository(db);
  const segmentService = new SegmentService(segmentRepo);
  const alertService = new AlertService();

  const worker = new Worker(
    'alerts',
    async (job: Job<SendAlertsJobData>) => {
      logger.info({ jobId: job.id, data: job.data }, 'Processing alert job');

      try {
        const { incidentId } = job.data;

        // Get incident
        const incident = await driftService.getIncident(incidentId);
        if (!incident) {
          throw new Error(`Incident ${incidentId} not found`);
        }

        // Get segment
        const segment = await segmentService.getSegment(incident.segmentId);
        if (!segment) {
          throw new Error(`Segment ${incident.segmentId} not found`);
        }

        // Send alerts
        await alertService.sendAlerts(incident, segment);

        logger.info({ incidentId, segmentId: segment.id }, 'Alerts sent successfully');

        return { incidentId, sent: true };
      } catch (error) {
        logger.error({ error, jobId: job.id }, 'Alert job failed');
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 10,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Alert job completed successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err }, 'Alert job failed');
  });

  return worker;
}

export function createAlertsQueue(redis: Redis): Queue {
  return new Queue('alerts', {
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
