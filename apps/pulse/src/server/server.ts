import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { Pool } from 'pg';
import { Queue } from 'bullmq';
import { logger } from '../observability/logger';

// Services
import { SegmentRepository } from '../domain/segment/segment.repo';
import { SegmentService } from '../domain/segment/segment.service';
import { SnapshotRepository } from '../domain/snapshot/snapshot.repo';
import { SnapshotService } from '../domain/snapshot/snapshot.service';
import { SnapshotComputer } from '../domain/snapshot/snapshot.compute';
import { DriftRepository } from '../domain/drift/drift.repo';
import { DriftService } from '../domain/drift/drift.service';
import { DriftDetectorService } from '../domain/drift/drift.detector';

// Routes
import { healthRoutes } from './routes/health';
import { segmentRoutes } from './routes/segments';
import { snapshotRoutes } from './routes/snapshots';
import { driftRoutes } from './routes/drift';

export async function buildServer(
  db: Pool,
  snapshotQueue?: Queue
): Promise<ReturnType<typeof Fastify>> {
  const fastify = Fastify({
    logger: logger,
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true,
  });

  await fastify.register(helmet);

  // Initialize repositories
  const segmentRepo = new SegmentRepository(db);
  const snapshotRepo = new SnapshotRepository(db);
  const driftRepo = new DriftRepository(db);

  // Initialize services
  const segmentService = new SegmentService(segmentRepo);
  const snapshotComputer = new SnapshotComputer();
  const snapshotService = new SnapshotService(snapshotRepo, snapshotComputer);
  const driftDetector = new DriftDetectorService();
  const driftService = new DriftService(driftRepo, driftDetector);

  // Register routes
  fastify.register(healthRoutes, { prefix: '/health', db });

  fastify.register(
    async (instance) => {
      await segmentRoutes(instance, segmentService);
    },
    { prefix: '/api/segments' }
  );

  fastify.register(
    async (instance) => {
      await snapshotRoutes(instance, snapshotService, snapshotQueue);
    },
    { prefix: '/api/snapshots' }
  );

  fastify.register(
    async (instance) => {
      await driftRoutes(instance, driftService);
    },
    { prefix: '/api/drift' }
  );

  // Webhook endpoint for n8n integration
  fastify.post('/webhook/drift', async (request, reply) => {
    try {
      // n8n can forward drift incidents here for custom workflows
      logger.info({ body: request.body }, 'Received drift webhook');
      return reply.send({ received: true });
    } catch (error) {
      logger.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  return fastify;
}
