import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DriftService } from '../../domain/drift/drift.service';
import { UpdateDriftIncidentSchema } from '../validators/drift.schema';

export async function driftRoutes(
  fastify: FastifyInstance,
  driftService: DriftService
): Promise<void> {
  // Get all drift incidents
  fastify.get('/incidents', async (request: FastifyRequest<{
    Querystring: { status?: string; limit?: string }
  }>, reply: FastifyReply) => {
    try {
      const options = {
        status: request.query.status,
        limit: request.query.limit ? parseInt(request.query.limit) : undefined,
      };
      const incidents = await driftService.getAllIncidents(options);
      return reply.send(incidents);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get incident by ID
  fastify.get('/incidents/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const incident = await driftService.getIncident(request.params.id);
      if (!incident) {
        return reply.code(404).send({ error: 'Incident not found' });
      }
      return reply.send(incident);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get incidents for a segment
  fastify.get('/segment/:segmentId/incidents', async (request: FastifyRequest<{
    Params: { segmentId: string };
    Querystring: { limit?: string };
  }>, reply: FastifyReply) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 50;
      const incidents = await driftService.getSegmentIncidents(
        request.params.segmentId,
        limit
      );
      return reply.send(incidents);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update incident
  fastify.patch('/incidents/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const dto = UpdateDriftIncidentSchema.parse(request.body);
      const incident = await driftService.updateIncident(request.params.id, dto);
      if (!incident) {
        return reply.code(404).send({ error: 'Incident not found' });
      }
      return reply.send(incident);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({ error: 'Invalid request' });
    }
  });

  // Resolve incident
  fastify.post('/incidents/:id/resolve', async (request: FastifyRequest<{
    Params: { id: string };
    Body: { resolvedBy: string };
  }>, reply: FastifyReply) => {
    try {
      const { resolvedBy } = request.body;
      const incident = await driftService.resolveIncident(request.params.id, resolvedBy);
      if (!incident) {
        return reply.code(404).send({ error: 'Incident not found' });
      }
      return reply.send(incident);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Ignore incident
  fastify.post('/incidents/:id/ignore', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const incident = await driftService.ignoreIncident(request.params.id);
      if (!incident) {
        return reply.code(404).send({ error: 'Incident not found' });
      }
      return reply.send(incident);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
