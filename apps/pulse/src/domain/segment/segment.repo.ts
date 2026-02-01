import { Pool, PoolClient } from 'pg';
import { Segment, CreateSegmentDTO, UpdateSegmentDTO } from './segment.types';
import { logger } from '../../observability/logger';

export class SegmentRepository {
  constructor(private db: Pool) {}

  async create(dto: CreateSegmentDTO): Promise<Segment> {
    const query = `
      INSERT INTO segments (name, definition, owner, baseline, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `;

    const values = [dto.name, JSON.stringify(dto.definition), dto.owner, JSON.stringify(dto.baseline || {})];

    try {
      const result = await this.db.query(query, values);
      return this.mapRow(result.rows[0]);
    } catch (error) {
      logger.error({ error, dto }, 'Failed to create segment');
      throw error;
    }
  }

  async findById(id: string): Promise<Segment | null> {
    const query = 'SELECT * FROM segments WHERE id = $1';

    try {
      const result = await this.db.query(query, [id]);
      return result.rows[0] ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error({ error, id }, 'Failed to find segment by id');
      throw error;
    }
  }

  async findAll(options?: { isActive?: boolean }): Promise<Segment[]> {
    let query = 'SELECT * FROM segments';
    const values: any[] = [];

    if (options?.isActive !== undefined) {
      query += ' WHERE is_active = $1';
      values.push(options.isActive);
    }

    query += ' ORDER BY created_at DESC';

    try {
      const result = await this.db.query(query, values);
      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error({ error }, 'Failed to find segments');
      throw error;
    }
  }

  async update(id: string, dto: UpdateSegmentDTO): Promise<Segment | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }

    if (dto.definition !== undefined) {
      fields.push(`definition = $${paramIndex++}`);
      values.push(JSON.stringify(dto.definition));
    }

    if (dto.owner !== undefined) {
      fields.push(`owner = $${paramIndex++}`);
      values.push(dto.owner);
    }

    if (dto.baseline !== undefined) {
      fields.push(`baseline = $${paramIndex++}`);
      values.push(JSON.stringify(dto.baseline));
    }

    if (dto.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(dto.isActive);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);

    const query = `
      UPDATE segments
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error({ error, id, dto }, 'Failed to update segment');
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM segments WHERE id = $1';

    try {
      const result = await this.db.query(query, [id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logger.error({ error, id }, 'Failed to delete segment');
      throw error;
    }
  }

  private mapRow(row: any): Segment {
    return {
      id: row.id,
      name: row.name,
      definition: typeof row.definition === 'string' ? JSON.parse(row.definition) : row.definition,
      owner: row.owner,
      baseline: typeof row.baseline === 'string' ? JSON.parse(row.baseline) : row.baseline,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active,
    };
  }
}
