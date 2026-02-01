import { z } from 'zod';

export const DriftEvidenceSchema = z.object({
  type: z.enum(['size_jump', 'distribution_shift', 'conversion_anomaly', 'inactivity_creep']),
  currentValue: z.number(),
  previousValue: z.number(),
  changePercent: z.number(),
  threshold: z.number(),
  affectedAttributes: z.array(z.string()).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const DriftRecommendationSchema = z.object({
  action: z.string(),
  reason: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
});

export const CreateDriftIncidentSchema = z.object({
  segmentId: z.string().uuid(),
  type: z.enum(['size_jump', 'distribution_shift', 'conversion_anomaly', 'inactivity_creep']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  evidence: DriftEvidenceSchema,
  explanationText: z.string().optional(),
  recommendations: z.array(DriftRecommendationSchema).optional(),
});

export const UpdateDriftIncidentSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved', 'ignored']).optional(),
  explanationText: z.string().optional(),
  recommendations: z.array(DriftRecommendationSchema).optional(),
  resolvedBy: z.string().optional(),
});
