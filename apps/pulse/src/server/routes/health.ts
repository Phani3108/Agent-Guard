import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Pool } from 'pg';

export async function healthRoutes(fastify: FastifyInstance, db: Pool): Promise<void> {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check database connection
      await db.query('SELECT 1');

      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'pulse',
        version: '1.0.0',
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });
}
