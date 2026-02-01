import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SegmentService } from '../../domain/segment/segment.service';
import {
  CreateSegmentSchema,
  UpdateSegmentSchema,
} from '../validators/segment.schema';

export async function segmentRoutes(
  fastify: FastifyInstance,
  segmentService: SegmentService
): Promise<void> {
  // Create segment
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dto = CreateSegmentSchema.parse(request.body);
      const segment = await segmentService.createSegment(dto);
      return reply.code(201).send(segment);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({ error: 'Invalid request' });
    }
  });

  // Get all segments
  fastify.get('/', async (request: FastifyRequest<{
    Querystring: { activeOnly?: string }
  }>, reply: FastifyReply) => {
    try {
      const activeOnly = request.query.activeOnly !== 'false';
      const segments = await segmentService.listSegments(activeOnly);
      return reply.send(segments);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get segment by ID
  fastify.get('/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const segment = await segmentService.getSegment(request.params.id);
      if (!segment) {
        return reply.code(404).send({ error: 'Segment not found' });
      }
      return reply.send(segment);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update segment
  fastify.put('/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const dto = UpdateSegmentSchema.parse(request.body);
      const segment = await segmentService.updateSegment(request.params.id, dto);
      if (!segment) {
        return reply.code(404).send({ error: 'Segment not found' });
      }
      return reply.send(segment);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({ error: 'Invalid request' });
    }
  });

  // Delete segment
  fastify.delete('/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const deleted = await segmentService.deleteSegment(request.params.id);
      if (!deleted) {
        return reply.code(404).send({ error: 'Segment not found' });
      }
      return reply.code(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
