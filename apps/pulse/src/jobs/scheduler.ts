import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { Pool } from 'pg';
import { logger } from '../observability/logger';
import { createSnapshotWorker, createSnapshotQueue } from './tasks/take_snapshot.job';
import { createDriftDetectionWorker, createDriftDetectionQueue } from './tasks/detect_drift.job';
import { createAlertsWorker, createAlertsQueue } from './tasks/send_alerts.job';

export class Scheduler {
  private redis: Redis;
  private db: Pool;
  private workers: Worker[] = [];
  private queues: Map<string, Queue> = new Map();

  constructor(db: Pool, redis: Redis) {
    this.db = db;
    this.redis = redis;
  }

  async start(): Promise<void> {
    logger.info('Starting job scheduler');

    // Create queues
    const snapshotQueue = createSnapshotQueue(this.redis);
    const driftQueue = createDriftDetectionQueue(this.redis);
    const alertsQueue = createAlertsQueue(this.redis);

    this.queues.set('snapshots', snapshotQueue);
    this.queues.set('drift-detection', driftQueue);
    this.queues.set('alerts', alertsQueue);

    // Create workers
    const snapshotWorker = createSnapshotWorker(this.db, this.redis);
    const driftWorker = createDriftDetectionWorker(this.db, this.redis);
    const alertsWorker = createAlertsWorker(this.db, this.redis);

    this.workers.push(snapshotWorker, driftWorker, alertsWorker);

    // Schedule recurring jobs
    await this.scheduleRecurringJobs(snapshotQueue, driftQueue);

    logger.info('Job scheduler started successfully');
  }

  private async scheduleRecurringJobs(
    snapshotQueue: Queue,
    driftQueue: Queue
  ): Promise<void> {
    // Schedule daily snapshots (default: 2 AM)
    const snapshotCron = process.env.SNAPSHOT_CRON || '0 2 * * *';
    await snapshotQueue.add(
      'scheduled-snapshot',
      {},
      {
        repeat: {
          pattern: snapshotCron,
        },
        removeOnComplete: true,
      }
    );
    logger.info({ cron: snapshotCron }, 'Scheduled snapshot job');

    // Schedule drift detection (default: 3 AM, after snapshots)
    const driftCron = process.env.DRIFT_CHECK_CRON || '0 3 * * *';
    await driftQueue.add(
      'scheduled-drift-check',
      {},
      {
        repeat: {
          pattern: driftCron,
        },
        removeOnComplete: true,
      }
    );
    logger.info({ cron: driftCron }, 'Scheduled drift detection job');
  }

  async stop(): Promise<void> {
    logger.info('Stopping job scheduler');

    // Close workers
    await Promise.all(this.workers.map((worker) => worker.close()));

    // Close queues
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.close())
    );

    logger.info('Job scheduler stopped');
  }

  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }
}
