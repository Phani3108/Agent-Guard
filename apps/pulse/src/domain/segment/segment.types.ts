export interface SegmentRule {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in' | 'contains';
  value: string | number | boolean | string[] | number[];
}

export interface SegmentDefinition {
  rules: SegmentRule[];
  logicalOperator?: 'AND' | 'OR';
}

export interface SegmentBaseline {
  expectedSize?: {
    min: number;
    max: number;
  };
  expectedConversionRate?: {
    min: number;
    max: number;
  };
  criticalAttributes?: string[];
  monitoringEnabled: boolean;
  alertThresholds?: {
    sizeChangePercent?: number;
    distributionShift?: number;
    conversionAnomaly?: number;
    inactivityCreep?: number;
  };
}

export interface Segment {
  id: string;
  name: string;
  definition: SegmentDefinition;
  owner: string;
  baseline?: SegmentBaseline;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface CreateSegmentDTO {
  name: string;
  definition: SegmentDefinition;
  owner: string;
  baseline?: SegmentBaseline;
}

export interface UpdateSegmentDTO {
  name?: string;
  definition?: SegmentDefinition;
  owner?: string;
  baseline?: SegmentBaseline;
  isActive?: boolean;
}
