import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SnapshotService } from '../../domain/snapshot/snapshot.service';
import { Queue } from 'bullmq';

export async function snapshotRoutes(
  fastify: FastifyInstance,
  snapshotService: SnapshotService,
  snapshotQueue?: Queue
): Promise<void> {
  // Get all snapshots
  fastify.get('/', async (request: FastifyRequest<{
    Querystring: { limit?: string }
  }>, reply: FastifyReply) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 100;
      const snapshots = await snapshotService.getAllSnapshots(limit);
      return reply.send(snapshots);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get snapshots for a segment
  fastify.get('/segment/:segmentId', async (request: FastifyRequest<{
    Params: { segmentId: string };
    Querystring: { limit?: string };
  }>, reply: FastifyReply) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 30;
      const snapshots = await snapshotService.getSegmentSnapshots(
        request.params.segmentId,
        limit
      );
      return reply.send(snapshots);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Trigger snapshot job
  fastify.post('/take', async (request: FastifyRequest<{
    Body: { segmentId?: string };
  }>, reply: FastifyReply) => {
    try {
      if (!snapshotQueue) {
        return reply.code(503).send({ error: 'Job queue not available' });
      }

      const { segmentId } = request.body || {};

      await snapshotQueue.add(
        'take-snapshot',
        { segmentId },
        { removeOnComplete: true }
      );

      return reply.send({
        message: 'Snapshot job queued',
        segmentId: segmentId || 'all',
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to queue snapshot job' });
    }
  });
}
