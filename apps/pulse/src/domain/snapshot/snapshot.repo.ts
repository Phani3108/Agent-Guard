import { Pool } from 'pg';
import { Snapshot, CreateSnapshotDTO } from './snapshot.types';
import { logger } from '../../observability/logger';

export class SnapshotRepository {
  constructor(private db: Pool) {}

  async create(dto: CreateSnapshotDTO): Promise<Snapshot> {
    const query = `
      INSERT INTO snapshots (
        segment_id, 
        size, 
        attr_distributions, 
        conv_rate, 
        velocity_in, 
        velocity_out,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      dto.segmentId,
      dto.metrics.size,
      JSON.stringify(dto.metrics.attributeDistributions),
      dto.metrics.conversionRate ?? null,
      dto.metrics.velocityIn,
      dto.metrics.velocityOut,
      JSON.stringify(dto.metadata || {}),
    ];

    try {
      const result = await this.db.query(query, values);
      return this.mapRow(result.rows[0]);
    } catch (error) {
      logger.error({ error, dto }, 'Failed to create snapshot');
      throw error;
    }
  }

  async findBySegmentId(segmentId: string, limit: number = 30): Promise<Snapshot[]> {
    const query = `
      SELECT * FROM snapshots 
      WHERE segment_id = $1 
      ORDER BY ts DESC 
      LIMIT $2
    `;

    try {
      const result = await this.db.query(query, [segmentId, limit]);
      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error({ error, segmentId }, 'Failed to find snapshots by segment');
      throw error;
    }
  }

  async findLatestBySegmentId(segmentId: string): Promise<Snapshot | null> {
    const query = `
      SELECT * FROM snapshots 
      WHERE segment_id = $1 
      ORDER BY ts DESC 
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [segmentId]);
      return result.rows[0] ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error({ error, segmentId }, 'Failed to find latest snapshot');
      throw error;
    }
  }

  async findPreviousSnapshot(segmentId: string, beforeTimestamp: Date): Promise<Snapshot | null> {
    const query = `
      SELECT * FROM snapshots 
      WHERE segment_id = $1 AND ts < $2
      ORDER BY ts DESC 
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [segmentId, beforeTimestamp]);
      return result.rows[0] ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error({ error, segmentId }, 'Failed to find previous snapshot');
      throw error;
    }
  }

  async findAll(limit: number = 100): Promise<Snapshot[]> {
    const query = `
      SELECT * FROM snapshots 
      ORDER BY ts DESC 
      LIMIT $1
    `;

    try {
      const result = await this.db.query(query, [limit]);
      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error({ error }, 'Failed to find snapshots');
      throw error;
    }
  }

  private mapRow(row: any): Snapshot {
    return {
      id: row.id,
      segmentId: row.segment_id,
      timestamp: row.ts,
      size: row.size,
      attributeDistributions:
        typeof row.attr_distributions === 'string'
          ? JSON.parse(row.attr_distributions)
          : row.attr_distributions,
      conversionRate: row.conv_rate,
      velocityIn: row.velocity_in,
      velocityOut: row.velocity_out,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    };
  }
}
