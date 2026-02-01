import { z } from 'zod';

export const SegmentRuleSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'in', 'not_in', 'contains']),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.array(z.number())]),
});

export const SegmentDefinitionSchema = z.object({
  rules: z.array(SegmentRuleSchema).min(1),
  logicalOperator: z.enum(['AND', 'OR']).optional().default('AND'),
});

export const SegmentBaselineSchema = z.object({
  expectedSize: z
    .object({
      min: z.number().nonnegative(),
      max: z.number().nonnegative(),
    })
    .optional(),
  expectedConversionRate: z
    .object({
      min: z.number().min(0).max(1),
      max: z.number().min(0).max(1),
    })
    .optional(),
  criticalAttributes: z.array(z.string()).optional(),
  monitoringEnabled: z.boolean().default(true),
  alertThresholds: z
    .object({
      sizeChangePercent: z.number().min(0).max(1).optional(),
      distributionShift: z.number().min(0).max(1).optional(),
      conversionAnomaly: z.number().min(0).max(1).optional(),
      inactivityCreep: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export const CreateSegmentSchema = z.object({
  name: z.string().min(1).max(255),
  definition: SegmentDefinitionSchema,
  owner: z.string().min(1).max(255),
  baseline: SegmentBaselineSchema.optional(),
});

export const UpdateSegmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  definition: SegmentDefinitionSchema.optional(),
  owner: z.string().min(1).max(255).optional(),
  baseline: SegmentBaselineSchema.optional(),
  isActive: z.boolean().optional(),
});
