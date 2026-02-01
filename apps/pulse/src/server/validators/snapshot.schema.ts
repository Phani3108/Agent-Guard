import { z } from 'zod';

export const AttributeDistributionSchema = z.record(z.string(), z.record(z.string(), z.number()));

export const SnapshotMetricsSchema = z.object({
  size: z.number().nonnegative(),
  attributeDistributions: AttributeDistributionSchema,
  conversionRate: z.number().min(0).max(1).optional(),
  velocityIn: z.number().nonnegative(),
  velocityOut: z.number().nonnegative(),
});

export const CreateSnapshotSchema = z.object({
  segmentId: z.string().uuid(),
  metrics: SnapshotMetricsSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});
