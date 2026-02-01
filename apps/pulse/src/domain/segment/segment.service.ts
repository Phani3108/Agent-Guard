import { SegmentRepository } from './segment.repo';
import { Segment, CreateSegmentDTO, UpdateSegmentDTO } from './segment.types';
import { logger } from '../../observability/logger';

export class SegmentService {
  constructor(private segmentRepo: SegmentRepository) {}

  async createSegment(dto: CreateSegmentDTO): Promise<Segment> {
    logger.info({ dto }, 'Creating new segment');
    return this.segmentRepo.create(dto);
  }

  async getSegment(id: string): Promise<Segment | null> {
    return this.segmentRepo.findById(id);
  }

  async listSegments(activeOnly: boolean = true): Promise<Segment[]> {
    return this.segmentRepo.findAll({ isActive: activeOnly ? true : undefined });
  }

  async updateSegment(id: string, dto: UpdateSegmentDTO): Promise<Segment | null> {
    logger.info({ id, dto }, 'Updating segment');
    return this.segmentRepo.update(id, dto);
  }

  async deleteSegment(id: string): Promise<boolean> {
    logger.info({ id }, 'Deleting segment');
    return this.segmentRepo.delete(id);
  }

  async enableMonitoring(id: string): Promise<Segment | null> {
    return this.updateSegment(id, {
      baseline: {
        monitoringEnabled: true,
      },
    });
  }

  async disableMonitoring(id: string): Promise<Segment | null> {
    return this.updateSegment(id, {
      baseline: {
        monitoringEnabled: false,
      },
    });
  }
}
