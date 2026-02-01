export interface AttributeDistribution {
  [attributeName: string]: {
    [value: string]: number; // value -> count
  };
}

export interface Snapshot {
  id: string;
  segmentId: string;
  timestamp: Date;
  size: number;
  attributeDistributions: AttributeDistribution;
  conversionRate?: number;
  velocityIn: number; // users entering segment
  velocityOut: number; // users leaving segment
  metadata?: Record<string, unknown>;
}

export interface SnapshotMetrics {
  size: number;
  attributeDistributions: AttributeDistribution;
  conversionRate?: number;
  velocityIn: number;
  velocityOut: number;
}

export interface CreateSnapshotDTO {
  segmentId: string;
  metrics: SnapshotMetrics;
  metadata?: Record<string, unknown>;
}
