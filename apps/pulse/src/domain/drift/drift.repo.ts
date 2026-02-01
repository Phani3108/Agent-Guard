import { Pool } from 'pg';
import { DriftIncident, CreateDriftIncidentDTO, UpdateDriftIncidentDTO } from './drift.types';
import { logger } from '../../observability/logger';

export class DriftRepository {
  constructor(private db: Pool) {}

  async create(dto: CreateDriftIncidentDTO): Promise<DriftIncident> {
    const query = `
      INSERT INTO drift_incidents (
        segment_id, 
        type, 
        severity, 
        evidence, 
        explanation_text, 
        recommendations,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'open')
      RETURNING *
    `;

    const values = [
      dto.segmentId,
      dto.type,
      dto.severity,
      JSON.stringify(dto.evidence),
      dto.explanationText ?? null,
      JSON.stringify(dto.recommendations || []),
    ];

    try {
      const result = await this.db.query(query, values);
      return this.mapRow(result.rows[0]);
    } catch (error) {
      logger.error({ error, dto }, 'Failed to create drift incident');
      throw error;
    }
  }

  async findById(id: string): Promise<DriftIncident | null> {
    const query = 'SELECT * FROM drift_incidents WHERE id = $1';

    try {
      const result = await this.db.query(query, [id]);
      return result.rows[0] ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error({ error, id }, 'Failed to find drift incident');
      throw error;
    }
  }

  async findBySegmentId(segmentId: string, limit: number = 50): Promise<DriftIncident[]> {
    const query = `
      SELECT * FROM drift_incidents 
      WHERE segment_id = $1 
      ORDER BY ts DESC 
      LIMIT $2
    `;

    try {
      const result = await this.db.query(query, [segmentId, limit]);
      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error({ error, segmentId }, 'Failed to find drift incidents by segment');
      throw error;
    }
  }

  async findAll(options?: { status?: string; limit?: number }): Promise<DriftIncident[]> {
    let query = 'SELECT * FROM drift_incidents';
    const values: any[] = [];

    if (options?.status) {
      query += ' WHERE status = $1';
      values.push(options.status);
    }

    query += ' ORDER BY ts DESC';

    if (options?.limit) {
      query += ` LIMIT $${values.length + 1}`;
      values.push(options.limit);
    }

    try {
      const result = await this.db.query(query, values);
      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error({ error }, 'Failed to find drift incidents');
      throw error;
    }
  }

  async update(id: string, dto: UpdateDriftIncidentDTO): Promise<DriftIncident | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(dto.status);

      if (dto.status === 'resolved') {
        fields.push(`resolved_at = NOW()`);
        if (dto.resolvedBy) {
          fields.push(`resolved_by = $${paramIndex++}`);
          values.push(dto.resolvedBy);
        }
      }
    }

    if (dto.explanationText !== undefined) {
      fields.push(`explanation_text = $${paramIndex++}`);
      values.push(dto.explanationText);
    }

    if (dto.recommendations !== undefined) {
      fields.push(`recommendations = $${paramIndex++}`);
      values.push(JSON.stringify(dto.recommendations));
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);

    const query = `
      UPDATE drift_incidents
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error({ error, id, dto }, 'Failed to update drift incident');
      throw error;
    }
  }

  private mapRow(row: any): DriftIncident {
    return {
      id: row.id,
      segmentId: row.segment_id,
      timestamp: row.ts,
      type: row.type,
      severity: row.severity,
      evidence: typeof row.evidence === 'string' ? JSON.parse(row.evidence) : row.evidence,
      explanationText: row.explanation_text,
      recommendations:
        typeof row.recommendations === 'string'
          ? JSON.parse(row.recommendations)
          : row.recommendations,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
    };
  }
}
