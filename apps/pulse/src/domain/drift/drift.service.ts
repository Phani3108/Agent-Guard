import { DriftRepository } from './drift.repo';
import { DriftDetectorService } from './drift.detector';
import { DriftIncident, CreateDriftIncidentDTO, UpdateDriftIncidentDTO } from './drift.types';
import { Segment } from '../segment/segment.types';
import { Snapshot } from '../snapshot/snapshot.types';
import { logger } from '../../observability/logger';

export class DriftService {
  constructor(
    private driftRepo: DriftRepository,
    private driftDetector: DriftDetectorService
  ) {}

  /**
   * Analyze snapshots for drift and create incidents if detected
   */
  async analyzeDrift(
    segment: Segment,
    current: Snapshot,
    previous: Snapshot
  ): Promise<DriftIncident[]> {
    // Check if monitoring is enabled
    if (!this.driftDetector.isMonitoringEnabled(segment)) {
      logger.debug({ segmentId: segment.id }, 'Monitoring disabled for segment');
      return [];
    }

    // Detect drift
    const driftResults = await this.driftDetector.detectDrift(segment, current, previous);

    if (driftResults.length === 0) {
      logger.debug({ segmentId: segment.id }, 'No drift detected');
      return [];
    }

    // Create drift incidents
    const incidents: DriftIncident[] = [];

    for (const result of driftResults) {
      if (result.isDrift && result.evidence && result.severity) {
        const dto: CreateDriftIncidentDTO = {
          segmentId: segment.id,
          type: result.evidence.type,
          severity: result.severity,
          evidence: result.evidence,
        };

        try {
          const incident = await this.driftRepo.create(dto);
          incidents.push(incident);

          logger.info(
            {
              incidentId: incident.id,
              segmentId: segment.id,
              type: incident.type,
              severity: incident.severity,
            },
            'Drift incident created'
          );
        } catch (error) {
          logger.error({ error, dto }, 'Failed to create drift incident');
        }
      }
    }

    return incidents;
  }

  /**
   * Get incident by ID
   */
  async getIncident(id: string): Promise<DriftIncident | null> {
    return this.driftRepo.findById(id);
  }

  /**
   * Get incidents for a segment
   */
  async getSegmentIncidents(segmentId: string, limit: number = 50): Promise<DriftIncident[]> {
    return this.driftRepo.findBySegmentId(segmentId, limit);
  }

  /**
   * Get all incidents with optional filtering
   */
  async getAllIncidents(options?: {
    status?: string;
    limit?: number;
  }): Promise<DriftIncident[]> {
    return this.driftRepo.findAll(options);
  }

  /**
   * Update incident (e.g., add explanation, change status)
   */
  async updateIncident(
    id: string,
    dto: UpdateDriftIncidentDTO
  ): Promise<DriftIncident | null> {
    logger.info({ id, dto }, 'Updating drift incident');
    return this.driftRepo.update(id, dto);
  }

  /**
   * Resolve an incident
   */
  async resolveIncident(id: string, resolvedBy: string): Promise<DriftIncident | null> {
    return this.updateIncident(id, {
      status: 'resolved',
      resolvedBy,
    });
  }

  /**
   * Ignore an incident
   */
  async ignoreIncident(id: string): Promise<DriftIncident | null> {
    return this.updateIncident(id, {
      status: 'ignored',
    });
  }
}
