import 'dotenv/config';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { buildServer } from './server/server';
import { Scheduler } from './jobs/scheduler';
import { logger } from './observability/logger';

async function main() {
  try {
    // Initialize database
    const db = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
    });

    // Test database connection
    await db.query('SELECT 1');
    logger.info('Database connected');

    // Initialize Redis
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (error) => {
      logger.error({ error }, 'Redis error');
    });

    // Initialize job scheduler
    const scheduler = new Scheduler(db, redis);
    await scheduler.start();

    // Get snapshot queue for API
    const snapshotQueue = scheduler.getQueue('snapshots');

    // Build and start server
    const server = await buildServer(db, snapshotQueue);

    const host = process.env.HOST || '0.0.0.0';
    const port = parseInt(process.env.PORT || '3000');

    await server.listen({ host, port });

    logger.info({ host, port }, 'Server started successfully');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');

      await server.close();
      await scheduler.stop();
      await db.end();
      await redis.quit();

      logger.info('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start application');
    process.exit(1);
  }
}

main();
